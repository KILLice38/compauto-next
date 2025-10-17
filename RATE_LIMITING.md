# Rate Limiting

Система защиты от brute-force атак и злоупотребления API.

## Обзор

В проекте реализована система rate limiting для защиты критичных endpoints от:
- Brute-force атак на авторизацию
- DDoS атак
- Злоупотребления API

## Архитектура

### In-Memory хранилище

**Текущая реализация:** In-memory Map для хранения счётчиков запросов
**Для production:** Рекомендуется использовать Redis для shared state между несколькими инстансами приложения

### Идентификация клиентов

Rate limiting определяет клиента по IP адресу с учётом прокси:
1. `x-forwarded-for` (для CDN/прокси)
2. `x-real-ip` (для nginx)
3. Fallback на `req.ip`

## Защищённые Endpoints

### Authentication endpoints

**Endpoint:** `/api/auth/*` (NextAuth routes)
**Конфигурация:** `RateLimitPresets.AUTH_STRICT`
- **Лимит:** 5 попыток в минуту
- **Блокировка:** 15 минут после превышения
- **Защищает от:** Brute-force атак на пароли

```typescript
// Применяется ко всем POST запросам к /api/auth/*
// GET запросы (проверка сессии) не ограничены
POST /api/auth/signin -> 5 попыток/мин
POST /api/auth/callback -> 5 попыток/мин
```

## Доступные конфигурации

### AUTH_STRICT (используется для auth)
```typescript
{
  interval: 60 * 1000,        // 1 минута
  maxAttempts: 5,             // 5 попыток
  blockDuration: 15 * 60 * 1000  // Блокировка на 15 минут
}
```

### AUTH_MODERATE
```typescript
{
  interval: 5 * 60 * 1000,    // 5 минут
  maxAttempts: 10,            // 10 попыток
  blockDuration: 5 * 60 * 1000   // Блокировка на 5 минут
}
```

### API_LIGHT
```typescript
{
  interval: 60 * 1000,        // 1 минута
  maxAttempts: 60,            // 60 запросов
  // Без блокировки, просто возвращает 429
}
```

### API_MODERATE
```typescript
{
  interval: 60 * 1000,        // 1 минута
  maxAttempts: 30,            // 30 запросов
}
```

## Использование в API routes

### Простой способ - checkRateLimit

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, RateLimitPresets } from '../lib/rateLimit'

export async function POST(req: NextRequest) {
  // Проверяем rate limit
  const rateLimitError = checkRateLimit(req, 'my-api', RateLimitPresets.API_MODERATE)
  if (rateLimitError) {
    return rateLimitError
  }

  // Основная логика
  return NextResponse.json({ success: true })
}
```

### Wrapper способ - withRateLimit

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, RateLimitPresets } from '../lib/rateLimit'

async function handler(req: NextRequest) {
  return NextResponse.json({ success: true })
}

export const POST = withRateLimit(handler, 'my-api', RateLimitPresets.API_MODERATE)
```

### Кастомная конфигурация

```typescript
import { checkRateLimit } from '../lib/rateLimit'

const customConfig = {
  interval: 2 * 60 * 1000,    // 2 минуты
  maxAttempts: 20,            // 20 запросов
  blockDuration: 10 * 60 * 1000  // Блокировка на 10 минут
}

export async function POST(req: NextRequest) {
  const rateLimitError = checkRateLimit(req, 'custom-endpoint', customConfig)
  if (rateLimitError) {
    return rateLimitError
  }
  // ...
}
```

## Response headers

При превышении лимита возвращается:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 900
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1697548800

