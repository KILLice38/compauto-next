import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self' data:;
  connect-src 'self' https://*.vercel.app http://localhost:*;
  form-action 'self';
  frame-ancestors 'none';
  base-uri 'self';
`
  .replace(/\s{2,}/g, ' ')
  .trim()

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  if (pathname === '/admin/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

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

  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', cspHeader)
  return response
}

export const config = {
  matcher: '/admin/:path*',
}
