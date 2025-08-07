"""
FastAPI роутер для SEO Copywriter модуля
"""

import time
import requests
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import json
from datetime import datetime
from search_service import YandexSearchService, SearchResult
from content_parser import ContentParser, ArticleContent
from openai_service import OpenAIService, GeneratedArticle
from text_ru_service import TextRuService


class SearchRequest(BaseModel):
    query: str
    page_size: Optional[int] = 10
    region: Optional[int] = 225  # По умолчанию - по всей России


class SearchResultResponse(BaseModel):
    title: str
    url: str
    snippet: str


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultResponse]
    total_found: int


class CleaningSettings(BaseModel):
    mode: Optional[str] = "automatic"  # "automatic" или "manual"
    remove_technical_blocks: Optional[bool] = True
    remove_duplicates: Optional[bool] = True
    filter_relevance: Optional[bool] = True
    min_paragraph_length: Optional[int] = 50
    max_paragraph_length: Optional[int] = 2000
    relevance_threshold: Optional[float] = 0.7

class ParseRequest(BaseModel):
    urls: List[str]
    delay: Optional[float] = 1.0
    enable_cleaning: Optional[bool] = True
    enable_chunking: Optional[bool] = False
    chunk_size: Optional[int] = 1000
    chunking_method: Optional[str] = "paragraphs"
    cleaning_settings: Optional[CleaningSettings] = None


class ArticleContentResponse(BaseModel):
    url: str
    title: str
    content: str
    cleaned_content: str
    meta_description: str
    word_count: int
    cleaned_word_count: int
    content_stats: dict
    chunks: List[dict]
    chunking_stats: dict


class ParseError(BaseModel):
    url: str
    error: str
    error_type: str  # "request_error", "parsing_error", "content_too_short"

class ParseResponse(BaseModel):
    parsed_articles: List[ArticleContentResponse]
    failed_urls: List[ParseError]
    total_requested: int
    total_parsed: int
    total_failed: int
    success_rate: float


class ChunkWithPriority(BaseModel):
    text: str
    word_count: int
    article_index: int
    article_title: str
    keywords: List[str]
    priority: str  # 'low', 'medium', 'high'
    excluded: bool = False

class ModelSettings(BaseModel):
    system_prompt: Optional[str] = "Ты — опытный технический SEO-специалист и копирайтер. Напиши максимально SEO-оптимизированную статью на основе плана. Используй больше технических фактов и цифр. Создай статью с глубокой технической оптимизацией: правильная структура заголовков (H1-H6), оптимальная плотность ключевых слов, семантическая разметка, внутренняя перелинковка. Фокус на техническом SEO без потери читабельности."
    user_prompt: Optional[str] = "Перепиши следующий текст, сделав его уникальным, но сохранив всю важную информацию и смысл:"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2000
    model: Optional[str] = "gpt-4o"
    # Параметры для генерации плана статьи
    plan_temperature: Optional[float] = 0.2
    plan_max_tokens: Optional[int] = 3000
    plan_system_prompt: Optional[str] = "Ты — эксперт по анализу технических текстов. Твоя задача — ПРОЧИТАТЬ и ПРОАНАЛИЗИРОВАТЬ предоставленные фрагменты, а затем создать план статьи.\n\nКРИТИЧЕСКИ ВАЖНО:\n1. СНАЧАЛА прочитай каждый фрагмент внимательно\n2. ВЫДЕЛИ конкретные темы и подтемы в каждом фрагменте\n3. СОЗДАЙ заголовки на основе РЕАЛЬНОГО содержимого\n4. НЕ используй шаблонные заголовки\n\nЗАПРЕЩЕНО:\n❌ \"Введение\", \"Основная часть\", \"Заключение\"\n❌ \"Теоретические основы\", \"Практическое применение\"\n❌ Любые общие заголовки без связи с контентом\n\nОБЯЗАТЕЛЬНО:\n✅ Анализируй конкретные термины и процессы из текста\n✅ Создавай заголовки на основе реальных тем\n✅ Указывай номера фрагментов для каждого раздела"
    plan_user_prompt: Optional[str] = "АНАЛИЗИРУЙ следующие технические фрагменты и создай план статьи.\n\nСНАЧАЛА прочитай каждый фрагмент и выдели конкретные темы.\n\nСОЗДАЙ план с заголовками на основе РЕАЛЬНОГО содержимого фрагментов.\nКаждый заголовок должен отражать конкретную тему из текста.\n\nПРИМЕРЫ правильных заголовков:\n✅ \"Технология холодной высадки метизов\"\n✅ \"Оборудование и этапы процесса\"\n✅ \"Материалы и их свойства\"\n✅ \"Технологические параметры\"\n✅ \"Контроль качества продукции\"\n\nНЕ используй общие заголовки типа \"Введение\" или \"Основная часть\"."

