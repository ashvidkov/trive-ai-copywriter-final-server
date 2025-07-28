import os
import re
from typing import List, Dict
from openai import AsyncOpenAI

# Получаем ключ из переменной окружения
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# Разбивка текста на чанки
async def split_text(text: str, max_length: int = 400) -> List[str]:
    sentences = re.split(r'(?<=[.!?]) +', text)
    chunks, chunk = [], ""
    for sentence in sentences:
        if len(chunk) + len(sentence) <= max_length:
            chunk += sentence + " "
        else:
            chunks.append(chunk.strip())
            chunk = sentence + " "
    if chunk:
        chunks.append(chunk.strip())
    return chunks

# Уникализация чанка (async)
async def rewrite_chunk(chunk: str) -> str:
    system_prompt = (
        "Ты — опытный SEO-копирайтер и редактор с инженерным уклоном. Твоя задача — глубоко перерабатывать входные статьи, сохраняя их смысл, но полностью уникализируя структуру, лексику и стилистику. Все тексты должны быть написаны живым, дружелюбным и профессиональным языком. Убирай шаблонные фразы, повторения и лишнюю «водность». Подходи к задаче как редактор, который улучшает под SEO, поднимает читабельность и оптимизирует текст под конкретную тематику без использования HTML. Ты не фантазируешь — ты качественно редактируешь и улучшаешь."
    )
    user_prompt = f"Переработай следующий фрагмент: \n{chunk}\n Сделай его уникальным, живым, логичным, грамотным и адаптированным под SEO. Избавься от лишнего, усили смысл, убери канцеляризмы и повторения. Не добавляй HTML — только чистый текст."
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.6,
            max_tokens=1000
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"[Ошибка: {str(e)}]"

# Микроассистент: Title
async def generate_title(text: str) -> str:
    system_prompt = (
        "Ты — SEO-специалист, который формирует мета-заголовки для поисковых систем. Твоя задача — придумать цепляющий, релевантный и лаконичный title, который отражает суть статьи и содержит ключевые слова. Общая длина — до 70 символов. Никаких лишних слов. Без кавычек, без точек в конце. Без повторов H1. Не используй слова вроде 'Статья', 'Обзор', 'Подробно о'."
    )
    user_prompt = (
        f"На основе этой статьи создай SEO-заголовок (title), который улучшает кликабельность в поиске и отражает суть содержания:\n\n{text}"
    )
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.4,
        max_tokens=50
    )
    return response.choices[0].message.content.strip()

# Микроассистент: Description
async def generate_description(text: str) -> str:
    system_prompt = (
        "Ты — SEO-редактор, который составляет мета-описания для выдачи в поиске (description). Твоя задача — сформулировать короткое, информативное, привлекательное описание (до 160 символов), которое вызывает интерес к чтению статьи и содержит ключевые фразы. Оно не должно повторять title или первую строку статьи. Без HTML, кавычек и точек в конце. Стиль — дружелюбный, точный, написанный с учётом реальной поисковой выдачи."
    )
    user_prompt = (
        f"Сформируй мета-описание (description) этой статьи для поисковой выдачи. Уложись в 160 символов, избегай повторов, используй ключевые слова и добавь пользу:\n\n{text}"
    )
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.3,
        max_tokens=100
    )
    return response.choices[0].message.content.strip()

# Микроассистент: Keywords
async def generate_keywords(text: str) -> str:
    system_prompt = (
        "Ты — SEO-оптимизатор, который составляет список ключевых слов и фраз для статьи. Твоя задача — выделить из текста 5–8 ключевых слов и основных коротких ключевых фраз. Они должны соответствовать реальным поисковым запросам, быть конкретными, не общими. Результат — одна строка, ключевые фразы через запятую. Никаких заголовков, кавычек, пунктов списка или пояснений."
    )
    user_prompt = (
        f"Извлеки 5–8 ключевых слов и основных коротких ключевых фраз из следующего текста. Укажи их через запятую. Это должны быть реальные поисковые запросы по теме:\n\n{text}"
    )
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.2,
        max_tokens=60
    )
    # Обрезаем результат до 255 символов
    return response.choices[0].message.content.strip()[:255]

# Микроассистент: H1
async def generate_h1(text: str) -> str:
    system_prompt = (
        "Ты — копирайтер с сильной SEO-компетенцией. Твоя задача — придумать один H1-заголовок для статьи, который:\n- логично и ёмко передаёт суть контента;\n- включает ключевую фразу или тему статьи;\n- интересен читателю и по возможности кликабелен;\n- не повторяет Title, но хорошо его дополняет.\nИзбегай знаков препинания в конце, не превышай 80 символов. Без лишнего пафоса и штампов."
    )
    user_prompt = (
        f"Создай привлекательный, логичный и релевантный H1-заголовок для следующей статьи. Он должен быть ёмким и содержать основную тему:\n\n{text}"
    )
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.5,
        max_tokens=50
    )
    return response.choices[0].message.content.strip()

# Главная функция: генерация полного результата
async def generate_full_output(text: str) -> Dict[str, str]:
    chunks = await split_text(text)
    rewritten_chunks = []
    for ch in chunks:
        rewritten = await rewrite_chunk(ch)
        rewritten_chunks.append(rewritten)
    final_text = "\n\n".join(rewritten_chunks)
    title = await generate_title(final_text)
    h1 = await generate_h1(final_text)
    meta_description = await generate_description(final_text)
    keywords = await generate_keywords(final_text)
    return {
        "result": final_text,
        "title": title,
        "h1": h1,
        "meta_description": meta_description,
        "keywords": keywords
    } 