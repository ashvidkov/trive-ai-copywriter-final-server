# 🚀 Руководство по развертыванию TRIVE AI-Копирайтер на сервер

## 📋 Обзор

Данное руководство описывает процесс развертывания проекта TRIVE AI-Копирайтер на Linux-сервер через SSH. Проект состоит из трех компонентов:

- **Frontend** (React + Vite) - порт 3000
- **Backend API** (Node.js + Express) - порт 4000  
- **AI Assistant API** (Python + FastAPI) - порт 8001

## 🔧 Требования к серверу

### Минимальные требования:
- **ОС**: Ubuntu 20.04+ или Debian 11+
- **RAM**: 2 GB
- **CPU**: 1 ядро
- **Диск**: 10 GB свободного места
- **Сеть**: Доступ к интернету

### Рекомендуемые требования:
- **ОС**: Ubuntu 22.04 LTS
- **RAM**: 4 GB
- **CPU**: 2 ядра
- **Диск**: 20 GB SSD
- **Сеть**: Статический IP

## 📦 Подготовка к развертыванию

### 1. Подготовка локального проекта

Убедитесь, что у вас есть:
- SSH-ключи для доступа к серверу
- IP-адрес или доменное имя сервера
- Доступ к серверу с правами sudo

### 2. Проверка файлов проекта

Убедитесь, что в проекте присутствуют:
```
ai_copywrigt_trive/
├── frontend/package.json
├── backend/package.json  
├── ai_backend/requirements.txt
├── deploy.sh
└── server-setup.sh
```

## 🛠️ Пошаговое развертывание

### Шаг 1: Первоначальная настройка сервера

**Выполните на сервере:**

```bash
# Подключение к серверу
ssh user@your-server.com

# Загрузка скрипта настройки
wget https://raw.githubusercontent.com/your-repo/ai_copywrigt_trive/main/server-setup.sh
chmod +x server-setup.sh
./server-setup.sh
```

**Или выполните вручную:**

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install -y curl wget git nginx postgresql postgresql-contrib \
    python3 python3-pip python3-venv nodejs npm build-essential \
    certbot python3-certbot-nginx htop nano ufw

# Настройка PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Создание базы данных
sudo -u postgres psql << EOF
CREATE DATABASE trive_db;
CREATE USER trive_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE trive_db TO trive_user;
\q
EOF

# Настройка firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

### Шаг 2: Настройка переменных окружения

**Создайте файлы .env на сервере:**

```bash
# Backend .env
sudo nano /var/www/.env.backend
```

Содержимое:
```env
NODE_ENV=production
PORT=4000
JWT_SECRET=your_very_secure_jwt_secret_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trive_db
DB_USER=trive_user
DB_PASSWORD=your_secure_password
```

```bash
# AI Backend .env
sudo nano /var/www/.env.ai
```

Содержимое:
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Шаг 3: Развертывание проекта

**Выполните на локальной машине:**

```bash
# Сделайте скрипт исполняемым
chmod +x deploy.sh

# Запустите развертывание
./deploy.sh user@your-server.com /var/www
```

**Или выполните вручную:**

```bash
# Создание архива проекта
tar --exclude='node_modules' --exclude='venv' --exclude='.git' \
    -czf ai_copywrigt_trive.tar.gz .

# Загрузка на сервер
scp ai_copywrigt_trive.tar.gz user@your-server.com:/tmp/

# Подключение к серверу и установка
ssh user@your-server.com << 'EOF'
cd /var/www
tar -xzf /tmp/ai_copywrigt_trive.tar.gz
rm /tmp/ai_copywrigt_trive.tar.gz

# Установка Python зависимостей
cd ai_backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Установка Node.js зависимостей
cd ../backend
npm install

cd ../frontend
npm install
npm run build
EOF
```

### Шаг 4: Настройка systemd сервисов

**Создайте файлы сервисов:**

```bash
# Backend сервис
sudo nano /etc/systemd/system/trive-backend.service
```

Содержимое:
```ini
[Unit]
Description=TRIVE Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ai_copywrigt_trive/backend
Environment=NODE_ENV=production
Environment=PORT=4000
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# AI сервис
sudo nano /etc/systemd/system/trive-ai.service
```

Содержимое:
```ini
[Unit]
Description=TRIVE AI Assistant API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ai_copywrigt_trive/ai_backend
Environment=PATH=/var/www/ai_copywrigt_trive/ai_backend/venv/bin
ExecStart=/var/www/ai_copywrigt_trive/ai_backend/venv/bin/python -m uvicorn ai_backend.main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Frontend сервис
sudo nano /etc/systemd/system/trive-frontend.service
```

