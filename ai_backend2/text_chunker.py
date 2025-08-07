"""
Сервис для разделения текста на чанки для GPT обработки
"""

import re
import math
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class TextChunk:
    """Класс для представления чанка текста"""
    content: str
    chunk_id: int
    start_position: int
    end_position: int
    word_count: int
    sentence_count: int
    keywords: List[str]
    
    def to_dict(self) -> Dict:
        return {
            "content": self.content,
            "chunk_id": self.chunk_id,
            "start_position": self.start_position,
            "end_position": self.end_position,
            "word_count": self.word_count,
            "sentence_count": self.sentence_count,
            "keywords": self.keywords
        }


class TextChunker:
    def __init__(self, target_chunk_size: int = 1000, overlap_size: int = 100):
        """
        Инициализация чанкера
        
        Args:
            target_chunk_size: Целевой размер чанка в словах
            overlap_size: Размер перекрытия между чанками в словах
        """
        self.target_chunk_size = target_chunk_size
        self.overlap_size = overlap_size
        self.min_chunk_size = max(200, target_chunk_size // 4)
        self.max_chunk_size = target_chunk_size * 2
        
    def _extract_keywords(self, text: str, limit: int = 10) -> List[str]:
        """Извлечение ключевых слов из текста"""
        # Простое извлечение существительных и технических терминов
        words = re.findall(r'\b[а-яё]{4,}\b', text.lower())
        
        # Технические/важные слова получают больший вес
        technical_patterns = [
            r'\b(производство|технология|оборудование|процесс|метод|система|материал)\b',
            r'\b(изготовление|обработка|качество|стандарт|требование|норма)\b',
            r'\b(металл|сталь|чугун|железо|алюминий|медь|цинк|олово)\b'
        ]
        
        technical_words = []
        for pattern in technical_patterns:
            technical_words.extend(re.findall(pattern, text.lower()))
        
        # Подсчет частоты
        word_freq = {}
        for word in words + technical_words * 2:  # Технические слова весят больше
            if len(word) >= 4:  # Минимум 4 символа
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Возвращаем топ слова
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in sorted_words[:limit] if freq > 1]
    
    def _split_by_sentences(self, text: str) -> List[str]:
        """Разделение текста на предложения"""
        # Улучшенное разделение на предложения
        sentences = re.split(r'(?<=[.!?])\s+(?=[А-ЯЁ])', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _split_by_paragraphs(self, text: str) -> List[str]:
        """Разделение текста на абзацы"""
        paragraphs = text.split('\n\n')
        return [p.strip() for p in paragraphs if p.strip()]
    
    def _get_word_count(self, text: str) -> int:
        """Подсчет количества слов"""
        return len(re.findall(r'\b[а-яёa-z]+\b', text.lower()))
    
    def _create_chunk_from_sentences(self, sentences: List[str], chunk_id: int, 
                                   start_pos: int) -> TextChunk:
        """Создание чанка из списка предложений"""
        content = ' '.join(sentences)
        word_count = self._get_word_count(content)
        sentence_count = len(sentences)
        keywords = self._extract_keywords(content)
        
        return TextChunk(
            content=content,
            chunk_id=chunk_id,
            start_position=start_pos,
            end_position=start_pos + len(content),
            word_count=word_count,
            sentence_count=sentence_count,
            keywords=keywords
        )
    
    def chunk_text_by_paragraphs(self, text: str) -> List[TextChunk]:
        """Разделение текста на чанки по абзацам"""
        if not text.strip():
            return []
            
        paragraphs = self._split_by_paragraphs(text)
        if not paragraphs:
            return self.chunk_text_by_sentences(text)
        
        chunks = []
        current_chunk_sentences = []
        current_word_count = 0
        chunk_id = 0
        start_position = 0
        
        for paragraph in paragraphs:
            paragraph_sentences = self._split_by_sentences(paragraph)
            paragraph_word_count = self._get_word_count(paragraph)
            
            # Если абзац сам по себе слишком большой
            if paragraph_word_count > self.max_chunk_size:
                # Сохраняем текущий чанк, если есть
                if current_chunk_sentences:
                    chunk = self._create_chunk_from_sentences(
                        current_chunk_sentences, chunk_id, start_position
                    )
                    chunks.append(chunk)
                    chunk_id += 1
                    start_position += len(' '.join(current_chunk_sentences))
                    current_chunk_sentences = []
                    current_word_count = 0
                
                # Разделяем большой абзац на предложения
                para_chunks = self.chunk_text_by_sentences(paragraph)
                for para_chunk in para_chunks:
                    para_chunk.chunk_id = chunk_id
                    chunks.append(para_chunk)
                    chunk_id += 1
                
                continue
            
            # Проверяем, поместится ли абзац в текущий чанк
            if (current_word_count + paragraph_word_count <= self.target_chunk_size or 
                not current_chunk_sentences):
                
                current_chunk_sentences.extend(paragraph_sentences)
                current_word_count += paragraph_word_count
            else:
                # Сохраняем текущий чанк
                chunk = self._create_chunk_from_sentences(
                    current_chunk_sentences, chunk_id, start_position
                )
                chunks.append(chunk)
                chunk_id += 1
                start_position += len(' '.join(current_chunk_sentences))
                
                # Начинаем новый чанк с перекрытием
                overlap_sentences = current_chunk_sentences[-2:] if len(current_chunk_sentences) >= 2 else []
                current_chunk_sentences = overlap_sentences + paragraph_sentences
                current_word_count = self._get_word_count(' '.join(current_chunk_sentences))
        
        # Сохраняем последний чанк
        if current_chunk_sentences:
            chunk = self._create_chunk_from_sentences(
                current_chunk_sentences, chunk_id, start_position
            )
            chunks.append(chunk)
        
        return chunks
    
    def chunk_text_by_sentences(self, text: str) -> List[TextChunk]:
        """Разделение текста на чанки по предложениям"""
        if not text.strip():
            return []
            
        sentences = self._split_by_sentences(text)
        if not sentences:
            return []
        
        chunks = []
        current_sentences = []
        current_word_count = 0
        chunk_id = 0
        start_position = 0
        
        for sentence in sentences:
            sentence_word_count = self._get_word_count(sentence)
            
            # Если предложение само слишком длинное
            if sentence_word_count > self.max_chunk_size:
                # Сохраняем текущий чанк
                if current_sentences:
                    chunk = self._create_chunk_from_sentences(
                        current_sentences, chunk_id, start_position
                    )
                    chunks.append(chunk)
                    chunk_id += 1
                    start_position += len(' '.join(current_sentences))
                
                # Создаем чанк из одного длинного предложения
                chunk = self._create_chunk_from_sentences(
                    [sentence], chunk_id, start_position
                )
                chunks.append(chunk)
                chunk_id += 1
                start_position += len(sentence)
                current_sentences = []
                current_word_count = 0
                continue
            
            # Проверяем, поместится ли предложение в текущий чанк
            if (current_word_count + sentence_word_count <= self.target_chunk_size or 
                not current_sentences):
                
                current_sentences.append(sentence)
                current_word_count += sentence_word_count
            else:
                # Сохраняем текущий чанк
                chunk = self._create_chunk_from_sentences(
                    current_sentences, chunk_id, start_position
                )
                chunks.append(chunk)
                chunk_id += 1
                start_position += len(' '.join(current_sentences))
                
                # Начинаем новый чанк с перекрытием
                overlap_sentences = current_sentences[-1:] if current_sentences else []
                current_sentences = overlap_sentences + [sentence]
                current_word_count = self._get_word_count(' '.join(current_sentences))
        
        # Сохраняем последний чанк
        if current_sentences:
            chunk = self._create_chunk_from_sentences(
                current_sentences, chunk_id, start_position
            )
            chunks.append(chunk)
        
        return chunks
    
    def chunk_text(self, text: str, method: str = "paragraphs") -> List[TextChunk]:
        """
        Основной метод для разделения текста на чанки
        
        Args:
            text: Текст для разделения
            method: Метод разделения ("paragraphs" или "sentences")
        
        Returns:
            Список чанков
        """
        if not text or not text.strip():
            return []
        
        print(f"🔪 Начинаем разделение текста на чанки (метод: {method})")
        print(f"📊 Исходный текст: {self._get_word_count(text)} слов")
        print(f"🎯 Целевой размер чанка: {self.target_chunk_size} слов")
        
        if method == "paragraphs":
            chunks = self.chunk_text_by_paragraphs(text)
        else:
            chunks = self.chunk_text_by_sentences(text)
        
        print(f"✅ Создано {len(chunks)} чанков")
        
        # Выводим статистику по чанкам
        for i, chunk in enumerate(chunks):
            print(f"  📄 Чанк {i+1}: {chunk.word_count} слов, {chunk.sentence_count} предложений")
            if chunk.keywords:
                print(f"    🔑 Ключевые слова: {', '.join(chunk.keywords[:5])}")
        
        return chunks
    
    def get_chunking_stats(self, chunks: List[TextChunk]) -> Dict:
        """Получение статистики по чанкам"""
        if not chunks:
            return {"total_chunks": 0, "total_words": 0}
            
        total_words = sum(chunk.word_count for chunk in chunks)
        total_sentences = sum(chunk.sentence_count for chunk in chunks)
        avg_chunk_size = total_words / len(chunks) if chunks else 0
        
        return {
            "total_chunks": len(chunks),
            "total_words": total_words,
            "total_sentences": total_sentences,
            "average_chunk_size": round(avg_chunk_size, 1),
            "min_chunk_size": min(chunk.word_count for chunk in chunks),
            "max_chunk_size": max(chunk.word_count for chunk in chunks)
        }