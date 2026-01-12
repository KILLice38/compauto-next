# Deployment Guide - Compauto на сервер с двумя IP

Этот гайд описывает деплой проекта compauto-next на сервер Personal с двумя публичными IP адресами.

## Архитектура сервера

**Сервер:** Personal (Timeweb Cloud)

**Публичные IP:**
- `46.149.69.203` - Основной IP сервера (birthday проект)
- `147.45.97.79` - Дополнительный IP (compauto проект)

**Проекты на сервере:**
1. **birthday** - `priglasheniye-alfiya.ru` → `46.149.69.203:443`
2. **compauto** - `komp-auto.ru` → `147.45.97.79:443`

**Ключевая идея:** Каждый проект слушает на своем IP адресе, что позволяет избежать конфликтов nginx и четко разделить трафик.

## Предварительные требования

На сервере должны быть установлены:
- Node.js 18+ (рекомендуется 20+)
- pnpm
- PostgreSQL 14+
- PM2 (глобально)
- nginx
- certbot
- Git

## Структура директорий

```
/var/www/compauto/
├── releases/          # Все релизы приложения
│   ├── v1.0.0/
│   ├── v1.0.1/
│   └── ...
├── current -> releases/v1.0.1/  # Symlink на текущий production релиз
├── staging -> releases/v1.0.2/  # Symlink на staging релиз (для тестирования)
├── shared/            # Общие файлы между релизами (production)
│   ├── uploads/       # Загруженные изображения
│   ├── logs/          # Логи PM2
│   └── .next/cache/   # Next.js кэш
├── shared-staging/    # Shared для staging
│   ├── uploads/
│   └── logs/
├── bin/               # Deployment скрипты
│   ├── deploy.sh      # Создание нового релиза
│   ├── preview.sh     # Деплой на staging
│   ├── promote.sh     # Деплой на production
│   └── rollback.sh    # Откат на предыдущую версию
└── ecosystem.config.cjs  # PM2 конфигурация

/etc/compauto/
└── .env               # Environment переменные
```

## Шаг 1: Подготовка сервера

### 1.1 Проверка сетевых интерфейсов

Убедитесь, что оба IP адреса привязаны к серверу:

```bash
ip addr show
```

Вы должны увидеть оба IP: `46.149.69.203` и `147.45.97.79`

### 1.2 Создание структуры директорий

```bash
# Создаем основную структуру
sudo mkdir -p /var/www/compauto/{releases,shared/{uploads/products,uploads/tmp,logs,.next/cache},shared-staging/{uploads/products,uploads/tmp,logs},bin}

# Создаем директорию для env файлов
sudo mkdir -p /etc/compauto

# Устанавливаем права (замените username на ваше имя пользователя)
sudo chown -R $USER:$USER /var/www/compauto
sudo chown -R $USER:$USER /etc/compauto
```

### 1.3 Копирование deployment скриптов

Скопируйте скрипты из локального проекта на сервер:

```bash
# На локальной машине
scp -r deployment/bin/* user@46.149.69.203:/var/www/compauto/bin/
scp server-files/var/www/compauto/ecosystem.config.cjs user@46.149.69.203:/var/www/compauto/
```

На сервере:
```bash
chmod +x /var/www/compauto/bin/*.sh
```

### 1.4 Настройка переменных окружения

Создайте файл `/etc/compauto/.env`:

```bash
sudo nano /etc/compauto/.env
```

Содержимое (замените значения на свои):

```env
# App
NODE_ENV=production
PORT=3003

# Database
DATABASE_URL="postgresql://compauto_user:STRONG_PASSWORD@localhost:5432/compauto?schema=app"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars"
NEXTAUTH_URL="https://komp-auto.ru"

# Admin user (для первоначального создания)
ADMIN_EMAIL="admin@komp-auto.ru"
ADMIN_PASSWORD="secure-admin-password"

# Cron job security
CRON_SECRET="your-cron-secret-key"
```

Защитите файл:
```bash
sudo chmod 600 /etc/compauto/.env
```

## Шаг 2: Настройка PostgreSQL