Содержимое:
```ini
[Unit]
Description=TRIVE Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ai_copywrigt_trive/frontend
ExecStart=/usr/bin/npx serve -s dist -l 3000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Шаг 5: Настройка Nginx

**Создайте конфигурацию Nginx:**

```bash
sudo nano /etc/nginx/sites-available/trive
```

Содержимое:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Замените на ваш домен

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # AI API
    location /generate/ {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Активируйте конфигурацию:**

```bash
sudo ln -sf /etc/nginx/sites-available/trive /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Шаг 6: Запуск сервисов

```bash
# Перезагрузка systemd
sudo systemctl daemon-reload

# Включение автозапуска
sudo systemctl enable trive-backend
sudo systemctl enable trive-ai
sudo systemctl enable trive-frontend

# Запуск сервисов
sudo systemctl start trive-backend
sudo systemctl start trive-ai
sudo systemctl start trive-frontend

# Проверка статуса
sudo systemctl status trive-backend
sudo systemctl status trive-ai
sudo systemctl status trive-frontend
```

### Шаг 7: Настройка SSL (опционально)

```bash
# Установка SSL сертификата
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление
sudo crontab -e
# Добавьте строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔍 Проверка развертывания

### Проверка сервисов:

```bash
# Статус всех сервисов
sudo systemctl status trive-backend trive-ai trive-frontend nginx postgresql

# Проверка портов
sudo netstat -tlnp | grep -E ':(3000|4000|8001|80|443)'

# Логи сервисов
sudo journalctl -u trive-backend -f
sudo journalctl -u trive-ai -f
sudo journalctl -u trive-frontend -f
```

### Проверка API:

```bash
# Backend API
curl http://your-domain.com/api/themes

# AI API
curl -X POST http://your-domain.com/generate/ \
  -H "Content-Type: application/json" \
  -d '{"raw_text": "Тестовый текст"}'
```

## 🛠️ Управление сервисами

### Основные команды:

```bash
# Запуск всех сервисов
sudo systemctl start trive-backend trive-ai trive-frontend

# Остановка всех сервисов
sudo systemctl stop trive-backend trive-ai trive-frontend

# Перезапуск всех сервисов
sudo systemctl restart trive-backend trive-ai trive-frontend

# Просмотр логов
sudo journalctl -u trive-backend -f
sudo journalctl -u trive-ai -f
sudo journalctl -u trive-frontend -f
```

### Обновление приложения:

```bash
# Остановка сервисов
sudo systemctl stop trive-backend trive-ai trive-frontend

# Обновление кода (если используете git)
cd /var/www/ai_copywrigt_trive
git pull origin main

# Обновление зависимостей
cd ai_backend && source venv/bin/activate && pip install -r requirements.txt
cd ../backend && npm install
cd ../frontend && npm install && npm run build

# Запуск сервисов
sudo systemctl start trive-backend trive-ai trive-frontend
```

## 💾 Резервное копирование

### Создание бэкапа:

```bash
# Бэкап базы данных
pg_dump -h localhost -U trive_user -d trive_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Бэкап файлов
tar -czf trive_files_$(date +%Y%m%d_%H%M%S).tar.gz /var/www/ai_copywrigt_trive
```

### Восстановление:

```bash
# Восстановление базы данных
psql -h localhost -U trive_user -d trive_db < backup_file.sql

# Восстановление файлов
tar -xzf trive_files_backup.tar.gz -C /
```

## 🔧 Устранение неполадок

### Частые проблемы:

1. **Сервис не запускается:**
   ```bash
   sudo journalctl -u trive-backend -n 50
   sudo systemctl status trive-backend
   ```

2. **Проблемы с базой данных:**
   ```bash
   sudo systemctl status postgresql
   sudo -u postgres psql -d trive_db
   ```

3. **Проблемы с Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Проблемы с портами:**
   ```bash
   sudo netstat -tlnp | grep -E ':(3000|4000|8001)'
   sudo lsof -i :3000
   ```

### Логи для отладки:

```bash
# Nginx логи
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Systemd логи
sudo journalctl -u trive-backend -f
sudo journalctl -u trive-ai -f
sudo journalctl -u trive-frontend -f

# PostgreSQL логи
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи сервисов
2. Убедитесь, что все порты открыты
3. Проверьте права доступа к файлам
4. Убедитесь, что переменные окружения настроены правильно

## 🎯 Результат

После успешного развертывания у вас будет:

- **Frontend**: http://your-domain.com
- **Backend API**: http://your-domain.com/api/
- **AI API**: http://your-domain.com/generate/
- **API Documentation**: http://your-domain.com/api/docs

Все сервисы будут автоматически запускаться при перезагрузке сервера и перезапускаться при сбоях. 