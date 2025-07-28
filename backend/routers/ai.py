from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from backend.services.assistant_core import generate_full_output
from typing import Dict

router = APIRouter()

# Pydantic-модель для входных данных
class TextIn(BaseModel):
    raw_text: str = Field(..., description="Исходный текст статьи для уникализации")

# Pydantic-модель для ответа (для автодокументации)
class TextOut(BaseModel):
    result: str
    title: str
    h1: str
    meta_description: str
    keywords: str

@router.post("/generate/", response_model=TextOut, summary="AI-уникализация и SEO-генерация", tags=["AI"])
async def generate_article(data: TextIn) -> Dict[str, str]:
    """
    Принимает исходный текст статьи, возвращает уникализированный текст и SEO-поля.
    Используется в EditorPage для автозаполнения полей после нажатия кнопки "Уникализировать".
    """
    if not data.raw_text or not data.raw_text.strip():
        raise HTTPException(status_code=400, detail="Поле raw_text не должно быть пустым")
    try:
        result = await generate_full_output(data.raw_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation error: {str(e)}") 