### 2.1 Создание базы данных и пользователя

```bash
sudo -u postgres psql
```

```sql
-- Создаем пользователя
CREATE USER compauto_user WITH PASSWORD 'STRONG_PASSWORD';

-- Создаем базу данных
CREATE DATABASE compauto OWNER compauto_user;

-- Подключаемся к базе
\c compauto

-- Создаем схему app (важно!)
CREATE SCHEMA app AUTHORIZATION compauto_user;

-- Даем права
GRANT ALL PRIVILEGES ON DATABASE compauto TO compauto_user;
GRANT ALL PRIVILEGES ON SCHEMA app TO compauto_user;
GRANT ALL ON ALL TABLES IN SCHEMA app TO compauto_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app TO compauto_user;

-- Выходим
\q
```

### 2.2 Проверка подключения

```bash
psql "postgresql://compauto_user:STRONG_PASSWORD@localhost:5432/compauto?schema=app"
```

## Шаг 3: Настройка Nginx

### 3.1 Обновление конфига birthday (если еще не сделано)

Если birthday еще слушает на всех интерфейсах, обновите конфиг:

```bash
sudo nano /etc/nginx/sites-available/birthday
```

**Важно:** Измените строки:
```nginx
# Было:
listen 80;
listen 443 ssl http2;

# Должно быть:
listen 46.149.69.203:80;
listen 46.149.69.203:443 ssl http2;
```

### 3.2 Создание конфига для compauto

```bash
sudo nano /etc/nginx/sites-available/compauto
```

Скопируйте содержимое из `deployment/nginx/compauto.conf` (уже исправленный конфиг).

**Ключевые моменты конфига:**
- `listen 147.45.97.79:80;` - слушаем ТОЛЬКО на дополнительном IP
- Проксирование на `127.0.0.1:3003` (PM2)
- Rate limiting для защиты от атак
- Статика `/uploads/` из `shared` директории

### 3.3 Активация конфига

```bash
# Создаем symlink
sudo ln -s /etc/nginx/sites-available/compauto /etc/nginx/sites-enabled/

# Проверяем конфигурацию
sudo nginx -t

# Если есть ошибки - исправляем
# Если все ок - перезагружаем nginx
sudo systemctl reload nginx
```

## Шаг 4: Получение SSL сертификатов

### 4.1 Убедитесь что DNS настроен

Проверьте что `komp-auto.ru` указывает на `147.45.97.79`:

```bash
dig komp-auto.ru +short
# Должно вернуть: 147.45.97.79
```

### 4.2 Запуск Certbot

```bash
sudo certbot --nginx -d komp-auto.ru -d www.komp-auto.ru
```

**Важно:** Certbot автоматически:
1. Получит SSL сертификаты от Let's Encrypt
2. Создаст HTTPS server блоки в nginx конфиге
3. Добавит редирект с HTTP на HTTPS
4. **СОХРАНИТ `listen 147.45.97.79:443` директиву** (это критично!)

### 4.3 Проверка сертификатов

```bash
sudo certbot certificates
```

Вы должны увидеть сертификаты для обоих доменов:
- `priglasheniye-alfiya.ru`
- `komp-auto.ru`

### 4.4 Автообновление сертификатов

Certbot автоматически создает cron job для обновления. Проверьте:

```bash
sudo systemctl status certbot.timer
```

## Шаг 5: Первый деплой приложения

### 5.1 Создание первого релиза

```bash
cd /var/www/compauto
./bin/deploy.sh v1.0.0
```

Этот скрипт:
- Клонирует код из GitHub
- Создаст релиз в `releases/v1.0.0/`
- НЕ запустит приложение (это делает promote.sh)

### 5.2 Деплой на production

```bash
./bin/promote.sh v1.0.0
```

Этот скрипт:
- Создаст symlink `current -> releases/v1.0.0`
- Скопирует `.env` из `/etc/compauto/`
- Установит dependencies (`pnpm install`)
- Сгенерирует Prisma Client
- Запустит миграции БД
- Соберет Next.js приложение (`pnpm build`)
- Запустит PM2 на порту 3003

