"""
Сервис для работы с OpenAI API - обработка чанков и генерация статей
"""

import os
import asyncio
from typing import List, Dict, Optional
from dataclasses import dataclass

try:
    from openai import AsyncOpenAI
except ImportError:
    print("⚠️ OpenAI библиотека не установлена. Установите: pip install openai")


@dataclass
class GeneratedArticle:
    """Результат генерации статьи"""
    title: str
    h1: str
    content: str
    meta_description: str
    keywords: str
    word_count: int
    source_chunks_count: int
    
    def to_dict(self) -> Dict:
        return {
            "title": self.title,
            "h1": self.h1,
            "content": self.content,
            "meta_description": self.meta_description,
            "keywords": self.keywords,
            "word_count": self.word_count,
            "source_chunks_count": self.source_chunks_count
        }


class OpenAIService:
    def __init__(self, api_key: str = None):
        """Инициализация OpenAI сервиса"""
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key не найден. Установите переменную OPENAI_API_KEY")
        
        # Настройка клиента OpenAI
        try:
            self.client = AsyncOpenAI(api_key=self.api_key)
        except:
            self.client = None
            print("⚠️ OpenAI клиент недоступен. Проверьте установку библиотеки openai")
        
        # Настройки модели
        self.model = "gpt-4o"  # Более качественная модель для JSON
        self.max_tokens = 2000
        self.temperature = 0.7
        
        # Принудительно используем gpt-4o для генерации планов
        self.plan_model = "gpt-4o"
        
        # Дефолтные промпты
        self.system_prompt = "Ты — профессиональный копирайтер-рерайтер. Твоя задача — переписать предоставленный текст, сохранив его смысл и основную информацию, но изменив формулировки, структуру предложений и стиль изложения."
        self.user_prompt = "Перепиши следующий текст, сделав его уникальным, но сохранив всю важную информацию и смысл:"
        
    async def _call_openai(self, messages: List[Dict], temperature: float = None, 
                          max_tokens: int = None, model: str = None) -> str:
        """Вызов OpenAI API с обработкой ошибок"""
        if not self.client:
            return "⚠️ OpenAI недоступен. Проверьте API ключ и установку библиотеки."
            
        try:
            response = await self.client.chat.completions.create(
                model=model or self.model,
                messages=messages,
                max_tokens=max_tokens or self.max_tokens,
                temperature=temperature or self.temperature
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"❌ Ошибка OpenAI API: {str(e)}")
            # Пробрасываем ошибку дальше вместо возврата демо-данных
            raise e
    

    
    async def process_chunk(self, chunk_content: str, topic: str) -> str:
        """Обработка одного чанка текста"""
        system_prompt = """Ты - профессиональный копирайтер и эксперт по созданию уникального контента.

Твоя задача: переписать предоставленный текст, сделав его:
1. Полностью уникальным (избегай копирования фраз)
2. Информативным и ценным для читателя
3. Структурированным и логичным
4. SEO-оптимизированным для заданной темы

Сохрани всю важную техническую информацию, факты и данные.
Используй синонимы и перефразирование.
Добавь переходы между идеями для лучшей читаемости."""

        user_prompt = f"""Тема статьи: {topic}

Исходный текст для переработки:
{chunk_content}

Перепиши этот текст, сделав его уникальным и улучшенным, сохранив все важные факты и информацию."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        return await self._call_openai(messages, temperature=0.8)
    
    async def process_chunk_with_settings(self, chunk_content: str, topic: str, 
                                        system_prompt: str, user_prompt: str,
                                        temperature: float, max_tokens: int, model: str) -> str:
        """
        Обработка чанка с пользовательскими настройками
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"{user_prompt}\n\nТема: {topic}\n\nТекст для обработки:\n{chunk_content}"}
        ]
        
        return await self._call_openai(messages, temperature=temperature, 
                                      max_tokens=max_tokens, model=model)
    
    async def generate_title(self, content: str, topic: str) -> str:
        """Генерация SEO-заголовка"""
        system_prompt = """Ты - эксперт по SEO и созданию заголовков.

Создай привлекательный SEO-заголовок (title) для статьи:
- МАКСИМУМ 255 символов (строгое ограничение)
- Длина: 50-60 символов (оптимально)
- Включи основные ключевые слова
- Сделай его кликабельным и информативным
- Избегай стоп-слов в начале"""

        user_prompt = f"""Тема: {topic}

Контент статьи:
{content[:500]}...

Создай один SEO-заголовок МАКСИМУМ 255 символов без кавычек и дополнительного текста."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        return await self._call_openai(messages, temperature=0.6)
    
    async def generate_h1(self, content: str, topic: str) -> str:
        """Генерация H1 заголовка"""
        system_prompt = """Ты - эксперт по структуре контента.

