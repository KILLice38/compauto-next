// app/api/cron/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { cleanupOldTmpFiles } from '../../lib/cleanup'

export const runtime = 'nodejs'

/**
 * Timing-safe token comparison
 * Prevents timing attacks by using constant-time comparison
 */
function isValidToken(provided: string | undefined, expected: string): boolean {
  if (!provided) return false

  // Convert to buffers for timingSafeEqual
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)

  // If lengths differ, compare with expected to prevent timing leak
  // We still need to do the comparison to maintain constant time
  if (providedBuffer.length !== expectedBuffer.length) {
    // Compare expected with itself to maintain constant time
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer)
    return false
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
}

/**
 * Cron endpoint для автоматической очистки временных файлов
 * Вызывается внешним cron-сервисом (например, Vercel Cron, или системным cron)
 *
 * Для защиты используется секретный ключ из переменной окружения CRON_SECRET
 */
export async function GET(req: NextRequest) {
  try {
    // Проверка авторизации через секретный ключ
    const authHeader = req.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET

    if (!expectedToken) {
      console.error('CRON_SECRET is not configured')
      return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
    }

    // Проверяем токен в формате "Bearer <token>" или просто "<token>"
    const providedToken = authHeader?.replace(/^Bearer\s+/i, '')

    if (!isValidToken(providedToken, expectedToken)) {
      console.warn('Unauthorized cron attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting scheduled tmp cleanup...')
    const result = await cleanupOldTmpFiles()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      deletedDirs: result.deletedDirs,
      deletedFiles: result.deletedFiles,
      errors: result.errors,
    })
  } catch (error) {
    console.error('Cron cleanup failed:', error)
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
