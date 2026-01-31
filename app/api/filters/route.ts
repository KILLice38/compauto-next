import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../lib/prisma'
import { requireAuth, getCurrentUser } from '../lib/auth'
import { audit } from '../lib/auditLog'

/**
 * GET /api/filters
 * Получить все фильтры, сгруппированные по типу
 * Оптимизировано: 3 параллельных запроса вместо загрузки всех + фильтрация в памяти
 * Кэширование: 5 минут + stale-while-revalidate 10 минут
 */
export async function GET() {
  try {
    // Параллельные запросы к БД — каждый фильтрует на уровне SQL
    const [autoMark, engineModel, compressor] = await Promise.all([
      prisma.filterOption.findMany({
        where: { type: 'autoMark' },
        select: { id: true, value: true },
        orderBy: { value: 'asc' },
      }),
      prisma.filterOption.findMany({
        where: { type: 'engineModel' },
        select: { id: true, value: true },
        orderBy: { value: 'asc' },
      }),
      prisma.filterOption.findMany({
        where: { type: 'compressor' },
        select: { id: true, value: true },
        orderBy: { value: 'asc' },
      }),
    ])

    return NextResponse.json(
      { autoMark, engineModel, compressor },
      {
        headers: {
          // Фильтры меняются редко — кэшируем на 5 минут
          // stale-while-revalidate позволяет отдавать устаревший кэш пока идёт обновление
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('[GET /api/filters] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 })
  }
}

/**
 * POST /api/filters
 * Добавить новое значение фильтра
 * Body: { type: 'autoMark' | 'engineModel' | 'compressor', value: string }
 */
export async function POST(req: NextRequest) {
  // Проверка авторизации
  const authError = await requireAuth(req)
  if (authError) return authError

  try {
    const body = await req.json()
    const { type, value } = body

    // Валидация
    if (!type || !value) {
      return NextResponse.json({ error: 'Type and value are required' }, { status: 400 })
    }

    if (!['autoMark', 'engineModel', 'compressor'].includes(type)) {
      return NextResponse.json({ error: 'Invalid filter type' }, { status: 400 })
    }

    if (value.trim().length === 0) {
      return NextResponse.json({ error: 'Value cannot be empty' }, { status: 400 })
    }

    // Создаем запись (unique constraint предотвратит дубликаты)
    const filterOption = await prisma.filterOption.create({
      data: {
        type,
        value: value.trim(),
      },
    })

    // Логируем создание фильтра
    const user = await getCurrentUser(req)
    await audit.filterCreated(
      { id: filterOption.id, value: filterOption.value, type: filterOption.type },
      user ? { id: user.id as string, email: user.email as string } : null,
      req
    )

    return NextResponse.json(filterOption, { status: 201 })
  } catch (error) {
    console.error('[POST /api/filters] Error:', error)

    // Проверка на unique constraint violation
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Это значение уже существует' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Failed to create filter option' }, { status: 500 })
  }
}
