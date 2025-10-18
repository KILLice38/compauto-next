import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../lib/prisma'
import { requireAuth } from '../lib/auth'

/**
 * GET /api/filters
 * Получить все фильтры, сгруппированные по типу
 */
export async function GET() {
  try {
    const filters = await (prisma as any).filterOption.findMany({
      orderBy: [{ type: 'asc' }, { value: 'asc' }],
    })

    // Группируем по типу для удобства
    const grouped = {
      autoMark: filters
        .filter((f: { type: string }) => f.type === 'autoMark')
        .map((f: { id: number; value: string }) => ({ id: f.id, value: f.value })),
      engineModel: filters
        .filter((f: { type: string }) => f.type === 'engineModel')
        .map((f: { id: number; value: string }) => ({ id: f.id, value: f.value })),
      compressor: filters
        .filter((f: { type: string }) => f.type === 'compressor')
        .map((f: { id: number; value: string }) => ({ id: f.id, value: f.value })),
    }

    return NextResponse.json(grouped)
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
    const filterOption = await (prisma as any).filterOption.create({
      data: {
        type,
        value: value.trim(),
      },
    })

    return NextResponse.json(filterOption, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/filters] Error:', error)

    // Проверка на unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Это значение уже существует' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Failed to create filter option' }, { status: 500 })
  }
}