class ArticlePlan(BaseModel):
    plan_text: str        # Текстовый план статьи
    format: str = "text"  # Формат плана

class GenerateRequest(BaseModel):
    topic: str
    source_urls: List[str]
    target_length: Optional[str] = "medium"  # "short", "medium", "long"
    chunk_size: Optional[int] = 800
    enable_cleaning: Optional[bool] = True
    model_settings: Optional[ModelSettings] = None
    chunks_with_priorities: Optional[List[ChunkWithPriority]] = None

class GeneratePlanRequest(BaseModel):
    chunks_with_priorities: List[ChunkWithPriority]
    model_settings: Optional[ModelSettings] = None

class GeneratePlanResponse(BaseModel):
    article_plan: ArticlePlan

# Новые модели для продвинутой логики
class ChunkForAdvancedProcessing(BaseModel):
    text: str
    priority: str  # 'high', 'medium', 'low', 'exclude'

class AdvancedPlanRequest(BaseModel):
    chunks: List[ChunkForAdvancedProcessing]

class AdvancedPlanResponse(BaseModel):
    plan_text: str
    format: str = "text"
    total_chunks_processed: int
    chunks_with_summaries: List[Dict]

# Модели для генерации статьи по плану
class GenerateFromPlanRequest(BaseModel):
    plan_text: str
    keywords: List[str]
    target_length_chars: int
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.5  # Эталонная температура из Jupyter Notebook
    
    # Новые SEO-параметры
    additional_keywords: Optional[str] = ""
    lsi_keywords: Optional[str] = ""
    target_phrases: Optional[str] = ""
    keyword_density: Optional[float] = 2.5
    seo_prompt: Optional[str] = "🔹 УНИВЕРСАЛЬНАЯ SEO-ОПТИМИЗАЦИЯ ДЛЯ ТЕХНИЧЕСКОГО КОНТЕНТА:\n- Создавай экспертный контент с техническими деталями и спецификациями\n- Включай числовые данные, параметры, сравнительные характеристики\n- Используй профессиональную терминологию и отраслевые стандарты\n- Добавляй практические кейсы, примеры применения, результаты тестирования\n- Включай современные технологии, инновации и тренды развития\n- Создавай структурированный контент с логической последовательностью\n- Оптимизируй для поисковых систем с естественным вхождением ключевых слов\n- Включай LSI-ключевые слова и семантически связанные термины\n- Добавляй внутренние ссылки и ссылки на авторитетные источники\n- Создавай контент, отвечающий на поисковые намерения пользователей"
    writing_style: Optional[str] = "technical"
    content_type: Optional[str] = "educational"
    target_audience: Optional[str] = "specialists"
    heading_type: Optional[str] = "h2"
    paragraph_length: Optional[str] = "medium"
    use_lists: Optional[bool] = True
    internal_links: Optional[bool] = False


class GeneratedArticleResponse(BaseModel):
    title: str
    h1: str
    content: str
    meta_description: str
    keywords: str
    article_plan: Optional[ArticlePlan] = None
    word_count: int
    source_chunks_count: int
    source_urls: List[str]


router = APIRouter(prefix="/seo", tags=["SEO Copywriter"])


