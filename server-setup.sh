#!/bin/bash

# Скрипт первоначальной настройки сервера для TRIVE AI-Копирайтер
# Выполняется один раз на новом сервере

set -e

echo "🔧 Начинаем настройку сервера для TRIVE AI-Копирайтер..."

# Обновление системы
echo "📦 Обновляем систему..."
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
echo "📦 Устанавливаем необходимые пакеты..."
sudo apt install -y \
    curl \
    wget \
    git \
    nginx \
    postgresql \
    postgresql-contrib \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    build-essential \
    certbot \
    python3-certbot-nginx \
    htop \
    nano \
    ufw

# Установка Node.js 18+ (если версия старая)
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "📦 Обновляем Node.js до версии 18+..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Настройка PostgreSQL
echo "🗄️ Настраиваем PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Создание пользователя и базы данных
sudo -u postgres psql << EOF
CREATE DATABASE trive_db;
CREATE USER trive_user WITH PASSWORD 'trive_password_2024';
GRANT ALL PRIVILEGES ON DATABASE trive_db TO trive_user;
\q
EOF

# Настройка firewall
echo "🔥 Настраиваем firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 4000
sudo ufw allow 8001
sudo ufw --force enable

# Настройка Nginx
echo "🌐 Настраиваем Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Создание директории для проектов
echo "📂 Создаем директории..."
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www

# Установка PM2 для управления процессами (альтернатива systemd)
echo "📦 Устанавливаем PM2..."
sudo npm install -g pm2

# Создание .env файлов
echo "🔑 Создаем шаблоны .env файлов..."
cat > /var/www/.env.backend << 'EOF'
# Backend Environment Variables
NODE_ENV=production
PORT=4000
JWT_SECRET=your_jwt_secret_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trive_db
DB_USER=trive_user
DB_PASSWORD=trive_password_2024
EOF

cat > /var/www/.env.ai << 'EOF'
# AI Backend Environment Variables
OPENAI_API_KEY=your_openai_api_key_here
EOF

# Настройка логирования
echo "📝 Настраиваем логирование..."
sudo mkdir -p /var/log/trive
sudo chown $USER:$USER /var/log/trive

# Создание скрипта для управления сервисами
cat > /var/www/manage-trive.sh << 'EOF'
#!/bin/bash

# Скрипт управления TRIVE сервисами

case "$1" in
    start)
        echo "🚀 Запускаем TRIVE сервисы..."
        sudo systemctl start trive-backend
        sudo systemctl start trive-ai
        sudo systemctl start trive-frontend
        ;;
    stop)
        echo "⏹️ Останавливаем TRIVE сервисы..."
        sudo systemctl stop trive-backend
        sudo systemctl stop trive-ai
        sudo systemctl stop trive-frontend
        ;;
    restart)
        echo "🔄 Перезапускаем TRIVE сервисы..."
        sudo systemctl restart trive-backend
        sudo systemctl restart trive-ai
        sudo systemctl restart trive-frontend
        ;;
    status)
        echo "📊 Статус TRIVE сервисов:"
        sudo systemctl status trive-backend --no-pager
        sudo systemctl status trive-ai --no-pager
        sudo systemctl status trive-frontend --no-pager
        ;;
    logs)
        echo "📝 Логи TRIVE сервисов:"
        sudo journalctl -u trive-backend -f
        ;;
    *)
        echo "Использование: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
EOF

chmod +x /var/www/manage-trive.sh

# Создание скрипта для обновления
cat > /var/www/update-trive.sh << 'EOF'
#!/bin/bash

# Скрипт обновления TRIVE

set -e

echo "🔄 Начинаем обновление TRIVE..."

cd /var/www/ai_copywrigt_trive

# Остановка сервисов
sudo systemctl stop trive-backend
sudo systemctl stop trive-ai
sudo systemctl stop trive-frontend

# Обновление кода (если используется git)
# git pull origin main

# Обновление зависимостей
echo "📦 Обновляем зависимости..."
cd ai_backend
source venv/bin/activate
pip install -r requirements.txt

cd ../backend
npm install

cd ../frontend
npm install
npm run build

# Запуск сервисов
sudo systemctl start trive-backend
sudo systemctl start trive-ai
sudo systemctl start trive-frontend

echo "✅ Обновление завершено!"
EOF

chmod +x /var/www/update-trive.sh

# Настройка автоматических бэкапов
echo "💾 Настраиваем автоматические бэкапы..."
sudo mkdir -p /var/backups/trive
sudo chown $USER:$USER /var/backups/trive

cat > /var/www/backup-trive.sh << 'EOF'
#!/bin/bash

# Скрипт создания бэкапа TRIVE

BACKUP_DIR="/var/backups/trive"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="trive_backup_$DATE.sql"

echo "💾 Создаем бэкап базы данных..."
pg_dump -h localhost -U trive_user -d trive_db > "$BACKUP_DIR/$BACKUP_FILE"

echo "📦 Создаем бэкап файлов..."
tar -czf "$BACKUP_DIR/trive_files_$DATE.tar.gz" /var/www/ai_copywrigt_trive

echo "🧹 Удаляем старые бэкапы (старше 7 дней)..."
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "✅ Бэкап создан: $BACKUP_FILE"
EOF

chmod +x /var/www/backup-trive.sh

# Добавление в cron для ежедневных бэкапов
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/backup-trive.sh") | crontab -

echo "✅ Настройка сервера завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Настройте .env файлы в /var/www/"
echo "2. Запустите развертывание: ./deploy.sh user@server.com /var/www"
echo "3. Настройте SSL сертификат: sudo certbot --nginx"
echo ""
echo "🔧 Полезные команды:"
echo "sudo systemctl status nginx"
echo "sudo systemctl status postgresql"
echo "/var/www/manage-trive.sh status"
echo "/var/www/backup-trive.sh" 