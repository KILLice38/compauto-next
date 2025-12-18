import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  interval: number // Временное окно в миллисекундах
  maxAttempts: number // Максимальное количество попыток
  blockDuration?: number // Время блокировки после превышения лимита (мс)
}

interface RateLimitEntry {
  count: number
  resetAt: number
  blockedUntil?: number
}

// In-memory хранилище для rate limiting
// ВАЖНО: В production рекомендуется использовать Redis для shared state между инстансами
const rateLimitStore = new Map<string, RateLimitEntry>()

// Очистка старых записей каждые 10 минут
setInterval(
  () => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      // Удаляем записи которые уже сброшены и не заблокированы
      if (entry.resetAt < now && (!entry.blockedUntil || entry.blockedUntil < now)) {
        rateLimitStore.delete(key)
      }
    }
  },
  10 * 60 * 1000
)

/**
 * Получить IP адрес из запроса
 */
function getClientIp(req: NextRequest): string {
  // Проверяем заголовки от прокси/CDN
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Cloudflare
  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Fallback - используем комбинацию headers для идентификации
  // В Next.js 15+ req.ip недоступен, используем user-agent + другие headers как fallback
  return 'unknown'
}

/**
 * Проверка rate limit
 * Возвращает null если запрос разрешён, иначе NextResponse с ошибкой 429
 */
export function checkRateLimit(req: NextRequest, identifier: string, config: RateLimitConfig): NextResponse | null {
  const clientIp = getClientIp(req)
  const key = `${identifier}:${clientIp}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Проверка блокировки
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.blockedUntil - now) / 1000)
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter: remainingSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(remainingSeconds),
          'X-RateLimit-Limit': String(config.maxAttempts),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(entry.blockedUntil / 1000)),
        },
      }
    )
  }

  // Инициализация или сброс счётчика
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 1,
      resetAt: now + config.interval,
    }
    rateLimitStore.set(key, entry)
    return null // Разрешён
  }

  // Увеличиваем счётчик
  entry.count++

  // Проверка превышения лимита
  if (entry.count > config.maxAttempts) {
    // Блокируем если указана длительность блокировки
    if (config.blockDuration) {
      entry.blockedUntil = now + config.blockDuration
      const remainingSeconds = Math.ceil(config.blockDuration / 1000)

      console.warn(`Rate limit exceeded for ${identifier} from ${clientIp}. Blocked for ${remainingSeconds}s`)

      return NextResponse.json(
        {
          error: 'Too many requests. Your IP has been temporarily blocked.',
          retryAfter: remainingSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(remainingSeconds),
            'X-RateLimit-Limit': String(config.maxAttempts),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(entry.blockedUntil / 1000)),
          },
        }
      )
    }

    // Без блокировки просто возвращаем 429
    const remainingSeconds = Math.ceil((entry.resetAt - now) / 1000)
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter: remainingSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(remainingSeconds),
          'X-RateLimit-Limit': String(config.maxAttempts),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(entry.resetAt / 1000)),
        },
      }
    )
  }

  // Запрос разрешён, добавляем rate limit headers
  rateLimitStore.set(key, entry)
  return null
}

/**
 * Предустановленные конфигурации rate limiting
 */
export const RateLimitPresets = {
  // Строгий лимит для auth endpoints (5 попыток в минуту, блокировка на 15 минут)
  AUTH_STRICT: {
    interval: 60 * 1000, // 1 минута
    maxAttempts: 5,
    blockDuration: 15 * 60 * 1000, // 15 минут
  },

  // Средний лимит для auth endpoints (10 попыток в 5 минут, блокировка на 5 минут)
  AUTH_MODERATE: {
    interval: 5 * 60 * 1000, // 5 минут
    maxAttempts: 10,
    blockDuration: 5 * 60 * 1000, // 5 минут
  },

  // Лёгкий лимит для общих API endpoints (60 запросов в минуту)
  API_LIGHT: {
    interval: 60 * 1000, // 1 минута
    maxAttempts: 60,
  },

  // Средний лимит для API endpoints (30 запросов в минуту)
  API_MODERATE: {
    interval: 60 * 1000, // 1 минута
    maxAttempts: 30,
  },
} as const

/**
 * Middleware wrapper для добавления rate limiting
 * Используется в API routes
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  identifier: string,
  config: RateLimitConfig
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const rateLimitError = checkRateLimit(req, identifier, config)
    if (rateLimitError) {
      return rateLimitError
    }
    return handler(req)
  }
}

/**
 * Сброс rate limit для конкретного IP (для admin operations)
 */
export function resetRateLimit(identifier: string, clientIp: string): void {
  const key = `${identifier}:${clientIp}`
  rateLimitStore.delete(key)
}

/**
 * Получить текущий статус rate limit
 */
export function getRateLimitStatus(identifier: string, clientIp: string): RateLimitEntry | null {
  const key = `${identifier}:${clientIp}`
  return rateLimitStore.get(key) || null
}
