# Compauto-Next Deployment Guide

Полное руководство по развёртыванию приложения на VPS сервере с использованием PM2, Nginx и PostgreSQL.

## Содержание

1. [Структура проекта](#структура-проекта)
2. [Подготовка сервера](#подготовка-сервера)
3. [Настройка дополнительного IP](#настройка-дополнительного-ip)
4. [Установка зависимостей](#установка-зависимостей)
5. [Настройка PostgreSQL](#настройка-postgresql)
6. [Настройка Nginx](#настройка-nginx)
7. [Настройка SSL](#настройка-ssl)
8. [Развёртывание приложения](#развёртывание-приложения)
9. [Управление релизами](#управление-релизами)
10. [Мониторинг и логи](#мониторинг-и-логи)
11. [Troubleshooting](#troubleshooting)

---

## Структура проекта

```
/var/www/compauto/
├── bin/                # Deployment scripts
│   ├── deploy.sh       # Deploy new release from GitHub
│   ├── preview.sh      # Deploy to staging
│   ├── promote.sh      # Promote to production
│   ├── rollback.sh     # Rollback to previous release
│   ├── status.sh       # Check application status
│   ├── maintenance.sh  # Toggle maintenance mode
│   ├── clean.sh        # Clean old releases
│   └── setup-ip.sh     # Configure additional IP
├── current/            # Symlink to current production release
├── staging/            # Symlink to staging release
├── releases/           # All deployed releases
│   ├── v1.0.0/
│   ├── v1.0.1/
│   └── v1.0.2/
├── shared/             # Shared files for production
│   ├── uploads/        # Uploaded images
│   ├── logs/           # Application logs
│   └── .next/cache/    # Next.js build cache
├── shared-staging/     # Shared files for staging
│   ├── uploads/
│   ├── logs/
│   └── .next/cache/
└── deployment/         # Deployment configuration
    ├── nginx/
    ├── ecosystem.config.cjs
    └── README.md (this file)
```

---

## Подготовка сервера

### Системные требования

- Ubuntu 22.04 LTS или выше
- Минимум 2 GB RAM
- 20 GB свободного места на диске
- Root или sudo доступ

### Создание пользователя

```bash
# Создайте пользователя для приложения
sudo adduser compauto
sudo usermod -aG sudo compauto

# Переключитесь на нового пользователя
sudo su - compauto
```

### Создание структуры директорий

```bash
sudo mkdir -p /var/www/compauto/{bin,releases,shared,shared-staging}
sudo mkdir -p /var/www/compauto/shared/{uploads/products,uploads/tmp,logs,.next/cache}
sudo mkdir -p /var/www/compauto/shared-staging/{uploads/products,uploads/tmp,logs,.next/cache}
sudo chown -R compauto:compauto /var/www/compauto
```

---

## Настройка дополнительного IP

Если вам нужно настроить дополнительный IP адрес (например, от Timeweb Cloud):

### 1. Получите IP адрес в панели Timeweb Cloud

В панели управления Timeweb Cloud создайте новый IP адрес и запишите:
- IP адрес (например: 185.104.248.123)
- Маску подсети (обычно: 255.255.255.0)
- Интерфейс (обычно: eth0)

### 2. Узнайте имя сетевого интерфейса

```bash
ip link show
```

### 3. Настройте IP адрес

```bash
# Скопируйте скрипт на сервер
sudo /var/www/compauto/bin/setup-ip.sh 185.104.248.123 255.255.255.0 eth0
```

### 4. Проверьте конфигурацию

```bash
ip addr show eth0
```

### 5. Настройте DNS

В панели вашего регистратора доменов привяжите домен к новому IP адресу:
- A запись: yourdomain.ru → 185.104.248.123
- A запись: www.yourdomain.ru → 185.104.248.123

---

## Установка зависимостей

### Node.js и pnpm

```bash
# Установите Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установите pnpm
npm install -g pnpm@9

# Проверьте версии
node --version  # должно быть v20.x
pnpm --version  # должно быть 9.x
```

### PM2

```bash
# Установите PM2 глобально
npm install -g pm2

# Настройте автозапуск PM2
pm2 startup
# Выполните команду, которую выведет pm2 startup
```

### Git

```bash
sudo apt-get update
sudo apt-get install -y git
```

---

## Настройка PostgreSQL

### Установка

```bash
sudo apt-get install -y postgresql postgresql-contrib
```

### Создание базы данных и пользователей

```bash
# Войдите в PostgreSQL
sudo -u postgres psql

# В консоли PostgreSQL:
CREATE DATABASE compauto;
CREATE USER compauto_app WITH PASSWORD 'your_strong_password';
CREATE USER compauto_migrator WITH PASSWORD 'your_strong_password';

# Права для app_user (только CRUD)
GRANT CONNECT ON DATABASE compauto TO compauto_app;
GRANT USAGE ON SCHEMA public TO compauto_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO compauto_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO compauto_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO compauto_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO compauto_app;

# Права для migrator (DDL operations)
GRANT ALL PRIVILEGES ON DATABASE compauto TO compauto_migrator;

\q
```

### Настройка для staging базы данных

```bash
sudo -u postgres psql

CREATE DATABASE compauto_staging;
GRANT ALL PRIVILEGES ON DATABASE compauto_staging TO compauto_migrator;
GRANT CONNECT ON DATABASE compauto_staging TO compauto_app;
GRANT USAGE ON SCHEMA public TO compauto_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO compauto_app;

\q
```

---

## Настройка Nginx

### Установка

```bash
sudo apt-get install -y nginx
```

### Копирование конфигурации

```bash
# Скопируйте конфигурационный файл
sudo cp deployment/nginx/compauto.conf /etc/nginx/sites-available/

# Отредактируйте конфигурацию, замените yourdomain.ru на ваш домен
sudo nano /etc/nginx/sites-available/compauto.conf

# Создайте символическую ссылку
sudo ln -s /etc/nginx/sites-available/compauto.conf /etc/nginx/sites-enabled/

# Удалите дефолтную конфигурацию
sudo rm /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
sudo nginx -t

# Перезапустите Nginx
sudo systemctl restart nginx
```

---

## Настройка SSL

После того как DNS записи обновятся (обычно 1-24 часа):

```bash
# Установите Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Получите SSL сертификат
sudo certbot --nginx -d yourdomain.ru -d www.yourdomain.ru

# Certbot автоматически:
# - Получит сертификат
# - Обновит nginx конфигурацию
# - Настроит автообновление
```

### Проверка автообновления

```bash
# Проверьте таймер certbot
sudo systemctl status certbot.timer

# Тестовый прогон обновления
sudo certbot renew --dry-run
```

---

## Настройка переменных окружения

### Production

```bash
# Создайте директорию
sudo mkdir -p /etc/compauto

# Создайте .env файл
sudo nano /etc/compauto/.env
```

Содержимое файла:

```env
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=https://yourdomain.ru
DATABASE_URL="postgresql://compauto_app:password@localhost:5432/compauto?schema=public"
ADMIN_EMAIL=admin@yourdomain.ru
ADMIN_PASSWORD=strong_password_here
CRON_SECRET=your_cron_secret_here

# Migration user (используется только для миграций)
DATABASE_URL_MIGRATOR="postgresql://compauto_migrator:password@localhost:5432/compauto?schema=public"
```

### Staging

```bash
sudo mkdir -p /etc/compauto-staging
sudo nano /etc/compauto-staging/.env
```

Содержимое (с staging базой данных):

```env
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=https://staging.yourdomain.ru
DATABASE_URL="postgresql://compauto_app:password@localhost:5432/compauto_staging?schema=public"
ADMIN_EMAIL=admin@yourdomain.ru
ADMIN_PASSWORD=strong_password_here
CRON_SECRET=your_cron_secret_here

DATABASE_URL_MIGRATOR="postgresql://compauto_migrator:password@localhost:5432/compauto_staging?schema=public"
```

### Генерация секретов

```bash
# Для NEXTAUTH_SECRET и CRON_SECRET используйте:
openssl rand -base64 32
```

### Установка прав

```bash
sudo chmod 600 /etc/compauto/.env
sudo chmod 600 /etc/compauto-staging/.env
sudo chown compauto:compauto /etc/compauto/.env
sudo chown compauto:compauto /etc/compauto-staging/.env
```

---

## Развёртывание приложения

### Копирование скриптов и конфигураций

```bash
# Находясь в корне проекта на локальной машине
cd /path/to/compauto-next

# Скопируйте файлы на сервер
scp -r deployment/bin/* compauto@your-server:/var/www/compauto/bin/
scp deployment/ecosystem.config.cjs compauto@your-server:/var/www/compauto/deployment/

# На сервере сделайте скрипты исполняемыми
ssh compauto@your-server
cd /var/www/compauto/bin
chmod +x *.sh
```

### Настройка Git репозитория

Откройте `bin/deploy.sh` и замените URL репозитория:

```bash
nano /var/www/compauto/bin/deploy.sh

# Найдите строку:
REPO_URL="https://github.com/YOUR_USERNAME/compauto-next.git"

# Замените на ваш репозиторий:
REPO_URL="https://github.com/yourusername/compauto-next.git"
```

### Первый деплоймент

```bash
cd /var/www/compauto

# 1. Создайте тег релиза в Git (на локальной машине)
git tag v1.0.0
git push origin v1.0.0

# 2. На сервере: загрузите релиз
./bin/deploy.sh v1.0.0

# 3. Разверните на staging для тестирования
./bin/preview.sh v1.0.0

# 4. Проверьте staging окружение
./bin/status.sh
# Откройте https://staging.yourdomain.ru

# 5. Если всё работает, разверните в production
./bin/promote.sh v1.0.0

# 6. Проверьте production
./bin/status.sh
# Откройте https://yourdomain.ru
```

---

## Управление релизами

### Создание нового релиза

```bash
# На локальной машине:
git tag v1.0.1
git push origin v1.0.1

# На сервере:
cd /var/www/compauto
./bin/deploy.sh v1.0.1
./bin/preview.sh v1.0.1
# Протестируйте staging
./bin/promote.sh v1.0.1
```

### Откат к предыдущей версии

```bash
./bin/rollback.sh
```

### Очистка старых релизов

```bash
# Оставить последние 5 релизов
./bin/clean.sh

# Оставить последние 3 релиза
./bin/clean.sh --keep 3
```

### Режим обслуживания

```bash
# Включить режим обслуживания
./bin/maintenance.sh on

# Выключить режим обслуживания
./bin/maintenance.sh off
```

---

## Мониторинг и логи

### Статус приложения

```bash
# Проверка статуса через скрипт
./bin/status.sh

# PM2 команды
pm2 status
pm2 monit  # Интерактивный мониторинг
```

### Просмотр логов

```bash
# Логи production
pm2 logs compauto-production

# Логи staging
pm2 logs compauto-staging

# Логи Nginx
sudo tail -f /var/log/nginx/compauto-access.log
sudo tail -f /var/log/nginx/compauto-error.log
```

### Перезапуск приложения

```bash
# Мягкий перезапуск (zero-downtime)
pm2 reload compauto-production

# Жёсткий перезапуск
pm2 restart compauto-production

# Остановка
pm2 stop compauto-production

# Запуск
pm2 start compauto-production
```

---

## Troubleshooting

### Приложение не запускается

```bash
# 1. Проверьте логи
pm2 logs compauto-production --lines 100

# 2. Проверьте переменные окружения
cat /etc/compauto/.env

# 3. Проверьте подключение к базе данных
cd /var/www/compauto/current
pnpm prisma db pull

# 4. Пересоберите приложение
pnpm build
pm2 reload compauto-production
```

### Ошибки базы данных

```bash
# Проверьте подключение
psql -U compauto_app -d compauto -h localhost

# Выполните миграции вручную
cd /var/www/compauto/current
DATABASE_URL="postgresql://compauto_migrator:password@localhost:5432/compauto" pnpm prisma migrate deploy
```

### Проблемы с Nginx

```bash
# Проверьте конфигурацию
sudo nginx -t

# Проверьте логи ошибок
sudo tail -f /var/log/nginx/error.log

# Перезапустите Nginx
sudo systemctl restart nginx
```

### Проблемы с загрузкой изображений

```bash
# Проверьте права на uploads
ls -la /var/www/compauto/shared/uploads/

# Установите правильные права
sudo chown -R compauto:compauto /var/www/compauto/shared/uploads/
sudo chmod -R 755 /var/www/compauto/shared/uploads/
```

### Высокое использование памяти

```bash
# Проверьте использование памяти
pm2 monit

# Уменьшите количество инстансов в ecosystem.config.cjs
nano /var/www/compauto/deployment/ecosystem.config.cjs
# Измените instances: 2 на instances: 1

# Перезапустите
pm2 reload compauto-production
```

---

## Полезные команды

```bash
# Проверка дискового пространства
df -h

# Проверка использования памяти
free -h

# Проверка запущенных процессов
ps aux | grep node

# Проверка открытых портов
sudo netstat -tlnp | grep node

# Проверка DNS
dig yourdomain.ru
nslookup yourdomain.ru

# Проверка SSL
openssl s_client -connect yourdomain.ru:443 -servername yourdomain.ru
```

---

## Backup Strategy

### Backup базы данных

```bash
# Создайте скрипт для автоматического бэкапа
cat > /var/www/compauto/bin/backup-db.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/www/compauto/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
pg_dump -U compauto_app compauto > "$BACKUP_DIR/compauto_$DATE.sql"
gzip "$BACKUP_DIR/compauto_$DATE.sql"
# Удалить бэкапы старше 7 дней
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
EOF

chmod +x /var/www/compauto/bin/backup-db.sh

# Добавьте в crontab
crontab -e
# Добавьте строку:
0 2 * * * /var/www/compauto/bin/backup-db.sh
```

### Backup файлов

```bash
# Backup uploads
tar -czf /var/www/compauto/backups/uploads_$(date +%Y%m%d).tar.gz \
  /var/www/compauto/shared/uploads/
```

---

## Security Checklist

- ✅ Используйте сильные пароли для PostgreSQL
- ✅ Настройте firewall (ufw)
- ✅ Используйте только HTTPS
- ✅ Ограничьте права файлов (chmod 600 для .env)
- ✅ Регулярно обновляйте систему (apt update && apt upgrade)
- ✅ Настройте автоматические бэкапы
- ✅ Мониторьте логи на подозрительную активность
- ✅ Используйте fail2ban для защиты от brute-force атак

---

## Поддержка

При возникновении проблем:
1. Проверьте логи: `pm2 logs compauto-production`
2. Проверьте статус: `./bin/status.sh`
3. Обратитесь к разделу [Troubleshooting](#troubleshooting)
