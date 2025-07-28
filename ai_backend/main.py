from dotenv import load_dotenv
load_dotenv()

# import os
# print("OPENAI_API_KEY:", os.getenv("OPENAI_API_KEY"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ai_backend.ai_router import router as ai_router
import uvicorn

app = FastAPI(title="TRIVE AI Assistant API")

# Разрешаем CORS для фронта (и любых источников на время разработки)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Можно заменить на ["http://localhost:5173"] для безопасности
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router, prefix="/ai")

# Для локального запуска через python main.py
if __name__ == "__main__":
    uvicorn.run("ai_backend.main:app", host="0.0.0.0", port=8001, reload=True) 