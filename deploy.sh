#!/bin/bash

# Скрипт автоматического развертывания TRIVE AI-Копирайтер на сервер
# Использование: ./deploy.sh user@server.com /path/to/project

set -e  # Остановка при ошибке

# Проверка аргументов
if [ $# -ne 2 ]; then
    echo "Использование: $0 user@server.com /path/to/project"
    echo "Пример: $0 root@myserver.com /var/www/trive"
    exit 1
fi

SERVER=$1
PROJECT_PATH=$2
PROJECT_NAME="ai_copywrigt_trive"

echo "🚀 Начинаем развертывание TRIVE AI-Копирайтер на $SERVER"
echo "📁 Путь на сервере: $PROJECT_PATH"

# 1. Создание архива проекта (исключая node_modules и venv)
echo "📦 Создаем архив проекта..."
tar --exclude='node_modules' --exclude='venv' --exclude='.git' --exclude='*.log' \
    -czf ${PROJECT_NAME}.tar.gz .

# 2. Загрузка архива на сервер
echo "📤 Загружаем архив на сервер..."
scp ${PROJECT_NAME}.tar.gz $SERVER:/tmp/

# 3. Выполнение команд на сервере
echo "🔧 Выполняем установку на сервере..."
ssh $SERVER << EOF
    set -e
    
    echo "📂 Создаем директорию проекта..."
    sudo mkdir -p $PROJECT_PATH
    sudo chown \$(whoami):\$(whoami) $PROJECT_PATH
    
    echo "📦 Распаковываем проект..."
    cd $PROJECT_PATH
    tar -xzf /tmp/${PROJECT_NAME}.tar.gz
    
    echo "🧹 Очищаем временные файлы..."
    rm /tmp/${PROJECT_NAME}.tar.gz
    
    echo "🐍 Устанавливаем Python зависимости..."
    cd ai_backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    
    echo "📦 Устанавливаем Node.js зависимости для backend..."
    cd ../backend
    npm install
    
    echo "📦 Устанавливаем Node.js зависимости для frontend..."
    cd ../frontend
    npm install
    
    echo "🏗️ Собираем frontend..."
    npm run build
    
    echo "🔧 Создаем systemd сервисы..."
    sudo tee /etc/systemd/system/trive-backend.service > /dev/null << 'SERVICE'
[Unit]
Description=TRIVE Backend API
After=network.target

[Service]
Type=simple
User=\$(whoami)
WorkingDirectory=$PROJECT_PATH/backend
Environment=NODE_ENV=production
Environment=PORT=4000
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

    sudo tee /etc/systemd/system/trive-ai.service > /dev/null << 'SERVICE'
[Unit]
Description=TRIVE AI Assistant API
After=network.target

[Service]
Type=simple
User=\$(whoami)
WorkingDirectory=$PROJECT_PATH/ai_backend
Environment=PATH=$PROJECT_PATH/ai_backend/venv/bin
ExecStart=$PROJECT_PATH/ai_backend/venv/bin/python -m uvicorn ai_backend.main:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

    sudo tee /etc/systemd/system/trive-frontend.service > /dev/null << 'SERVICE'
[Unit]
Description=TRIVE Frontend
After=network.target

[Service]
Type=simple
User=\$(whoami)
WorkingDirectory=$PROJECT_PATH/frontend
ExecStart=/usr/bin/npx serve -s dist -l 3000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

    echo "🔄 Перезагружаем systemd..."
    sudo systemctl daemon-reload
    
    echo "🚀 Запускаем сервисы..."
    sudo systemctl enable trive-backend
    sudo systemctl enable trive-ai
    sudo systemctl enable trive-frontend
    
    sudo systemctl start trive-backend
    sudo systemctl start trive-ai
    sudo systemctl start trive-frontend
    
    echo "✅ Проверяем статус сервисов..."
    sudo systemctl status trive-backend --no-pager
    sudo systemctl status trive-ai --no-pager
    sudo systemctl status trive-frontend --no-pager
    
    echo "🌐 Настройка Nginx..."
    sudo tee /etc/nginx/sites-available/trive > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # AI API
    location /generate/ {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

    sudo ln -sf /etc/nginx/sites-available/trive /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    
    echo "🎉 Развертывание завершено!"
    echo "📱 Frontend: http://$(hostname -I | awk '{print $1}')"
    echo "🔧 Backend API: http://$(hostname -I | awk '{print $1}'):4000"
    echo "🤖 AI API: http://$(hostname -I | awk '{print $1}'):8001"
    echo "📚 API Docs: http://$(hostname -I | awk '{print $1}'):4000/api/docs"
EOF

# 4. Очистка локального архива
echo "🧹 Очищаем локальные файлы..."
rm ${PROJECT_NAME}.tar.gz

echo "✅ Развертывание завершено успешно!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Настройте .env файлы на сервере"
echo "2. Настройте базу данных PostgreSQL"
echo "3. Проверьте работу всех сервисов"
echo ""
echo "🔧 Полезные команды для управления:"
echo "sudo systemctl status trive-backend"
echo "sudo systemctl status trive-ai"
echo "sudo systemctl status trive-frontend"
echo "sudo systemctl restart trive-backend"
echo "sudo journalctl -u trive-backend -f" 