{
  "error": "Too many requests. Your IP has been temporarily blocked.",
  "retryAfter": 900
}
```

**Headers:**
- `Retry-After` - секунд до разблокировки
- `X-RateLimit-Limit` - максимальное количество запросов
- `X-RateLimit-Remaining` - оставшееся количество запросов (0 при блокировке)
- `X-RateLimit-Reset` - Unix timestamp когда счётчик сбросится

## Логирование

При превышении лимита в консоль выводится предупреждение:

```
Rate limit exceeded for auth from 192.168.1.1. Blocked for 900s
```

## Очистка старых записей

Автоматическая очистка каждые 10 минут:
- Удаляются записи со сброшенным счётчиком
- Удаляются записи с истёкшей блокировкой

## Административные функции

### Сброс rate limit для IP

```typescript
import { resetRateLimit } from '../lib/rateLimit'

// Сброс для конкретного IP (например, после успешной авторизации)
resetRateLimit('auth', '192.168.1.1')
```

### Проверка статуса

```typescript
import { getRateLimitStatus } from '../lib/rateLimit'

const status = getRateLimitStatus('auth', '192.168.1.1')
if (status) {
  console.log(`Attempts: ${status.count}`)
  console.log(`Reset at: ${new Date(status.resetAt)}`)
  if (status.blockedUntil) {
    console.log(`Blocked until: ${new Date(status.blockedUntil)}`)
  }
}
```

## Миграция на Redis (Production)

Для production окружения рекомендуется заменить in-memory хранилище на Redis:

### 1. Установить Redis client

```bash
pnpm add ioredis
pnpm add -D @types/ioredis
```

### 2. Создать Redis client

```typescript
// app/api/lib/redis.ts
import Redis from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
```

### 3. Обновить rateLimit.ts

```typescript
import { redis } from './redis'

export async function checkRateLimit(/*...*/) {
  const key = `ratelimit:${identifier}:${clientIp}`

  // Получить счётчик из Redis
  const count = await redis.incr(key)

  if (count === 1) {
    // Установить TTL при первом запросе
    await redis.expire(key, Math.ceil(config.interval / 1000))
  }

  if (count > config.maxAttempts) {
    // Логика блокировки
  }

  // ...
}
```

## Тестирование

### Проверка rate limiting

```bash
# Отправить 6 запросов подряд (должен заблокировать на 6-м)
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo "\n---"
done
```

### Проверка headers

```bash
curl -i -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
```

## Мониторинг

Рекомендуется добавить метрики для отслеживания:
- Количество заблокированных IP
- Топ IP по количеству блокировок
- Частота срабатывания rate limiting
- Средняя длительность блокировок

```typescript
// Пример интеграции с metrics service
if (rateLimitError) {
  metrics.increment('rate_limit.blocked', {
    endpoint: identifier,
    ip: clientIp
  })
}
```

## Best Practices

1. **Разные лимиты для разных endpoints**
   - Строгие для auth (5/мин)
   - Средние для API (30/мин)
   - Мягкие для публичных данных (60/мин)

2. **Whitelist для доверенных IP**
   - API keys для партнёров
   - Internal services
   - Monitoring tools

3. **Graceful degradation**
   - Не возвращать 429 на критичных операциях без крайней необходимости
   - Информативные сообщения об ошибках

4. **Логирование и алерты**
   - Логировать все блокировки
   - Алерты при массовых блокировках (возможная атака)

5. **Тестирование**
   - Unit тесты для rate limiting логики
   - Load тесты для проверки производительности
   - E2E тесты для критичных флоу

## Security Notes

⚠️ **Важно:**
- Rate limiting - это защита первого уровня, не единственная
- Обязательно используйте сильные пароли и 2FA
- Логируйте все попытки авторизации
- Мониторьте подозрительную активность
- Используйте CAPTCHA после N неудачных попыток

## Roadmap

- [ ] Миграция на Redis для production
- [ ] Добавление CAPTCHA после 3 неудачных попыток
- [ ] Whitelist для доверенных IP
- [ ] Dashboard для мониторинга rate limits
- [ ] Exponential backoff для повторных блокировок
- [ ] Геолокация IP для дополнительной защиты