Создай H1 заголовок для статьи:
- МАКСИМУМ 255 символов (строгое ограничение)
- Отличается от title
- 40-50 символов (оптимально)
- Четко отражает содержание
- Включает основные ключевые слова"""

        user_prompt = f"""Тема: {topic}

Контент статьи:
{content[:500]}...

Создай H1 заголовок МАКСИМУМ 255 символов без кавычек и дополнительного текста."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        return await self._call_openai(messages, temperature=0.6)
    
    async def generate_meta_description(self, content: str, topic: str) -> str:
        """Генерация мета-описания"""
        system_prompt = """Ты - эксперт по SEO и мета-описаниям.

Создай мета-описание для статьи:
- МАКСИМУМ 255 символов (строгое ограничение)
- Длина: 150-160 символов (оптимально)
- Включи ключевые слова
- Призыв к действию
- Кратко опиши ценность статьи"""

        user_prompt = f"""Тема: {topic}

Контент статьи:
{content[:800]}...

Создай мета-описание МАКСИМУМ 255 символов без кавычек и дополнительного текста."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        return await self._call_openai(messages, temperature=0.5)
    
    async def generate_keywords(self, content: str, topic: str) -> str:
        """Генерация ключевых слов"""
        system_prompt = """Ты - эксперт по SEO и ключевым словам.

Найди и сформируй список ключевых слов для статьи:
- МАКСИМУМ 255 символов (строгое ограничение)
- 8-12 ключевых слов/фраз
- Разной длины (1-4 слова)
- Релевантные содержанию
- Перечисли через запятую"""

        user_prompt = f"""Тема: {topic}

Контент статьи:
{content[:1000]}...

