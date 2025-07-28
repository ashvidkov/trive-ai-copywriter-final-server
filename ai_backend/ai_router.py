from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ai_backend.assistant_core import generate_full_output
from typing import Dict

router = APIRouter()

class TextIn(BaseModel):
    raw_text: str = Field(..., description="Исходный текст статьи для уникализации")

class TextOut(BaseModel):
    result: str
    title: str
    h1: str
    meta_description: str
    keywords: str

@router.post("/generate/", response_model=TextOut, summary="AI-уникализация и SEO-генерация", tags=["AI"])
async def generate_article(data: TextIn) -> Dict[str, str]:
    if not data.raw_text or not data.raw_text.strip():
        raise HTTPException(status_code=400, detail="Поле raw_text не должно быть пустым")
    try:
        result = await generate_full_output(data.raw_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation error: {str(e)}") 