### 5.3 Проверка работы

```bash
# Проверка PM2
pm2 list
pm2 logs compauto-production

# Проверка nginx
sudo nginx -t
sudo systemctl status nginx

# Проверка HTTP endpoint
curl http://147.45.97.79/health
# Должно вернуть: OK

# Проверка локально через https
curl -k https://147.45.97.79/
# Должен вернуть HTML

# Проверка через домен
curl https://komp-auto.ru/
# Должен вернуть HTML
```

### 5.4 Создание админ пользователя

```bash
cd /var/www/compauto/current
node --env-file=.env scripts/create-user.ts
```

## Шаг 6: Настройка Firewall (UFW)

### 6.1 Базовая настройка UFW

```bash
# Если UFW еще не настроен
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включаем UFW
sudo ufw enable
```

### 6.2 Дополнительная защита (опционально)

Ограничить доступ к админ панели по IP:

```nginx
# В /etc/nginx/sites-available/compauto
location /admin/ {
    # Разрешаем только ваш IP
    allow YOUR_IP_ADDRESS;
    deny all;

    # ... остальные proxy_pass директивы
}
```

## Шаг 7: Настройка Fail2ban

### 7.1 Создание фильтра для nginx

```bash
sudo nano /etc/fail2ban/filter.d/nginx-compauto.conf
```

```ini
[Definition]
failregex = ^<HOST> -.*"(GET|POST|HEAD).*" (404|403|400) .*$
            ^<HOST> -.*"(GET|POST).*(.php|.asp|.exe|.pl|.cgi|.scgi)".*$
ignoreregex =
```

### 7.2 Создание jail

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-compauto]
enabled = true
port = http,https
filter = nginx-compauto
logpath = /var/log/nginx/compauto-*.log
maxretry = 10
findtime = 600
bantime = 3600
```

### 7.3 Перезапуск Fail2ban

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status nginx-compauto
```

## Шаг 8: Мониторинг и обслуживание

### 8.1 Логи

```bash
# PM2 логи
pm2 logs compauto-production

# Nginx логи
sudo tail -f /var/log/nginx/compauto-ssl-access.log
sudo tail -f /var/log/nginx/compauto-ssl-error.log

# Fail2ban
sudo tail -f /var/log/fail2ban.log
```

### 8.2 PM2 автозапуск

```bash
# Сохраняем текущую конфигурацию PM2
pm2 save

# Генерируем startup скрипт
pm2 startup

# Выполняем команду которую вернул pm2 startup (примерно такую):
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
```

### 8.3 Обновление приложения

```bash
cd /var/www/compauto

# 1. Создаем новый релиз
./bin/deploy.sh v1.0.1

# 2. Тестируем на staging (опционально)
./bin/preview.sh v1.0.1
# Проверяем на killiskadev-test.ru:80

# 3. Деплоим на production
./bin/promote.sh v1.0.1

# 4. Если что-то не так - откат
./bin/rollback.sh
```

## Troubleshooting

### Проблема: Сайт не открывается (бесконечная загрузка)

**Симптомы:**
- С сервера `curl https://komp-auto.ru` работает
- Извне - бесконечная загрузка или таймаут
- С VPN работает

**Возможные причины:**

1. **Nginx слушает на неправильном IP**

Проверьте:
```bash
sudo nginx -T | grep "listen.*147.45.97.79"
```

Должно быть:
```nginx
listen 147.45.97.79:80;
listen 147.45.97.79:443 ssl http2;
```

Если нет - исправьте конфиг и перезагрузите nginx.

2. **Конфликт с другим сайтом**

Проверьте что birthday НЕ слушает на 147.45.97.79:

```bash
sudo nginx -T | grep -A 5 "server_name priglasheniye-alfiya.ru"
```

Должно быть:
```nginx
listen 46.149.69.203:80;
listen 46.149.69.203:443 ssl http2;
```

3. **Firewall блокирует**

```bash
# Проверка UFW
sudo ufw status

# Проверка iptables
sudo iptables -L -n -v | grep 147.45.97.79
```

