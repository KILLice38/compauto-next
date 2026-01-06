# Настройка переменных окружения

Переменные окружения хранятся в `/etc` для изоляции от кодовой базы и удобства управления.

## Структура

```
/etc/compauto/          - Production переменные
  └── .env
/etc/compauto-staging/  - Staging переменные
  └── .env
```

## Установка на сервере

### 1. Создайте директории

```bash
sudo mkdir -p /etc/compauto
sudo mkdir -p /etc/compauto-staging
```

### 2. Создайте .env файлы

#### Production (.env для production)

```bash
sudo nano /etc/compauto/.env
```

Скопируйте содержимое из `deployment/env/.env.production.example` и замените:
- `NEXTAUTH_SECRET` - сгенерируйте: `openssl rand -base64 32`
- `NEXTAUTH_URL` - укажите `https://komp-auto.ru`
- `DATABASE_URL` - укажите реальные данные PostgreSQL для production базы
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` - ваши реальные учетные данные
- `CRON_SECRET` - сгенерируйте: `openssl rand -base64 32`

#### Staging (.env для staging)

```bash
sudo nano /etc/compauto-staging/.env
```

Скопируйте содержимое из `deployment/env/.env.staging.example` и замените:
- `NEXTAUTH_SECRET` - сгенерируйте новый или используйте тот же
- `NEXTAUTH_URL` - укажите `https://killiskadev.ru`
- `DATABASE_URL` - **ВАЖНО:** используйте ОТДЕЛЬНУЮ базу данных `compauto_staging`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` - те же что и в production (для удобства)
- `CRON_SECRET` - используйте тот же или сгенерируйте новый

### 3. Установите права доступа

```bash
# Владелец - root, только чтение для пользователей
sudo chmod 600 /etc/compauto/.env
sudo chmod 600 /etc/compauto-staging/.env

# Дайте доступ вашему пользователю (замените killiska на ваше имя)
sudo chown killiska:killiska /etc/compauto/.env
sudo chown killiska:killiska /etc/compauto-staging/.env
```

## Создание баз данных PostgreSQL

Создайте отдельные базы данных для production, staging и их shadow databases:

```bash
sudo -u postgres psql

-- Production база
CREATE DATABASE compauto_production;
CREATE DATABASE compauto_production_shadow;

-- Staging база
CREATE DATABASE compauto_staging;
CREATE DATABASE compauto_staging_shadow;

-- Создайте пользователя
CREATE USER compauto_user WITH PASSWORD 'ваш_сильный_пароль';

-- Дайте права на все базы
GRANT ALL PRIVILEGES ON DATABASE compauto_production TO compauto_user;
GRANT ALL PRIVILEGES ON DATABASE compauto_production_shadow TO compauto_user;
GRANT ALL PRIVILEGES ON DATABASE compauto_staging TO compauto_user;
GRANT ALL PRIVILEGES ON DATABASE compauto_staging_shadow TO compauto_user;

-- Выход
\q
```

### Что такое Shadow Database?

Shadow database - это временная база данных, которую Prisma использует для безопасного выполнения миграций:

1. **Проверка миграций**: Prisma сначала применяет миграцию к shadow database
2. **Валидация схемы**: Проверяет что миграция применяется без ошибок
3. **Откат shadow DB**: Очищает shadow database после проверки
4. **Применение к основной БД**: Только после успешной проверки применяет к основной базе

Это предотвращает поломку production базы из-за некорректных миграций.

### Важно

Обязательно добавьте `SHADOW_DATABASE_URL` в оба .env файла:

```bash
# В /etc/compauto/.env
DATABASE_URL="postgresql://compauto_user:ваш_пароль@localhost:5432/compauto_production?schema=public"
SHADOW_DATABASE_URL="postgresql://compauto_user:ваш_пароль@localhost:5432/compauto_production_shadow?schema=public"

# В /etc/compauto-staging/.env
DATABASE_URL="postgresql://compauto_user:ваш_пароль@localhost:5432/compauto_staging?schema=public"
SHADOW_DATABASE_URL="postgresql://compauto_user:ваш_пароль@localhost:5432/compauto_staging_shadow?schema=public"
```

## Как это работает

### Preview (staging)

1. Скрипт `preview.sh` создает симлинк:
   ```
   /var/www/compauto/staging/.env -> /etc/compauto-staging/.env
   ```

2. При билде Next.js читает переменные из `/etc/compauto-staging/.env`

3. PM2 запускает приложение с этими переменными на порту 3004

### Promote (production)

1. Скрипт `promote.sh` создает симлинк:
   ```
   /var/www/compauto/current/.env -> /etc/compauto/.env
   ```

2. При билде Next.js читает переменные из `/etc/compauto/.env`

3. PM2 запускает приложение с этими переменными на порту 3003

## Проверка

После создания .env файлов проверьте их содержимое:

```bash
# Проверка production .env
cat /etc/compauto/.env

# Проверка staging .env
cat /etc/compauto-staging/.env
```

## Безопасность

- ✅ .env файлы НЕ находятся в Git репозитории
- ✅ .env файлы НЕ находятся в директории проекта
- ✅ .env файлы имеют права доступа 600 (читать может только владелец)
- ✅ Отдельные базы данных для production и staging
- ✅ Shadow databases для безопасных миграций
- ✅ Секреты генерируются случайным образом

## Обновление переменных

Если нужно обновить переменные окружения:

```bash
# Отредактируйте .env
sudo nano /etc/compauto/.env  # или /etc/compauto-staging/.env

# Перезапустите приложение
pm2 restart compauto-production --update-env  # или compauto-staging
```

## Генерация секретов

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# CRON_SECRET
openssl rand -base64 32

# Пароль пользователя PostgreSQL
openssl rand -base64 24
```