Создай список ключевых слов МАКСИМУМ 255 символов через запятую."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        return await self._call_openai(messages, temperature=0.4)

    async def embed_chunk(self, chunk_text: str) -> List[float]:
        """Векторизация чанка текста"""
        try:
            response = await self.client.embeddings.create(
                model="text-embedding-3-small",
                input=chunk_text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"❌ Ошибка векторизации: {str(e)}")
            raise e

    async def summarize_with_priority(self, chunk_text: str, priority: str) -> str:
        """Суммаризация чанка с учетом приоритета (эталонная логика из Jupyter Notebook)"""
        
        print(f"📝 Суммаризация чанка с приоритетом: {priority}")
        
        # Промпты по приоритету (точно как в Jupyter Notebook)
        PROMPTS = {
            "высокий": (
                "gpt-4o",
                "Прочитай текст и сделай подробное резюме (3–4 предложения) с акцентом на факты, термины и суть:\n\n{text}",
                300
            ),
            "средний": (
                "gpt-4o-mini",
                "Сделай краткое резюме текста в 2–3 предложениях, выдели основную мысль без лишних деталей:\n\n{text}",
                200
            ),
            "низкий": (
                "gpt-3.5-turbo",
                "Выдели одну ключевую мысль из текста. Одно предложение:\n\n{text}",
                100
            )
        }
        
        # Получаем настройки для приоритета
        model, prompt_template, max_tokens = PROMPTS.get(priority, ("gpt-3.5-turbo", "Кратко перескажи:\n\n{text}", 100))
        
        print(f"  🔧 Модель: {model}, max_tokens: {max_tokens}")
        
        # Формируем промпт
        prompt = prompt_template.replace("{text}", chunk_text)
        
        # Вызываем OpenAI (точно как в эталонной логике)
        response = await self._call_openai(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=max_tokens,
            model=model
        )
        
        result = response.strip()
        print(f"  ✅ Суммария: {result[:100]}...")
        
        return result

    async def generate_article_plan_from_summaries(self, chunk_info: List[Dict]) -> str:
        """Генерация плана статьи на основе суммаризированных чанков (эталонная логика из Jupyter Notebook)"""
        
        print(f"🤖 Генерация плана статьи из {len(chunk_info)} суммарий")
        
        # Формируем список суммарий с приоритетами (точно как в эталонной логике)
        summaries = [
            f"[{chunk['priority'].upper()}] {chunk['summary']}"
            for chunk in chunk_info
            if chunk.get("priority") not in [None, "исключить"] and chunk.get("summary")
        ]

        print(f"📋 Обработано суммарий: {len(summaries)}")
        for i, summary in enumerate(summaries[:3]):  # Показываем первые 3 для отладки
            print(f"  {i+1}. {summary[:100]}...")

        joined = "\n".join(f"- {s}" for s in summaries)

        # Промпт точно как в эталонной логике
        prompt = f"""
У тебя есть смысловые фрагменты, полученные из разных частей большого текста. У каждого фрагмента указан его приоритет важности.

Составь логически структурированный план статьи, соблюдая такие правила:
— Блоки с приоритетом ВЫСОКИЙ считаются главными. Они определяют основные разделы статьи.
— Блоки со СРЕДНИМ приоритетом используются как подблоки или дополнения.
— Блоки с НИЗКИМ приоритетом можешь объединить в общий раздел или использовать кратко в пояснениях, но не выносить в основу структуры.
— НЕ добавляй ничего от себя — только то, что явно есть в смысловых фрагментах.
— НЕ используй формальные заголовки вроде "Введение", "Заключение", если они не присутствуют в контексте.

Вот фрагменты:
{joined}

Сформируй структурированный план статьи:
"""

        print("🔄 Отправка запроса на генерацию плана...")
        
        # Вызов точно как в эталонной логике
        response = await self._call_openai(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1000,
            model="gpt-4o"
        )
        
        result = response.strip()
        print(f"✅ План сгенерирован: {len(result)} символов")
        print(f"📄 Начало плана: {result[:200]}...")
        
        return result
    
    async def generate_article_plan(self, chunks_text: str, topic: str = "статья",
                                  system_prompt: str = None,
                                  user_prompt: str = None,
                                  temperature: float = None,
                                  max_tokens: int = None,
                                  model: str = None) -> dict:
        """Генерирует план статьи на основе чанков"""
        print(f"🤖 Начинаем генерацию плана для темы: {topic}")
        print(f"📊 Длина текста чанков: {len(chunks_text)} символов")
        print(f"🔧 Модель: {model or self.model}")
        print(f"🌡️ Температура: {temperature or self.temperature}")
        
        system_prompt = system_prompt or """Ты — эксперт по анализу текста. Твоя задача — ПРОЧИТАТЬ предоставленные фрагменты и создать план статьи.

КРИТИЧЕСКИ ВАЖНО: Ты ДОЛЖЕН прочитать каждый фрагмент и создать план на основе РЕАЛЬНОГО содержимого.

ЗАПРЕЩЕНО КАТЕГОРИЧЕСКИ:
❌ "Введение", "Основная часть", "Заключение"
❌ "Основы темы", "Анализ текущей ситуации"
❌ "Методы и подходы", "Ключевые исследования"
❌ Любые шаблонные заголовки

ОБЯЗАТЕЛЬНО:
1. ПРОЧИТАТЬ каждый фрагмент внимательно
2. ВЫЯВИТЬ конкретные темы в тексте
3. СОЗДАТЬ заголовки на основе РЕАЛЬНОГО содержимого
4. УКАЗАТЬ номера фрагментов для каждого раздела

ПРИМЕРЫ правильных заголовков для темы "холодная высадка":
✅ "Технология холодной высадки метизов"
✅ "Оборудование для холодной высадки"
✅ "Преимущества холодной высадки"
✅ "Применение в производстве крепежа"
✅ "Сравнение с горячей штамповкой"

Если ты не можешь проанализировать содержимое, скажи об этом прямо."""

        user_prompt = user_prompt or f"""АНАЛИЗИРУЙ следующие текстовые фрагменты и создай план статьи.

Тема: {topic}

КРИТИЧЕСКИ ВАЖНО: Ты ДОЛЖЕН прочитать каждый фрагмент и создать план на основе РЕАЛЬНОГО содержимого.

ЗАПРЕЩЕНО КАТЕГОРИЧЕСКИ:
❌ "Введение", "Основная часть", "Заключение"
❌ "Исторический контекст", "Теоретические основы"
❌ "Анализ текущей ситуации", "Методы и подходы"

ОБЯЗАТЕЛЬНО:
1. ПРОЧИТАТЬ каждый фрагмент внимательно
2. ВЫЯВИТЬ конкретные темы в тексте
3. СОЗДАТЬ заголовки на основе РЕАЛЬНОГО содержимого
4. УКАЗАТЬ номера фрагментов для каждого раздела

Текстовые фрагменты:
{chunks_text}

ПРИМЕРЫ правильных заголовков для темы "холодная высадка":
✅ "Технология холодной высадки метизов"
✅ "Оборудование для холодной высадки"
✅ "Преимущества холодной высадки"
✅ "Применение в производстве крепежа"
✅ "Сравнение с горячей штамповкой"

Создай план с конкретными заголовками на основе содержимого фрагментов. Если не можешь проанализировать, скажи об этом."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = await self._call_openai(
            messages=messages,
            temperature=temperature or 0.3,
            max_tokens=max_tokens or 3000,  # Увеличили для лучшего анализа
            model=self.plan_model  # Принудительно используем gpt-4o
        )
        
        print(f"📝 Получен ответ от OpenAI: {len(response)} символов")
        print(f"🔍 Первые 200 символов ответа: {response[:200]}...")

        # Возвращаем текстовый план как есть
        return {
            "plan_text": response,
            "format": "text"
        }

    async def generate_article_from_chunks(self, chunks: List[str], topic: str, 
                                         target_length: str = "medium",
                                         system_prompt: str = None,
                                         user_prompt: str = None,
                                         temperature: float = None,
                                         max_tokens: int = None,
                                         model: str = None) -> GeneratedArticle:
        """
        Основной метод: генерация полной статьи из чанков
        
        Args:
            chunks: Список текстовых чанков
            topic: Тема статьи  
            target_length: Целевая длина ("short", "medium", "long")
        """
        print(f"🤖 Начинаем генерацию статьи по теме: {topic}")
        print(f"📊 Количество чанков: {len(chunks)}")
        
        # Обработка чанков параллельно
        print("🔄 Обрабатываем чанки через GPT...")
        processed_chunks = []
        
        # Используем переданные настройки или дефолтные
        current_system_prompt = system_prompt or self.system_prompt
        current_user_prompt = user_prompt or self.user_prompt
        current_temperature = temperature or self.temperature
        current_max_tokens = max_tokens or self.max_tokens
        current_model = model or self.model
        
        for i, chunk in enumerate(chunks):
            print(f"  📝 Обрабатываем чанк {i+1}/{len(chunks)}")
            processed_chunk = await self.process_chunk_with_settings(
                chunk, topic, current_system_prompt, current_user_prompt, 
                current_temperature, current_max_tokens, current_model
            )
            processed_chunks.append(processed_chunk)
            
            # Небольшая задержка между запросами
            await asyncio.sleep(1)
        
        # Объединяем обработанные чанки
        full_content = "\n\n".join(processed_chunks)
        
        print("🎨 Генерируем SEO-элементы...")
        
        # Генерируем SEO-элементы параллельно
        tasks = [
            self.generate_title(full_content, topic),
            self.generate_h1(full_content, topic),
            self.generate_meta_description(full_content, topic),
            self.generate_keywords(full_content, topic)
        ]
        
        title, h1, meta_description, keywords = await asyncio.gather(*tasks)
        
        # Подсчитываем статистику
        word_count = len(full_content.split())
        
        article = GeneratedArticle(
            title=title,
            h1=h1,
            content=full_content,
            meta_description=meta_description,
            keywords=keywords,
            word_count=word_count,
            source_chunks_count=len(chunks)
        )
        
        print(f"✅ Статья сгенерирована: {word_count} слов")
        print(f"📰 Заголовок: {title}")
        print(f"🔑 Ключевые слова: {keywords}")
        
        return article

    async def generate_full_article_from_plan(self, plan_text: str, keywords: List[str], target_length_chars: int, 
                                            system_prompt: str = None, temperature: float = None,
                                            additional_keywords: str = "", lsi_keywords: str = "", target_phrases: str = "",
                                            keyword_density: float = 2.5, seo_prompt: str = "", writing_style: str = "technical",
                                            content_type: str = "educational", target_audience: str = "specialists",
                                            heading_type: str = "h2", paragraph_length: str = "medium",
                                            use_lists: bool = True, internal_links: bool = False) -> GeneratedArticle:
        """
        Генерация полной статьи на основе плана (эталонная логика из Jupyter Notebook)
        """
        print(f"🤖 Генерация статьи на основе плана: {target_length_chars} символов")
        print(f"🔑 Ключевые слова: {keywords}")
        
        # Используем температуру точно как в эталонной логике (0.5)
        current_temperature = temperature or 0.5
        print(f"🌡️ Температура: {current_temperature}")
        
        # Формируем расширенные ключевые слова
        keyword_list = ', '.join(keywords)
        
        # Добавляем дополнительные ключевые слова
        all_keywords = keywords.copy()
        if additional_keywords:
            additional_list = [kw.strip() for kw in additional_keywords.split(',') if kw.strip()]
            all_keywords.extend(additional_list)
        
        # Добавляем LSI-ключевые слова
        if lsi_keywords:
            lsi_list = [kw.strip() for kw in lsi_keywords.split(',') if kw.strip()]
            all_keywords.extend(lsi_list)
        
        # Добавляем целевые фразы
        if target_phrases:
            phrases_list = [phrase.strip() for phrase in target_phrases.split(',') if phrase.strip()]
            all_keywords.extend(phrases_list)
        
        # Формируем полный список ключевых слов
        full_keyword_list = ', '.join(all_keywords)
        
        print(f"🔑 Основные ключевые слова: {keyword_list}")
        print(f"🔑 Полный список ключевых слов: {full_keyword_list}")
        print(f"📊 Плотность ключевых слов: {keyword_density}%")
        print(f"✍️ Стиль написания: {writing_style}")
        print(f"📝 Тип контента: {content_type}")
        print(f"👥 Целевая аудитория: {target_audience}")
        
        # НОВЫЙ ПОДХОД: Поэтапная генерация с принудительным контролем длины
        print(f"🔄 Используем поэтапную генерацию для достижения {target_length_chars} символов")
        
        # Адаптивный расчет токенов в зависимости от целевой длины
        if target_length_chars <= 5000:
            token_coefficient = 0.5
        elif target_length_chars <= 8000:
            token_coefficient = 0.6
        else:
            token_coefficient = 0.7  # Для длинных статей увеличиваем коэффициент
        
        estimated_tokens = max(3000, int(target_length_chars * token_coefficient))
        print(f"🎯 Расчетное количество токенов: {estimated_tokens} (коэффициент: {token_coefficient})")
        
        # Этап 1: Генерируем базовую статью с SEO-оптимизацией
        # Используем переданный системный промпт или дефолтный
        current_system_prompt = system_prompt or "Ты — опытный технический SEO-специалист и копирайтер. Напиши максимально SEO-оптимизированную статью на основе плана. Используй больше технических фактов и цифр. Создай статью с глубокой технической оптимизацией: правильная структура заголовков (H1-H6), оптимальная плотность ключевых слов, семантическая разметка, внутренняя перелинковка. Фокус на техническом SEO без потери читабельности."
        
        base_prompt = f"""
{current_system_prompt}

