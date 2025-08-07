#!/usr/bin/env python3
"""
Скрипт запуска SEO Copywriter сервера
"""

import uvicorn
import sys
import os

# Загружаем переменные окружения из .env файла
try:
    from dotenv import load_dotenv
    # Загружаем .env из корневой папки проекта
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    load_dotenv(env_path)
    print(f"✅ Переменные окружения загружены из .env файла: {env_path}")
except ImportError:
    print("⚠️ python-dotenv не установлен. Для загрузки .env установите: pip install python-dotenv")

# Добавляем текущую директорию в PATH для импортов
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("🚀 Запуск TRIVE SEO Copywriter API сервера...")
    print("📍 Сервер будет доступен по адресу: http://localhost:8002")
    print("📖 Документация API: http://localhost:8002/docs")
    print("🔧 Для остановки нажмите Ctrl+C")
    print("-" * 50)
    
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8002, 
        reload=True,
        log_level="info",
        timeout_keep_alive=300,  # Увеличиваем keep-alive timeout
        limit_concurrency=100,   # Увеличиваем лимит одновременных соединений
        limit_max_requests=1000  # Увеличиваем лимит запросов
    )