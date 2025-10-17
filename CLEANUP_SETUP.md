# Настройка автоматической очистки временных файлов

Система автоматической очистки удаляет временные файлы из `/public/uploads/tmp/` старше 1 дня.

## Компоненты системы

1. **app/api/lib/cleanup.ts** - Утилиты для очистки tmp файлов
2. **app/api/cleanup/route.ts** - API endpoint для ручной очистки (требует авторизацию)
3. **app/api/cron/cleanup/route.ts** - Cron endpoint для автоматической очистки

## Ручная очистка (через админку)

Авторизованные пользователи могут запустить очистку вручную:

```bash
# Получить информацию о tmp файлах
GET /api/cleanup

# Запустить очистку
POST /api/cleanup
```

## Автоматическая очистка

### Вариант 1: Vercel Cron (рекомендуется для Vercel)

Уже настроено в `vercel.json`:
- Запускается каждый день в 2:00 UTC
- Автоматически работает при деплое на Vercel

**Настройка:**
1. Добавьте переменную окружения `CRON_SECRET` в Vercel Dashboard
2. Сгенерируйте случайный секретный ключ:
   ```bash
   openssl rand -base64 32
   ```
3. Добавьте в Settings → Environment Variables:
   ```
   CRON_SECRET=your-generated-secret-key
   ```

### Вариант 2: Системный cron (для VPS/собственного сервера)

Добавьте в crontab:

```bash
# Открыть crontab
crontab -e

# Добавить задачу (запуск каждый день в 2:00)
0 2 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/cleanup
```

**Настройка:**
1. Добавьте `CRON_SECRET` в `.env`:
   ```
   CRON_SECRET=your-generated-secret-key
   ```
2. Замените `YOUR_CRON_SECRET` и `your-domain.com` на актуальные значения

### Вариант 3: Внешний сервис (cron-job.org, EasyCron и т.д.)

1. Зарегистрируйтесь на сервисе для запуска cron jobs
2. Создайте задачу:
   - **URL:** `https://your-domain.com/api/cron/cleanup`
   - **Schedule:** `0 2 * * *` (каждый день в 2:00)
   - **Method:** GET
   - **Headers:** `Authorization: Bearer YOUR_CRON_SECRET`

### Вариант 4: Node.js cron (для локальной разработки)

Если нужно запускать локально:

```bash
# Установить node-cron
pnpm add node-cron
pnpm add -D @types/node-cron
```

Создать `scripts/cleanup-cron.ts`:

```typescript
import cron from 'node-cron'

// Каждый день в 2:00
cron.schedule('0 2 * * *', async () => {
  try {
    const response = await fetch('http://localhost:3000/api/cron/cleanup', {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    })
    const result = await response.json()
    console.log('Cleanup result:', result)
  } catch (error) {
    console.error('Cleanup failed:', error)
  }
})

console.log('Cleanup cron job scheduled')
```

## Мониторинг

Проверить состояние tmp файлов:

```bash
# Через API (требует авторизацию)
curl -X GET http://localhost:3000/api/cleanup \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Или напрямую в файловой системе
ls -lah public/uploads/tmp/
```

## Логи

Все операции очистки логируются в console:
- Количество удалённых директорий
- Количество удалённых файлов
- Возраст файлов (в часах)
- Ошибки при удалении

## Безопасность

- `/api/cleanup` (ручная очистка) - требует авторизацию через NextAuth
- `/api/cron/cleanup` (автоматическая) - требует секретный ключ `CRON_SECRET`
- Удаляются только файлы старше 24 часов
- Безопасное удаление с обработкой ошибок

## Тестирование

Для тестирования в разработке:

```bash
# 1. Создать тестовые tmp файлы
mkdir -p public/uploads/tmp/test-old
touch public/uploads/tmp/test-old/file.webp

# 2. Изменить время модификации (сделать "старым")
touch -t 202301010000 public/uploads/tmp/test-old/file.webp

# 3. Запустить очистку (требует авторизацию)
curl -X POST http://localhost:3000/api/cleanup \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```