@router.post("/search", response_model=SearchResponse)
async def search_yandex(request: SearchRequest):
    """
    Выполнить поиск через Yandex Search API
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Поисковый запрос не может быть пустым")
    
    try:
        search_service = YandexSearchService()
        results = search_service.search(request.query, request.page_size, request.region)
        
        response_results = [
            SearchResultResponse(
                title=result.title,
                url=result.url,
                snippet=result.snippet
            )
            for result in results
        ]
        
        return SearchResponse(
            query=request.query,
            results=response_results,
            total_found=len(response_results)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка поиска: {str(e)}")


@router.post("/parse", response_model=ParseResponse)
async def parse_articles(request: ParseRequest):
    """
    Парсинг полного контента статей по списку URL
    """
    if not request.urls:
        raise HTTPException(status_code=400, detail="Список URL не может быть пустым")
    
    if len(request.urls) > 20:
        raise HTTPException(status_code=400, detail="Максимум 20 URL за один запрос")
    
    try:
        # Подготавливаем настройки очистки
        cleaning_settings = {}
        if request.cleaning_settings:
            cleaning_settings = {
                'mode': request.cleaning_settings.mode,
                'remove_technical_blocks': request.cleaning_settings.remove_technical_blocks,
                'remove_duplicates': request.cleaning_settings.remove_duplicates,
                'filter_relevance': request.cleaning_settings.filter_relevance,
                'min_paragraph_length': request.cleaning_settings.min_paragraph_length,
                'max_paragraph_length': request.cleaning_settings.max_paragraph_length,
                'relevance_threshold': request.cleaning_settings.relevance_threshold
            }
        
        parser = ContentParser(
            enable_cleaning=request.enable_cleaning,
            enable_chunking=request.enable_chunking, 
            chunk_size=request.chunk_size,
            cleaning_settings=cleaning_settings
        )
        
        # Парсим статьи и собираем информацию об ошибках
        articles = []
        failed_urls = []
        
        for url in request.urls:
            try:
                article = parser.parse_article(url)
                if article:
                    articles.append(article)
                else:
                    failed_urls.append(ParseError(
                        url=url,
                        error="Не удалось извлечь контент (слишком мало текста или ошибка парсинга)",
                        error_type="content_too_short"
                    ))
            except requests.RequestException as e:
                failed_urls.append(ParseError(
                    url=url,
                    error=f"Ошибка HTTP запроса: {str(e)}",
                    error_type="request_error"
                ))
            except Exception as e:
                failed_urls.append(ParseError(
                    url=url,
                    error=f"Ошибка парсинга: {str(e)}",
                    error_type="parsing_error"
                ))
            
            # Задержка между запросами
            if request.delay and request.delay > 0:
                time.sleep(request.delay)
        
        response_articles = [
            ArticleContentResponse(
                url=article.url,
                title=article.title,
                content=article.content,
                cleaned_content=article.cleaned_content,
                meta_description=article.meta_description,
                word_count=article.word_count,
                cleaned_word_count=article.cleaned_word_count,
                content_stats=article.content_stats,
                chunks=[chunk.to_dict() for chunk in article.chunks],
                chunking_stats=article.chunking_stats
            )
            for article in articles
        ]
        
        total_requested = len(request.urls)
        total_parsed = len(response_articles)
        total_failed = len(failed_urls)
        success_rate = (total_parsed / total_requested) * 100 if total_requested > 0 else 0
        
        return ParseResponse(
            parsed_articles=response_articles,
            failed_urls=failed_urls,
            total_requested=total_requested,
            total_parsed=total_parsed,
            total_failed=total_failed,
            success_rate=success_rate
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка парсинга: {str(e)}")


@router.post("/generate-plan", response_model=GeneratePlanResponse)
async def generate_article_plan(request: GeneratePlanRequest):
    """Генерирует план статьи с использованием новой логики: векторизация → суммаризация → план"""
    print(f"🚀 Запуск генерации плана статьи с новой логикой")
    print(f"📊 Получено чанков: {len(request.chunks_with_priorities)}")
    
    try:
        # Инициализируем OpenAI сервис
        openai_service = OpenAIService()
        
        # Фильтруем чанки (исключаем те, что помечены как excluded или "исключить")
        chunks_for_processing = [chunk for chunk in request.chunks_with_priorities if not chunk.excluded and chunk.priority != "исключить"]
        print(f"📝 Чанков для обработки: {len(chunks_for_processing)}")
        
        # Проверяем приоритеты для отладки
        priority_counts = {}
        for chunk in chunks_for_processing:
            priority_counts[chunk.priority] = priority_counts.get(chunk.priority, 0) + 1
        print(f"📊 Распределение приоритетов: {priority_counts}")
        
        # Шаг 1: Векторизация чанков
        print("🔢 Шаг 1: Векторизация чанков...")
        for i, chunk in enumerate(chunks_for_processing):
            try:
                embedding = await openai_service.embed_chunk(chunk.text)
                print(f"  ✅ Чанк {i+1} ({chunk.priority}): векторизован ({len(embedding)} измерений)")
            except Exception as e:
                print(f"  ⚠️ Ошибка векторизации чанка {i+1}: {str(e)}")
        
        # Шаг 2: Суммаризация по приоритету
        print("📝 Шаг 2: Суммаризация чанков по приоритету...")
        chunks_with_summaries = []
        
        # Маппинг приоритетов с английского на русский (для совместимости с фронтендом)
        priority_mapping = {
            "high": "высокий",
            "medium": "средний", 
            "low": "низкий",
            "exclude": "исключить"
        }
        
        for i, chunk in enumerate(chunks_for_processing):
            try:
                # Конвертируем приоритет в русский формат
                russian_priority = priority_mapping.get(chunk.priority, chunk.priority)
                print(f"  🔄 Обработка чанка {i+1} с приоритетом '{chunk.priority}' -> '{russian_priority}'...")
                
                summary = await openai_service.summarize_with_priority(chunk.text, russian_priority)
                chunks_with_summaries.append({
                    "text": chunk.text,
                    "priority": russian_priority,  # Сохраняем русский приоритет
                    "summary": summary
                })
                print(f"  ✅ Чанк {i+1} ({russian_priority}): {summary[:100]}...")
            except Exception as e:
                print(f"  ⚠️ Ошибка суммаризации чанка {i+1}: {str(e)}")
                # Добавляем чанк без суммарии
                chunks_with_summaries.append({
                    "text": chunk.text,
                    "priority": russian_priority,
                    "summary": f"Ошибка суммаризации: {str(e)}"
                })
        
        # Шаг 3: Генерация плана на основе суммарий
        print("🤖 Шаг 3: Генерация плана статьи...")
        plan_text = await openai_service.generate_article_plan_from_summaries(chunks_with_summaries)
        
        print(f"✅ План статьи сгенерирован: {len(plan_text)} символов")
        print(f"📋 Начало плана: {plan_text[:200]}...")
        
        # Формируем ответ в старом формате для совместимости
        plan_result = {
            "plan_text": plan_text,
            "format": "text"
        }
        
        return GeneratePlanResponse(article_plan=plan_result)
        
    except Exception as e:
        print(f"❌ Ошибка в generate_article_plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка генерации плана: {str(e)}")

@router.post("/generate", response_model=GeneratedArticleResponse)
async def generate_article(request: GenerateRequest):
    """
    Полная генерация статьи: поиск → парсинг → очистка → чанкинг → GPT генерация
    """
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Тема статьи не может быть пустой")
    
    if not request.source_urls:
        raise HTTPException(status_code=400, detail="Необходимо указать хотя бы один URL")
    
    if len(request.source_urls) > 10:
        raise HTTPException(status_code=400, detail="Максимум 10 URL за один запрос")
    
    try:
        print(f"🚀 Запуск полной генерации статьи по теме: {request.topic}")
        
        # Используем предоставленные чанки с приоритетами или получаем их через парсинг
        if request.chunks_with_priorities:
            # Используем чанки с приоритетами из фронтенда
            chunks_with_priorities = request.chunks_with_priorities
            # Фильтруем исключенные чанки
            filtered_chunks = [chunk for chunk in chunks_with_priorities if not chunk.excluded]
            all_chunks = [chunk.text for chunk in filtered_chunks]
            print(f"📊 Используем {len(filtered_chunks)} чанков с приоритетами (исключено: {len(chunks_with_priorities) - len(filtered_chunks)})")
        else:
            # Старый путь: парсинг и чанкинг
            parser = ContentParser(
                enable_cleaning=request.enable_cleaning,
                enable_chunking=True,
                chunk_size=request.chunk_size
            )
            articles = parser.parse_multiple_articles(request.source_urls, delay=1.0)
            
            if not articles:
                raise HTTPException(status_code=404, detail="Не удалось спарсить ни одну статью")
            
            # Собираем все чанки из всех статей
            all_chunks = []
            for article in articles:
                if article.chunks:
                    chunks_content = [chunk.content for chunk in article.chunks]
                    all_chunks.extend(chunks_content)
                else:
                    if article.cleaned_content:
                        all_chunks.append(article.cleaned_content)
            
            if not all_chunks:
                raise HTTPException(status_code=400, detail="Не найден контент для генерации")
            
            print(f"📊 Собрано {len(all_chunks)} чанков для обработки")
        
        # Шаг 3: Генерация плана статьи
        openai_service = OpenAIService()
        model_settings = request.model_settings or ModelSettings()
        
        # Создаем план статьи на основе чанков с приоритетами
        article_plan = None
        if request.chunks_with_priorities:
            chunks_with_priorities = request.chunks_with_priorities
            filtered_chunks = [chunk for chunk in chunks_with_priorities if not chunk.excluded]
            
            # Формируем данные для генерации плана
            chunks_data = []
            for i, chunk in enumerate(filtered_chunks):
                priority_label = "high" if chunk.priority == "high" else "low" if chunk.priority == "low" else "medium"
                chunks_data.append(f"{i+1}: \"{priority_label}: {chunk.text[:200]}...\"")
            
            chunks_with_priority = "\n".join(chunks_data)
            
            # Используем промпты из настроек модели
            plan_prompt = model_settings.plan_user_prompt.format(
                chunks_with_priority=chunks_with_priority,
                theme=request.topic,
                style="информативный, профессиональный"
            )
            
            try:
                plan_response = await openai_service._call_openai(
                    messages=[
                        {"role": "system", "content": model_settings.plan_system_prompt},
                        {"role": "user", "content": plan_prompt}
                    ],
                    temperature=model_settings.plan_temperature,
                    max_tokens=model_settings.plan_max_tokens,
                    model=model_settings.model
                )
                
                # Парсим JSON ответ
                import json
                plan_data = json.loads(plan_response)
                article_plan = ArticlePlan(
                    sections=plan_data.get("sections", []),
                    chunk_mapping={},
                    total_sections=plan_data.get("total_sections", 0)
                )
                
                # Создаем маппинг чанков к разделам
                for section in article_plan.sections:
                    for chunk_num in section.get("chunks", []):
                        if chunk_num - 1 < len(filtered_chunks):
                            article_plan.chunk_mapping[chunk_num - 1] = section["title"]
                
                print(f"📋 План статьи создан: {article_plan.total_sections} разделов")
            except Exception as e:
                print(f"⚠️ Ошибка создания плана статьи: {str(e)}")
                article_plan = None
        
        # Шаг 4: Генерация статьи через OpenAI
        generated_article = await openai_service.generate_article_from_chunks(
            chunks=all_chunks,
            topic=request.topic,
            target_length=request.target_length,
            system_prompt=model_settings.system_prompt,
            user_prompt=model_settings.user_prompt,
            temperature=model_settings.temperature,
            max_tokens=model_settings.max_tokens,
            model=model_settings.model
        )
        
        # Формируем ответ
        response = GeneratedArticleResponse(
            title=generated_article.title,
            h1=generated_article.h1,
            content=generated_article.content,
            meta_description=generated_article.meta_description,
            keywords=generated_article.keywords,
            article_plan=article_plan,
            word_count=generated_article.word_count,
            source_chunks_count=len(all_chunks),
            source_urls=request.source_urls
        )
        
        print(f"✅ Статья успешно сгенерирована: {response.word_count} слов")
        return response
        
    except Exception as e:
        print(f"❌ Ошибка генерации статьи: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка генерации статьи: {str(e)}")


@router.get("/health")
async def health_check():
    """Проверка работоспособности SEO модуля"""
    return {"status": "ok", "module": "SEO Copywriter"}

@router.post("/generate-advanced-plan", response_model=AdvancedPlanResponse)
async def generate_advanced_article_plan(request: AdvancedPlanRequest):
    """
    Генерация плана статьи с использованием продвинутой логики:
    1. Векторизация чанков
    2. Суммаризация по приоритету
    3. Генерация плана на основе суммарий
    """
    print(f"🚀 Запуск продвинутой генерации плана статьи")
    print(f"📊 Получено чанков: {len(request.chunks)}")
    
    try:
        # Инициализируем OpenAI сервис
        openai_service = OpenAIService()
        
        # Фильтруем чанки (исключаем те, что помечены как "exclude" или "исключить")
        chunks_for_processing = [chunk for chunk in request.chunks if chunk.priority not in ["exclude", "исключить"]]
        print(f"📝 Чанков для обработки: {len(chunks_for_processing)}")
        
        # Проверяем приоритеты для отладки
        priority_counts = {}
        for chunk in chunks_for_processing:
            priority_counts[chunk.priority] = priority_counts.get(chunk.priority, 0) + 1
        print(f"📊 Распределение приоритетов: {priority_counts}")
        
        # Шаг 1: Векторизация чанков
        print("🔢 Шаг 1: Векторизация чанков...")
        for i, chunk in enumerate(chunks_for_processing):
            try:
                embedding = await openai_service.embed_chunk(chunk.text)
                print(f"  ✅ Чанк {i+1} ({chunk.priority}): векторизован ({len(embedding)} измерений)")
            except Exception as e:
                print(f"  ⚠️ Ошибка векторизации чанка {i+1}: {str(e)}")
        
        # Шаг 2: Суммаризация по приоритету
        print("📝 Шаг 2: Суммаризация чанков по приоритету...")
        chunks_with_summaries = []
        
        # Маппинг приоритетов с английского на русский (для совместимости с фронтендом)
        priority_mapping = {
            "high": "высокий",
            "medium": "средний", 
            "low": "низкий",
            "exclude": "исключить"
        }
        
        for i, chunk in enumerate(chunks_for_processing):
            try:
                # Конвертируем приоритет в русский формат
                russian_priority = priority_mapping.get(chunk.priority, chunk.priority)
                print(f"  🔄 Обработка чанка {i+1} с приоритетом '{chunk.priority}' -> '{russian_priority}'...")
                
                summary = await openai_service.summarize_with_priority(chunk.text, russian_priority)
                chunks_with_summaries.append({
                    "text": chunk.text,
                    "priority": russian_priority,  # Сохраняем русский приоритет
                    "summary": summary
                })
                print(f"  ✅ Чанк {i+1} ({russian_priority}): {summary[:100]}...")
            except Exception as e:
                print(f"  ⚠️ Ошибка суммаризации чанка {i+1}: {str(e)}")
                # Добавляем чанк без суммарии
                chunks_with_summaries.append({
                    "text": chunk.text,
                    "priority": russian_priority,
                    "summary": f"Ошибка суммаризации: {str(e)}"
                })
        
        # Шаг 3: Генерация плана на основе суммарий
        print("🤖 Шаг 3: Генерация плана статьи...")
        plan_text = await openai_service.generate_article_plan_from_summaries(chunks_with_summaries)
        
        print(f"✅ План статьи сгенерирован: {len(plan_text)} символов")
        print(f"📋 Начало плана: {plan_text[:200]}...")
        
        return AdvancedPlanResponse(
            plan_text=plan_text,
            format="text",
            total_chunks_processed=len(chunks_for_processing),
            chunks_with_summaries=chunks_with_summaries
        )
        
    except Exception as e:
        print(f"❌ Ошибка в generate_advanced_article_plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка генерации плана: {str(e)}")

@router.post("/generate-from-plan", response_model=GeneratedArticleResponse)
async def generate_article_from_plan(request: GenerateFromPlanRequest):
    """
    Генерация статьи на основе редактируемого плана
    """
    print(f"🚀 Генерация статьи на основе плана")
    print(f"📊 Длина плана: {len(request.plan_text)} символов")
    print(f"🎯 Целевая длина: {request.target_length_chars} символов")
    
    try:
        # Инициализируем OpenAI сервис
        openai_service = OpenAIService()
        
        # Генерируем статью на основе плана с новыми SEO-параметрами
        generated_article = await openai_service.generate_full_article_from_plan(
            plan_text=request.plan_text,
            keywords=request.keywords,
            target_length_chars=request.target_length_chars,
            system_prompt=request.system_prompt,
            temperature=request.temperature,
            # Новые SEO-параметры
            additional_keywords=request.additional_keywords,
            lsi_keywords=request.lsi_keywords,
            target_phrases=request.target_phrases,
            keyword_density=request.keyword_density,
            seo_prompt=request.seo_prompt,
            writing_style=request.writing_style,
            content_type=request.content_type,
            target_audience=request.target_audience,
            heading_type=request.heading_type,
            paragraph_length=request.paragraph_length,
            use_lists=request.use_lists,
            internal_links=request.internal_links
        )
        
        # Формируем ответ
        response = GeneratedArticleResponse(
            title=generated_article.title,
            h1=generated_article.h1,
            content=generated_article.content,
            meta_description=generated_article.meta_description,
            keywords=generated_article.keywords,
            article_plan=None,  # Не используем план в ответе
            word_count=generated_article.word_count,
            source_chunks_count=generated_article.source_chunks_count,
            source_urls=[]  # Не используем URL в этом методе
        )
        
        print(f"✅ Статья успешно сгенерирована: {response.word_count} слов")
        return response
        
    except Exception as e:
        print(f"❌ Ошибка генерации статьи: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка генерации статьи: {str(e)}")

@router.post("/generate-from-plan-stream")
async def generate_article_from_plan_stream(request: GenerateFromPlanRequest):
    """Генерирует статью на основе плана с потоковой передачей логов через SSE"""
    
    async def generate_article_with_logs():
        """Генератор для потоковой передачи логов генерации статьи"""
        try:
            # Отправляем начальный лог
            yield f"data: {json.dumps({'log': '🚀 Генерация статьи на основе плана', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            yield f"data: {json.dumps({'log': f'📊 Длина плана: {len(request.plan_text)} символов', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            yield f"data: {json.dumps({'log': f'🎯 Целевая длина: {request.target_length_chars} символов', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            # Инициализируем OpenAI сервис
            openai_service = OpenAIService()
            
            yield f"data: {json.dumps({'log': '🤖 Инициализация OpenAI сервиса...', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            # Генерируем статью на основе плана с новыми SEO-параметрами
            yield f"data: {json.dumps({'log': '📝 Этап 1: Генерация базовой статьи...', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            generated_article = await openai_service.generate_full_article_from_plan(
                plan_text=request.plan_text,
                keywords=request.keywords,
                target_length_chars=request.target_length_chars,
                system_prompt=request.system_prompt,
                temperature=request.temperature,
                # Новые SEO-параметры
                additional_keywords=request.additional_keywords,
                lsi_keywords=request.lsi_keywords,
                target_phrases=request.target_phrases,
                keyword_density=request.keyword_density,
                seo_prompt=request.seo_prompt,
                writing_style=request.writing_style,
                content_type=request.content_type,
                target_audience=request.target_audience,
                heading_type=request.heading_type,
                paragraph_length=request.paragraph_length,
                use_lists=request.use_lists,
                internal_links=request.internal_links
            )
            
            yield f"data: {json.dumps({'log': f'✅ Статья сгенерирована: {generated_article.word_count} слов, {len(generated_article.content)} символов', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            # Формируем ответ
            response = GeneratedArticleResponse(
                title=generated_article.title,
                h1=generated_article.h1,
                content=generated_article.content,
                meta_description=generated_article.meta_description,
                keywords=generated_article.keywords,
                article_plan=None,  # Не используем план в ответе
                word_count=generated_article.word_count,
                source_chunks_count=generated_article.source_chunks_count,
                source_urls=[]  # Не используем URL в этом методе
            )
            
            # Отправляем финальный результат
            yield f"data: {json.dumps({'result': response.dict(), 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            error_msg = f"❌ Ошибка генерации статьи: {str(e)}"
            print(f"❌ Ошибка в SSE потоке: {str(e)}")
            try:
                yield f"data: {json.dumps({'error': error_msg, 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            except Exception as stream_error:
                print(f"❌ Ошибка отправки ошибки в поток: {str(stream_error)}")
                yield f"data: {json.dumps({'error': 'Внутренняя ошибка сервера', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        generate_article_with_logs(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )

@router.post("/generate-plan-stream")
async def generate_article_plan_stream(request: GeneratePlanRequest):
    """Генерирует план статьи с потоковой передачей логов через SSE"""
    
    async def generate_plan_with_logs():
        """Генератор для потоковой передачи логов"""
        try:
            # Отправляем начальный лог
            yield f"data: {json.dumps({'log': '🚀 Запуск генерации плана статьи с новой логикой', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            yield f"data: {json.dumps({'log': f'📊 Получено чанков: {len(request.chunks_with_priorities)}', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            # Инициализируем OpenAI сервис
            openai_service = OpenAIService()
            
            # Фильтруем чанки
            chunks_for_processing = [chunk for chunk in request.chunks_with_priorities if not chunk.excluded and chunk.priority != "исключить"]
            yield f"data: {json.dumps({'log': f'📝 Чанков для обработки: {len(chunks_for_processing)}', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            # Проверяем приоритеты для отладки
            priority_counts = {}
            for chunk in chunks_for_processing:
                priority_counts[chunk.priority] = priority_counts.get(chunk.priority, 0) + 1
            yield f"data: {json.dumps({'log': f'📊 Распределение приоритетов: {priority_counts}', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            # Шаг 1: Векторизация чанков
            yield f"data: {json.dumps({'log': '🔢 Шаг 1: Векторизация чанков...', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            for i, chunk in enumerate(chunks_for_processing):
                try:
                    embedding = await openai_service.embed_chunk(chunk.text)
                    yield f"data: {json.dumps({'log': f'  ✅ Чанк {i+1} ({chunk.priority}): векторизован ({len(embedding)} измерений)', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.1)
                except Exception as e:
                    yield f"data: {json.dumps({'log': f'  ⚠️ Ошибка векторизации чанка {i+1}: {str(e)}', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.1)
            
            # Шаг 2: Суммаризация по приоритету
            yield f"data: {json.dumps({'log': '📝 Шаг 2: Суммаризация чанков по приоритету...', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            chunks_with_summaries = []
            priority_mapping = {
                "high": "высокий",
                "medium": "средний", 
                "low": "низкий",
                "exclude": "исключить"
            }
            
            for i, chunk in enumerate(chunks_for_processing):
                try:
                    russian_priority = priority_mapping.get(chunk.priority, chunk.priority)
                    yield f"data: {json.dumps({'log': f'  🔄 Обработка чанка {i+1} с приоритетом \'{chunk.priority}\' -> \'{russian_priority}\'...', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.1)
                    
                    summary = await openai_service.summarize_with_priority(chunk.text, russian_priority)
                    chunks_with_summaries.append({
                        "text": chunk.text,
                        "priority": russian_priority,
                        "summary": summary
                    })
                    yield f"data: {json.dumps({'log': f'  ✅ Чанк {i+1} ({russian_priority}): {summary[:100]}...', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.1)
                except Exception as e:
                    yield f"data: {json.dumps({'log': f'  ⚠️ Ошибка суммаризации чанка {i+1}: {str(e)}', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.1)
                    chunks_with_summaries.append({
                        "text": chunk.text,
                        "priority": russian_priority,
                        "summary": f"Ошибка суммаризации: {str(e)}"
                    })
            
            # Шаг 3: Генерация плана на основе суммарий
            yield f"data: {json.dumps({'log': '🤖 Шаг 3: Генерация плана статьи...', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            plan_text = await openai_service.generate_article_plan_from_summaries(chunks_with_summaries)
            
            yield f"data: {json.dumps({'log': f'✅ План статьи сгенерирован: {len(plan_text)} символов', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            yield f"data: {json.dumps({'log': f'📋 Начало плана: {plan_text[:200]}...', 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0.1)
            
            # Отправляем финальный результат
            plan_result = {
                "plan_text": plan_text,
                "format": "text"
            }
            yield f"data: {json.dumps({'result': plan_result, 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            error_msg = f"❌ Ошибка в generate_article_plan: {str(e)}"
            yield f"data: {json.dumps({'error': error_msg, 'timestamp': datetime.now().isoformat()}, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        generate_plan_with_logs(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )


# ============================================================================
# ЭНДПОИНТЫ ДЛЯ ПРОВЕРКИ SEO-КАЧЕСТВА ЧЕРЕЗ TEXT.RU API
# ============================================================================

class SeoQualityCheckRequest(BaseModel):
    """Запрос на проверку SEO-качества текста"""
    text: str
    max_wait_time: Optional[int] = 120  # Максимальное время ожидания в секундах


class SeoQualityMetrics(BaseModel):
    """Метрики SEO-качества текста"""
    uniqueness: float  # Уникальность в процентах (100% - водность)
    water_percent: float  # Процент воды
    spam_percent: float  # Процент заспамленности
    char_count: int  # Количество символов
    word_count: int  # Количество слов
    spell_errors: int  # Количество ошибок правописания (не поддерживается text.ru)


class SeoQualityResponse(BaseModel):
    """Ответ с результатами проверки SEO-качества"""
    status: str  # "success", "error", "timeout"
    ready: bool
    metrics: Optional[SeoQualityMetrics] = None
    keywords: List[Dict[str, object]] = []  # Топ ключевых слов
    spell_check: List[Dict[str, object]] = []  # Ошибки правописания
    error_code: Optional[str] = None
    error_desc: Optional[str] = None


@router.post("/check-seo-quality", response_model=SeoQualityResponse)
async def check_seo_quality(request: SeoQualityCheckRequest):
    """
    Проверяет SEO-качество сгенерированного текста через API text.ru
    
    Проверяет:
    - Уникальность текста
    - Процент воды и заспамленности
    - Количество символов и слов
    - Ошибки правописания
    - Ключевые слова
    """
    try:
        # Получаем API ключ из переменных окружения
        import os
        text_ru_api_key = os.getenv("TEXT_RU_API_KEY", "ff355ac3b34a87295a0b78617a407477")
        
        # Инициализируем сервис
        text_ru_service = TextRuService(text_ru_api_key)
        
        # Проверяем баланс
        balance = text_ru_service.get_balance()
        if balance <= 0:
            return SeoQualityResponse(
                status="error",
                ready=False,
                error_code="no_balance",
                error_desc="Недостаточно символов на балансе text.ru"
            )
        
        # Проверяем длину текста
        if len(request.text) < 100:
            return SeoQualityResponse(
                status="error",
                ready=False,
                error_code="text_too_short",
                error_desc="Текст должен содержать минимум 100 символов"
            )
        
        if len(request.text) > 150000:
            return SeoQualityResponse(
                status="error",
                ready=False,
                error_code="text_too_long",
                error_desc="Текст не должен превышать 150000 символов"
            )
        
        # Выполняем полную проверку качества
        results = text_ru_service.check_text_quality(request.text, request.max_wait_time)
        
        if results['status'] == 'error':
            return SeoQualityResponse(
                status="error",
                ready=False,
                error_code=results.get('error_code', 'unknown'),
                error_desc=results.get('error_desc', 'Неизвестная ошибка')
            )
        
        if results['status'] == 'timeout':
            return SeoQualityResponse(
                status="timeout",
                ready=False,
                error_code="timeout",
                error_desc=f"Превышено время ожидания ({request.max_wait_time}с)"
            )
        
        if results['status'] == 'pending':
            return SeoQualityResponse(
                status="pending",
                ready=False,
                error_code="pending",
                error_desc="Результаты еще не готовы, попробуйте позже"
            )
        
        # Форматируем результаты
        formatted_results = text_ru_service.format_seo_results(results)
        
        if formatted_results['status'] == 'success':
            summary = formatted_results['summary']
            details = formatted_results['details']
            
            # Создаем список ключевых слов из SEO-анализа
            keywords = []
            for keyword_info in details.get('keywords', []):
                keywords.append({
                    'keyword': keyword_info['keyword'],
                    'count': keyword_info['count']
                })
            
            return SeoQualityResponse(
                status="success",
                ready=True,
                metrics=SeoQualityMetrics(
                    uniqueness=summary['uniqueness'],
                    water_percent=summary['water_percent'],
                    spam_percent=summary['spam_percent'],
                    char_count=summary['char_count'],
                    word_count=summary['word_count'],
                    spell_errors=0  # text.ru не предоставляет данные о правописании
                ),
                keywords=keywords,
                spell_check=[]  # text.ru не предоставляет данные о правописании
            )
        else:
            return SeoQualityResponse(
                status="error",
                ready=False,
                error_code="format_error",
                error_desc="Ошибка форматирования результатов"
            )
            
    except Exception as e:
        return SeoQualityResponse(
            status="error",
            ready=False,
            error_code="exception",
            error_desc=f"Ошибка сервера: {str(e)}"
        )


@router.get("/text-ru-balance")
async def get_text_ru_balance():
    """
    Получает остаток символов на балансе text.ru
    """
    try:
        import os
        
        text_ru_api_key = os.getenv("TEXT_RU_API_KEY", "ff355ac3b34a87295a0b78617a407477")
        text_ru_service = TextRuService(text_ru_api_key)
        
        balance = text_ru_service.get_balance()
        
        return {
            "status": "success",
            "balance": balance,
            "balance_formatted": f"{balance:,}".replace(",", " ")
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "balance": 0
        }