"""
Сервис для парсинга полного контента статей по URL
"""

import requests
import time
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
from urllib.parse import urljoin, urlparse
import re
from content_cleaner import ContentCleaner
from text_chunker import TextChunker, TextChunk


class ArticleContent:
    def __init__(self, url: str, title: str, content: str, meta_description: str = "", 
                 cleaned_content: str = "", content_stats: dict = None, 
                 chunks: List[TextChunk] = None, chunking_stats: dict = None):
        self.url = url
        self.title = title
        self.content = content
        self.meta_description = meta_description
        self.cleaned_content = cleaned_content or content
        self.word_count = len(content.split()) if content else 0
        self.cleaned_word_count = len(cleaned_content.split()) if cleaned_content else 0
        self.content_stats = content_stats or {}
        self.chunks = chunks or []
        self.chunking_stats = chunking_stats or {}
        
    def to_dict(self) -> Dict:
        return {
            "url": self.url,
            "title": self.title,
            "content": self.content,
            "cleaned_content": self.cleaned_content,
            "meta_description": self.meta_description,
            "word_count": self.word_count,
            "cleaned_word_count": self.cleaned_word_count,
            "content_stats": self.content_stats,
            "chunks": [chunk.to_dict() for chunk in self.chunks],
            "chunking_stats": self.chunking_stats
        }


class ContentParser:
    def __init__(self, enable_cleaning: bool = True, enable_chunking: bool = False, 
                 chunk_size: int = 1000, cleaning_settings: dict = None):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }
        self.timeout = 20
        self.enable_cleaning = enable_cleaning
        self.enable_chunking = enable_chunking
        self.cleaning_settings = cleaning_settings or {}
        self.cleaner = ContentCleaner(self.cleaning_settings) if enable_cleaning else None
        self.chunker = TextChunker(target_chunk_size=chunk_size) if enable_chunking else None
        
    def _clean_text(self, text: str) -> str:
        """Очистка текста от лишних символов и форматирование"""
        if not text:
            return ""
            
        # Удаляем лишние пробелы и переносы строк
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\n\s*\n', '\n\n', text)
        
        # Удаляем HTML entities
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&quot;', '"')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&amp;', '&')
        
        return text.strip()
    
    def _extract_main_content(self, soup: BeautifulSoup, url: str) -> str:
        """Извлечение основного контента из HTML"""
        
        # Удаляем ненужные элементы
        for tag in soup(['script', 'style', 'nav', 'header', 'footer', 
                        'aside', 'advertisement', 'ads', 'sidebar']):
            tag.decompose()
            
        # Удаляем элементы по классам и ID (типичный мусор)
        unwanted_selectors = [
            '[class*="nav"]', '[class*="menu"]', '[class*="header"]', 
            '[class*="footer"]', '[class*="sidebar"]', '[class*="widget"]',
            '[class*="ad"]', '[class*="banner"]', '[class*="popup"]',
            '[id*="nav"]', '[id*="menu"]', '[id*="header"]', 
            '[id*="footer"]', '[id*="sidebar"]'
        ]
        
        for selector in unwanted_selectors:
            for element in soup.select(selector):
                element.decompose()
        
        # Пытаемся найти основной контент по популярным селекторам
        content_selectors = [
            'article', '[role="main"]', 'main', '.content', '.post-content',
            '.entry-content', '.article-content', '.post-body', '.text',
            '.post', '.blog-post', '.article', '.story', '.news-content',
            '.page-content', '.main-content', '.content-area', '.entry',
            '.post-text', '.article-text', '.content-text', '.text-content',
            '#content', '#main', '.main-content'
        ]
        
        main_content = None
        for selector in content_selectors:
            elements = soup.select(selector)
            if elements:
                # Выбираем элемент с наибольшим количеством текста
                main_content = max(elements, key=lambda x: len(x.get_text()))
                break
        
        # Если не нашли по селекторам, ищем по тегам
        if not main_content:
            for tag in ['article', 'main', 'div']:
                elements = soup.find_all(tag)
                if elements:
                    # Берем элемент с наибольшим количеством текста
                    main_content = max(elements, key=lambda x: len(x.get_text()))
                    break
        
        if not main_content:
            main_content = soup
            
        # Извлекаем текст из параграфов и заголовков
        content_parts = []
        
        # Приоритет: p, div, span с достаточным количеством текста
        for tag in main_content.find_all(['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li']):
            text = tag.get_text().strip()
            if len(text) > 20:  # Уменьшили минимум до 20 символов
                content_parts.append(text)
        
        # Если мало контента, берем весь текст
        if len(' '.join(content_parts)) < 150:
            content_parts = [main_content.get_text()]
            
        full_content = '\n\n'.join(content_parts)
        return self._clean_text(full_content)
    
    def parse_article(self, url: str) -> Optional[ArticleContent]:
        """Парсинг одной статьи по URL"""
        try:
            print(f"📄 Парсинг: {url}")
            
            response = requests.get(url, headers=self.headers, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Извлекаем title
            title_tag = soup.find('title')
            title = title_tag.get_text().strip() if title_tag else "Заголовок не найден"
            
            # Извлекаем meta description
            meta_desc_tag = soup.find('meta', attrs={'name': 'description'})
            meta_description = ""
            if meta_desc_tag and meta_desc_tag.get('content'):
                meta_description = meta_desc_tag['content'].strip()
            
            # Извлекаем основной контент
            content = self._extract_main_content(soup, url)
            
            if len(content) < 50:
                print(f"⚠️ Мало контента ({len(content)} символов): {url}")
                return None
            
            # Очистка контента (если включена)
            cleaned_content = content
            content_stats = {}
            
            if self.enable_cleaning and self.cleaner:
                cleaned_content = self.cleaner.clean_content(content)
                content_stats = self.cleaner.get_content_stats(cleaned_content)
                
                if len(cleaned_content) < 50:
                    print(f"⚠️ После очистки мало контента ({len(cleaned_content)} символов): {url}")
                    return None
            
            # Создание чанков (если включено)
            chunks = []
            chunking_stats = {}
            
            if self.enable_chunking and self.chunker:
                text_for_chunking = cleaned_content if cleaned_content else content
                chunks = self.chunker.chunk_text(text_for_chunking)
                chunking_stats = self.chunker.get_chunking_stats(chunks)
                
            article = ArticleContent(url, title, content, meta_description, 
                                   cleaned_content, content_stats, chunks, chunking_stats)
            
            chunk_info = f" (чанков: {len(chunks)})" if chunks else ""
            print(f"✅ Успешно спарсено: {article.word_count} слов (очищено: {article.cleaned_word_count} слов){chunk_info}")
            
            return article
            
        except requests.RequestException as e:
            print(f"❌ Ошибка запроса {url}: {str(e)}")
            return None
        except Exception as e:
            print(f"❌ Ошибка парсинга {url}: {str(e)}")
            return None
    
    def parse_multiple_articles(self, urls: List[str], delay: float = 1.0) -> List[ArticleContent]:
        """Парсинг нескольких статей с задержкой между запросами"""
        articles = []
        
        for i, url in enumerate(urls, 1):
            print(f"\n[{i}/{len(urls)}] Обработка URL...")
            
            article = self.parse_article(url)
            if article:
                articles.append(article)
            
            # Задержка между запросами
            if i < len(urls):
                time.sleep(delay)
        
        print(f"\n📊 Результат: успешно спарсено {len(articles)} из {len(urls)} статей")
        return articles