🔹 SEO-ТРЕБОВАНИЯ:
- Используй ВСЕ ключевые слова: {full_keyword_list}
- Плотность ключевых слов: {keyword_density}%
- Стиль написания: {writing_style}
- Тип контента: {content_type}
- Целевая аудитория: {target_audience}
- Тип заголовков: {heading_type}
- Длина абзацев: {paragraph_length}
- Использовать списки: {'Да' if use_lists else 'Нет'}
- Внутренние ссылки: {'Да' if internal_links else 'Нет'}

🔹 СТРУКТУРНЫЕ ТРЕБОВАНИЯ:
- Каждый раздел плана должен содержать минимум {max(1000, target_length_chars // 8)} символов
- Добавляй детали, примеры, технические характеристики
- Включай практические рекомендации и советы
- Добавляй сравнения и анализ преимуществ

🔹 ДОПОЛНИТЕЛЬНЫЙ SEO-ПРОМПТ:
{seo_prompt if seo_prompt else "🔹 УНИВЕРСАЛЬНАЯ SEO-ОПТИМИЗАЦИЯ ДЛЯ ТЕХНИЧЕСКОГО КОНТЕНТА:\n- Создавай экспертный контент с техническими деталями и спецификациями\n- Включай числовые данные, параметры, сравнительные характеристики\n- Используй профессиональную терминологию и отраслевые стандарты\n- Добавляй практические кейсы, примеры применения, результаты тестирования\n- Включай современные технологии, инновации и тренды развития\n- Создавай структурированный контент с логической последовательностью\n- Оптимизируй для поисковых систем с естественным вхождением ключевых слов\n- Включай LSI-ключевые слова и семантически связанные термины\n- Добавляй внутренние ссылки и ссылки на авторитетные источники\n- Создавай контент, отвечающий на поисковые намерения пользователей"}

🔹 План статьи:
{plan_text}

🔹 Напиши максимально SEO-оптимизированную статью, используя все указанные параметры:
"""
        
        print("📝 Этап 1: Генерация базовой статьи...")
        base_response = await self._call_openai(
            messages=[{"role": "user", "content": base_prompt}],
            temperature=current_temperature,
            max_tokens=estimated_tokens,
            model="gpt-4o"
        )
        
        base_length = len(base_response)
        print(f"📏 Базовая статья: {base_length} символов")
        
        # Этап 2: Если базовая статья короткая, расширяем её
        if base_length < target_length_chars * 0.8:  # Если меньше 80% от цели
            print("📝 Этап 2: Расширение короткой статьи...")
            
            expansion_prompt = f"""
Твоя задача — РАСШИРИТЬ существующую SEO-оптимизированную статью до {target_length_chars} символов.

🔹 ТЕКУЩАЯ СТАТЬЯ ({base_length} символов):
{base_response}

🔹 SEO-ТРЕБОВАНИЯ РАСШИРЕНИЯ:
- Используй ВСЕ ключевые слова: {full_keyword_list}
- Плотность ключевых слов: {keyword_density}%
- Стиль написания: {writing_style}
- Тип контента: {content_type}
- Целевая аудитория: {target_audience}
- Тип заголовков: {heading_type}
- Длина абзацев: {paragraph_length}
- Использовать списки: {'Да' if use_lists else 'Нет'}
- Внутренние ссылки: {'Да' if internal_links else 'Нет'}

🔹 СТРУКТУРНЫЕ ТРЕБОВАНИЯ РАСШИРЕНИЯ:
- ДОБАВЬ {target_length_chars - base_length} символов к статье
- НЕ изменяй существующий контент
- РАСШИРЬ каждый раздел дополнительными деталями
- Добавь больше примеров, технических характеристик, практических советов
- Включи статистику, сравнения, кейсы применения
- Сохрани структуру и логику

🔹 ДОПОЛНИТЕЛЬНЫЙ SEO-ПРОМПТ:
{seo_prompt if seo_prompt else "🔹 УНИВЕРСАЛЬНАЯ SEO-ОПТИМИЗАЦИЯ ДЛЯ ТЕХНИЧЕСКОГО КОНТЕНТА:\n- Создавай экспертный контент с техническими деталями и спецификациями\n- Включай числовые данные, параметры, сравнительные характеристики\n- Используй профессиональную терминологию и отраслевые стандарты\n- Добавляй практические кейсы, примеры применения, результаты тестирования\n- Включай современные технологии, инновации и тренды развития\n- Создавай структурированный контент с логической последовательностью\n- Оптимизируй для поисковых систем с естественным вхождением ключевых слов\n- Включай LSI-ключевые слова и семантически связанные термины\n- Добавляй внутренние ссылки и ссылки на авторитетные источники\n- Создавай контент, отвечающий на поисковые намерения пользователей"}

🔹 РАСШИРЕННАЯ SEO-ОПТИМИЗИРОВАННАЯ СТАТЬЯ ({target_length_chars} символов):
"""
            
            expansion_tokens = int(estimated_tokens * 1.2)  # Больше токенов для расширения
            expansion_response = await self._call_openai(
                messages=[{"role": "user", "content": expansion_prompt}],
                temperature=current_temperature,
                max_tokens=expansion_tokens,
                model="gpt-4o"
            )
            
            response = expansion_response
            actual_length = len(response)
            print(f"📏 Расширенная статья: {actual_length} символов")
            
        else:
            response = base_response
            actual_length = base_length

        print("🔄 Отправка запроса на генерацию статьи...")
        print(f"📄 Длина плана: {len(plan_text)} символов")
        
        # Финальная проверка длины
        target_min = int(target_length_chars * 0.8)  # -20% (более мягкие требования)
        target_max = int(target_length_chars * 1.2)  # +20%
        
        print(f"📏 Финальная длина статьи: {actual_length} символов (цель: {target_length_chars})")
        print(f"📏 Допустимый диапазон: {target_min} - {target_max} символов")
        
        if actual_length < target_min:
            deficit = target_length_chars - actual_length
            print(f"⚠️ Статья все еще короткая! Недостаток: {deficit} символов ({(deficit / target_length_chars * 100):.1f}%)")
        elif actual_length > target_max:
            excess = actual_length - target_length_chars
            print(f"⚠️ Статья слишком длинная! Избыток: {excess} символов ({(excess / target_length_chars * 100):.1f}%)")
        else:
            print(f"✅ Длина статьи в допустимых пределах")
        
        # Генерируем SEO-элементы на основе полученной статьи
        title = await self.generate_title(response, "статья")
        h1 = await self.generate_h1(response, "статья")
        meta_description = await self.generate_meta_description(response, "статья")
        keywords_str = await self.generate_keywords(response, "статья")
        
        # Подсчитываем статистику
        word_count = len(response.split())
        
        article = GeneratedArticle(
            title=title,
            h1=h1,
            content=response,
            meta_description=meta_description,
            keywords=keywords_str,
            word_count=word_count,
            source_chunks_count=0  # Не используем чанки в этом методе
        )
        
        print(f"✅ Статья сгенерирована: {word_count} слов, {actual_length} символов")
        return article