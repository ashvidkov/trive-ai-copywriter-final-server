"""
Сервис для продвинутой очистки спарсенного контента
"""

import re
from typing import List, Set
from collections import Counter


class ContentCleaner:
    def __init__(self, settings=None):
        # Настройки очистки
        self.settings = settings or {}
        
        # Стоп-слова для фильтрации навигационных блоков
        self.navigation_keywords = {
            'главная', 'меню', 'навигация', 'войти', 'регистрация', 'поиск',
            'карта сайта', 'обратная связь', 'контакты', 'о нас', 'реклама',
            'подписка', 'архив', 'рубрики', 'теги', 'метки', 'читать далее',
            'комментарии', 'поделиться', 'вконтакте', 'facebook', 'twitter',
            'одноклассники', 'telegram', 'whatsapp', 'viber', 'instagram'
        }
        
        # Технические фразы для удаления
        self.technical_phrases = {
            'все права защищены', 'копирование материалов', 'при использовании материалов',
            'ссылка на сайт обязательна', 'администрация сайта', 'редакция не несет ответственности',
            'мнение авторов', 'javascript', 'cookie', 'браузер', 'adobe flash',
            'internet explorer', 'chrome', 'firefox', 'safari', 'версия для печати'
        }
        
        # Минимальная длина параграфа (в символах)
        self.min_paragraph_length = self.settings.get('min_paragraph_length', 50)
        
        # Максимальная длина параграфа (в символах)
        self.max_paragraph_length = self.settings.get('max_paragraph_length', 2000)
        
    def _remove_technical_blocks(self, text: str) -> str:
        """Удаление технических блоков и навигации"""
        lines = text.split('\n')
        clean_lines = []
        
        for line in lines:
            line_lower = line.lower().strip()
            
            # Пропускаем пустые строки
            if not line_lower:
                continue
                
            # Проверяем на навигационные элементы
            if any(keyword in line_lower for keyword in self.navigation_keywords):
                continue
                
            # Проверяем на технические фразы
            if any(phrase in line_lower for phrase in self.technical_phrases):
                continue
                
            # Пропускаем строки только с цифрами/датами/знаками
            if re.match(r'^[\d\s\.\-\:\,\/]+$', line_lower):
                continue
                
            # Пропускаем короткие строки (менее 15 символов)
            if len(line_lower) < 15:
                continue
                
            clean_lines.append(line.strip())
        
        return '\n'.join(clean_lines)
    
    def _remove_duplicates(self, text: str) -> str:
        """Удаление дублирующихся предложений и абзацев"""
        paragraphs = text.split('\n\n')
        unique_paragraphs = []
        seen_paragraphs = set()
        
        for paragraph in paragraphs:
            # Нормализуем параграф для сравнения
            normalized = re.sub(r'\s+', ' ', paragraph.lower().strip())
            
            # Пропускаем очень короткие или очень длинные параграфы
            if len(normalized) < self.min_paragraph_length:
                continue
            if len(paragraph) > self.max_paragraph_length:
                # Разбиваем длинный параграф на предложения
                sentences = re.split(r'[.!?]+', paragraph)
                for sentence in sentences:
                    if self.min_paragraph_length <= len(sentence.strip()) <= 500:
                        sentence_norm = re.sub(r'\s+', ' ', sentence.lower().strip())
                        if sentence_norm not in seen_paragraphs:
                            unique_paragraphs.append(sentence.strip() + '.')
                            seen_paragraphs.add(sentence_norm)
                continue
            
            # Проверяем уникальность
            if normalized not in seen_paragraphs:
                unique_paragraphs.append(paragraph.strip())
                seen_paragraphs.add(normalized)
        
        return '\n\n'.join(unique_paragraphs)
    
    def _filter_relevant_content(self, text: str) -> str:
        """Фильтрация наиболее релевантного контента"""
        paragraphs = text.split('\n\n')
        
        # Анализируем тематические слова в каждом параграфе
        scored_paragraphs = []
        
        for paragraph in paragraphs:
            if len(paragraph.strip()) < self.min_paragraph_length:
                continue
                
            # Подсчитываем "информативность" параграфа
            score = 0
            
            # Бонус за наличие существительных и прилагательных
            words = re.findall(r'\b[а-яё]+\b', paragraph.lower())
            if len(words) > 10:  # Достаточно слов
                score += len(words) * 0.1
                
            # Бонус за наличие числовых данных
            numbers = re.findall(r'\d+', paragraph)
            score += len(numbers) * 2
            
            # Бонус за наличие технических терминов
            technical_words = re.findall(r'\b(производство|технология|оборудование|процесс|метод|система|материал|изготовление)\b', paragraph.lower())
            score += len(technical_words) * 3
            
            # Штраф за повторяющиеся слова
            word_counts = Counter(words)
            repeated_words = sum(1 for count in word_counts.values() if count > 3)
            score -= repeated_words * 2
            
            # Штраф за малое количество слов
            if len(words) < 20:
                score -= 5
                
            scored_paragraphs.append((score, paragraph))
        
        # Сортируем по релевантности и берем лучшие
        scored_paragraphs.sort(key=lambda x: x[0], reverse=True)
        
        # Берем параграфы согласно настройкам релевантности
        relevance_threshold = self.settings.get('relevance_threshold', 0.7)
        take_count = min(len(scored_paragraphs), max(int(len(scored_paragraphs) * relevance_threshold), 15))
        best_paragraphs = [p[1] for p in scored_paragraphs[:take_count]]
        
        return '\n\n'.join(best_paragraphs)
    
    def _normalize_text(self, text: str) -> str:
        """Нормализация текста"""
        # Убираем лишние пробелы
        text = re.sub(r'\s+', ' ', text)
        
        # Убираем лишние переносы строк
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
        
        # Убираем специальные символы в начале строк
        text = re.sub(r'\n[•\-\*\+]\s*', '\n', text)
        
        # Убираем HTML entities
        html_entities = {
            '&nbsp;': ' ', '&quot;': '"', '&lt;': '<', '&gt;': '>',
            '&amp;': '&', '&copy;': '©', '&reg;': '®', '&trade;': '™',
            '&laquo;': '«', '&raquo;': '»', '&mdash;': '—', '&ndash;': '–'
        }
        for entity, replacement in html_entities.items():
            text = text.replace(entity, replacement)
        
        return text.strip()
    
    def clean_content(self, content: str) -> str:
        """Полная очистка контента"""
        if not content or len(content) < 100:
            return content
            
        print("🧹 Начинаем очистку контента...")
        print(f"📊 Исходный размер: {len(content)} символов")
        
        # Проверяем режим очистки
        mode = self.settings.get('mode', 'automatic')
        
        if mode == 'manual':
            # Ручная очистка с настройками пользователя
            if self.settings.get('remove_technical_blocks', True):
                content = self._remove_technical_blocks(content)
                print(f"📊 После удаления технических блоков: {len(content)} символов")
            
            if self.settings.get('remove_duplicates', True):
                content = self._remove_duplicates(content)
                print(f"📊 После удаления дубликатов: {len(content)} символов")
            
            if self.settings.get('filter_relevance', True):
                content = self._filter_relevant_content(content)
                print(f"📊 После фильтрации релевантности: {len(content)} символов")
        else:
            # Автоматическая очистка (стандартная)
            content = self._remove_technical_blocks(content)
            print(f"📊 После удаления технических блоков: {len(content)} символов")
            
            content = self._remove_duplicates(content)
            print(f"📊 После удаления дубликатов: {len(content)} символов")
            
            content = self._filter_relevant_content(content)
            print(f"📊 После фильтрации релевантности: {len(content)} символов")
        
        # Этап 4: Нормализация (всегда выполняется)
        content = self._normalize_text(content)
        print(f"📊 Финальный размер: {len(content)} символов")
        
        return content
    
    def get_content_stats(self, content: str) -> dict:
        """Получение статистики контента"""
        if not content:
            return {"words": 0, "paragraphs": 0, "sentences": 0, "chars": 0}
            
        words = len(re.findall(r'\b[а-яёa-z]+\b', content.lower()))
        paragraphs = len([p for p in content.split('\n\n') if p.strip()])
        sentences = len(re.findall(r'[.!?]+', content))
        chars = len(content)
        
        return {
            "words": words,
            "paragraphs": paragraphs, 
            "sentences": sentences,
            "chars": chars
        }