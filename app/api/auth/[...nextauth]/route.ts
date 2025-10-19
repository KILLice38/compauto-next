import NextAuth from 'next-auth'
import type { NextRequest } from 'next/server'
import { authOptions } from '../authOptions'
import { checkRateLimit, RateLimitPresets } from '../../lib/rateLimit'

const handler = NextAuth(authOptions)

// GET запросы (session checks, CSRF tokens) - без rate limiting
export { handler as GET }

// POST запросы (signin, signout, callback) - с rate limiting
export async function POST(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  // Применяем строгий rate limit для auth endpoints
  const rateLimitError = checkRateLimit(req, 'auth', RateLimitPresets.AUTH_STRICT)
  if (rateLimitError) {
    return rateLimitError
  }

  return handler(req, context)
}