4. **DNS указывает на неправильный IP**

```bash
dig komp-auto.ru +short
# Должно вернуть: 147.45.97.79
```

Если возвращает другой IP - обратитесь к заказчику для обновления DNS.

5. **Проблема на уровне хостинга (Timeweb)**

Проверьте в панели Timeweb Cloud что IP `147.45.97.79`:
- Привязан к серверу Personal
- Активен
- Нет блокировок

### Проблема: PM2 приложение падает

```bash
# Смотрим логи ошибок
pm2 logs compauto-production --err

# Проверяем статус
pm2 describe compauto-production

# Перезапускаем
pm2 restart compauto-production

# Если не помогает - смотрим логи БД
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Проблема: Ошибки БД "table does not exist"

```bash
cd /var/www/compauto/current

# Проверяем миграции
pnpm dlx prisma migrate status

# Применяем миграции
pnpm dlx prisma migrate deploy

# Если нужно пересоздать всю БД (ОСТОРОЖНО! Удаляет все данные)
pnpm dlx prisma migrate reset
```

### Проблема: SSL сертификат не работает

```bash
# Проверка сертификатов
sudo certbot certificates

# Тест SSL
openssl s_client -connect 147.45.97.79:443 -servername komp-auto.ru

# Проверка директив nginx
sudo nginx -T | grep -A 10 "server_name komp-auto.ru"

# Обновление сертификата
sudo certbot renew --dry-run
sudo certbot renew
```

### Проблема: Файлы не загружаются

```bash
# Проверка прав
ls -la /var/www/compauto/shared/uploads/

# Должен быть владелец: ваш пользователь
# Если нет:
sudo chown -R $USER:$USER /var/www/compauto/shared/

# Проверка размера
df -h /var/www/compauto/

# Проверка в nginx
sudo nginx -T | grep client_max_body_size
# Должно быть: 5M или больше
```

### Проблема: Rate limiting слишком строгий

Если legitimate пользователи получают 429 ошибки:

```nginx
# В /etc/nginx/sites-available/compauto
# Увеличьте лимиты:
limit_req_zone $binary_remote_addr zone=compauto_limit:10m rate=30r/s;  # было 10r/s
```

Перезагрузите nginx:
```bash
sudo systemctl reload nginx
```

## Безопасность

### Регулярные обновления

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Обновление зависимостей Node.js (на локальной машине)
pnpm update

# Проверка уязвимостей
pnpm audit
```

### Бэкапы

Настройте регулярные бэкапы:

1. **База данных** (ежедневно):
```bash
pg_dump "postgresql://compauto_user:PASSWORD@localhost:5432/compauto" > backup_$(date +%Y%m%d).sql
```

2. **Uploads** (еженедельно):
```bash
tar -czf uploads_$(date +%Y%m%d).tar.gz /var/www/compauto/shared/uploads/
```

3. **Конфиги** (при изменении):
```bash
sudo tar -czf configs_$(date +%Y%m%d).tar.gz /etc/nginx/sites-available/ /etc/compauto/
```

### Мониторинг атак

```bash
# Fail2ban статус
sudo fail2ban-client status nginx-compauto

# Nginx access log анализ
sudo tail -100 /var/log/nginx/compauto-ssl-access.log | grep " 403 \| 404 \| 400 "

# Подозрительные запросы
sudo grep -E "\.php|\.asp|\.exe" /var/log/nginx/compauto-*.log
```

## Контакты и поддержка

Если возникли проблемы:
1. Проверьте секцию Troubleshooting
2. Просмотрите логи (PM2, nginx, PostgreSQL)
3. Проверьте статус всех сервисов (nginx, postgresql, pm2)

**Важные файлы:**
- Nginx конфиг: `/etc/nginx/sites-available/compauto`
- PM2 конфиг: `/var/www/compauto/ecosystem.config.cjs`
- Environment: `/etc/compauto/.env`
- Логи PM2: `/var/www/compauto/shared/logs/`
- Логи nginx: `/var/log/nginx/compauto-*.log`
