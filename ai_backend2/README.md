# TRIVE SEO Copywriter - Модуль поиска и генерации контента

## 🎯 Описание
Модуль SEO Copywriter интегрирует логику поиска через Yandex Search API в проект TRIVE. Выполняет поиск исходных данных для создания SEO-оптимизированного контента.

## 🗂 Структура файлов
```
ai_backend2/
├── main.py                    # FastAPI приложение
├── seo_router.py             # API роутеры
├── yandex_auth.py            # Сервис аутентификации Yandex
├── search_service.py         # Сервис поиска
├── authorized_key_yandex.json # Ключи Yandex API
├── requirements.txt          # Зависимости Python
├── start_seo_server.py       # Скрипт запуска сервера
└── README.md                 # Этот файл
```

## 🚀 Запуск сервера

### 1. Установка зависимостей
```bash
cd ai_backend2
pip install -r requirements.txt
```

### 2. Запуск сервера
```bash
python start_seo_server.py
```

Или напрямую через uvicorn:
```bash
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

### 3. Проверка работы
- API документация: http://localhost:8002/docs
- Проверка здоровья: http://localhost:8002/seo/health

## 🔧 API Эндпоинты

### POST /seo/search
Выполняет поиск через Yandex Search API

**Запрос:**
```json
{
  "query": "холодная высадка",
  "page_size": 10
}
```

**Ответ:**
```json
{
  "query": "холодная высадка",
  "results": [
    {
      "title": "Заголовок статьи",
      "url": "https://example.com",
      "snippet": "Описание статьи..."
    }
  ],
  "total_found": 10
}
```

### GET /seo/health
Проверка работоспособности модуля

## 🔑 Аутентификация
Модуль использует Service Account ключи Yandex Cloud из файла `authorized_key_yandex.json` для:
1. Генерации JWT токена
2. Получения IAM токена
3. Доступа к Yandex Search API

## 🖥️ Frontend интеграция
Frontend страница доступна по адресу: http://localhost:3000/seo-copywriter

## 📋 Функциональность
- ✅ Поиск через Yandex Search API
- ✅ Парсинг и обработка результатов
- ✅ Извлечение заголовков и описаний с сайтов
- ✅ Выбор результатов через чекбоксы
- 🔄 Постраничная навигация (в планах)
- 🔄 Генерация статей по выбранным результатам (в планах)

## 🔗 Связь с основным проектом
Модуль интегрирован в общую архитектуру TRIVE:
- Frontend: React страница `/seo-copywriter`
- Backend: FastAPI сервер на порту 8002
- Навигация: добавлена в Header компонент

## 🛠️ Разработка
Для разработки используйте флаг `--reload` при запуске сервера для автоматической перезагрузки при изменении кода.