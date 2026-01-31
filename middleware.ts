import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Генерируем nonce для каждого запроса
function generateNonce() {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64')
}

// CSP header для Next.js 15
function buildCSPHeader(nonce: string) {
  const isDev = process.env.NODE_ENV === 'development'

  // Next.js 15 в production генерирует inline скрипты без nonce
  // Поэтому используем 'unsafe-inline' без nonce для совместимости
  // TODO: После обновления Next.js проверить поддержку nonce
  const scriptSrc = isDev ? `'self' 'unsafe-inline' 'unsafe-eval'` : `'self' 'unsafe-inline'`

  // В development разрешаем localhost для HMR, в production только 'self'
  const connectSrc = isDev ? `'self' http://localhost:* ws://localhost:* wss://localhost:*` : `'self'`

  // upgrade-insecure-requests только в production
  const upgradeInsecure = isDev ? '' : 'upgrade-insecure-requests;'

  return `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src ${connectSrc};
    form-action 'self';
    frame-ancestors 'none';
    base-uri 'self';
    object-src 'none';
    worker-src 'self' blob:;
    child-src 'self' blob:;
    manifest-src 'self';
    media-src 'self';
    ${upgradeInsecure}
  `
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// Permissions-Policy header - ограничивает доступ к браузерным API
function buildPermissionsPolicy() {
  return [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
    'interest-cohort=()', // Отключаем FLoC tracking
  ].join(', ')
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Генерируем nonce для каждого запроса
  const nonce = generateNonce()
  const cspHeader = buildCSPHeader(nonce)

  // Для не-админских страниц просто добавляем security headers
  if (!pathname.startsWith('/admin')) {
    const response = NextResponse.next()
    response.headers.set('Content-Security-Policy', cspHeader)
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', buildPermissionsPolicy())
    // Передаём nonce для использования в компонентах (если понадобится)
    response.headers.set('x-nonce', nonce)
    return response
  }

  // Для login и auth страниц security headers без проверки авторизации
  if (pathname === '/admin/login' || pathname.startsWith('/api/auth')) {
    const response = NextResponse.next()
    response.headers.set('Content-Security-Policy', cspHeader)
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', buildPermissionsPolicy())
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
    // Используем X-Forwarded заголовки от nginx для правильного URL
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host
    const proto = req.headers.get('x-forwarded-proto') || 'https'
    const loginUrl = new URL('/admin/login', `${proto}://${host}`)
    return NextResponse.redirect(loginUrl)
  }

  // Возвращаем ответ с security headers для авторизованных пользователей
  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', cspHeader)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', buildPermissionsPolicy())
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
