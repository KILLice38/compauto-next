import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Генерируем nonce для каждого запроса
function generateNonce() {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64')
}

// CSP header с nonce вместо unsafe-inline
function buildCSPHeader(nonce: string) {
  const isDev = process.env.NODE_ENV === 'development'

  // В development режиме Next.js требует eval для HMR
  // Разрешаем unsafe-inline для JSON-LD скриптов (они статические и безопасные)
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'unsafe-inline'`

  return `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https://*.vercel.app http://localhost:* ws://localhost:*;
    form-action 'self';
    frame-ancestors 'none';
    base-uri 'self';
    object-src 'none';
  `
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Генерируем nonce для каждого запроса
  const nonce = generateNonce()
  const cspHeader = buildCSPHeader(nonce)

  // Для не-админских страниц просто добавляем CSP header
  if (!pathname.startsWith('/admin')) {
    const response = NextResponse.next()
    response.headers.set('Content-Security-Policy', cspHeader)
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    // Передаём nonce для использования в компонентах (если понадобится)
    response.headers.set('x-nonce', nonce)
    return response
  }

  // Для login и auth страниц только CSP
  if (pathname === '/admin/login' || pathname.startsWith('/api/auth')) {
    const response = NextResponse.next()
    response.headers.set('Content-Security-Policy', cspHeader)
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('x-nonce', nonce)
    return response
  }

  // Проверяем авторизацию для остальных админских страниц
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === 'production',
  })

  if (!token) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/admin/login'
    return NextResponse.redirect(loginUrl)
  }

  // Возвращаем ответ с security headers
  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', cspHeader)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('x-nonce', nonce)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
