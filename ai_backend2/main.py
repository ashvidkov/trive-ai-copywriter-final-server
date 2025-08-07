"""
FastAPI приложение для SEO Copywriter модуля
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from seo_router import router as seo_router

app = FastAPI(
    title="TRIVE SEO Copywriter API",
    description="API для модуля SEO Copywriter - поиск и генерация контента",
    version="1.0.0"
)

# Увеличиваем лимиты для больших статей
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем все origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

# CORS middleware для frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем все origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(seo_router, prefix="/seo", tags=["SEO Copywriter"])

@app.get("/")
async def root():
    return {"message": "TRIVE SEO Copywriter API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
