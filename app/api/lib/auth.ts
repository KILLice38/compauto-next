import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Проверяет авторизацию пользователя для API route
 * Возвращает null если авторизован, иначе NextResponse с ошибкой 401
 */
export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 })
  }

  return null
}

/**
 * Получает токен текущего пользователя
 */
export async function getCurrentUser(req: NextRequest) {
  return await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })
}
