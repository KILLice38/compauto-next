import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import { requireAuth } from '../../lib/auth'

/**
 * DELETE /api/filters/[id]
 * Удалить значение фильтра
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Проверка авторизации
  const authError = await requireAuth(req)
  if (authError) return authError

  try {
    const { id } = await params
    const filterId = parseInt(id, 10)

    if (isNaN(filterId)) {
      return NextResponse.json({ error: 'Invalid filter ID' }, { status: 400 })
    }

    // Проверяем, используется ли это значение в продуктах
    const filter = await prisma.filterOption.findUnique({
      where: { id: filterId },
    })

    if (!filter) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 })
    }

    // Проверяем использование
    const productsUsing = await prisma.product.count({
      where: {
        OR: [{ autoMark: filter.value }, { engineModel: filter.value }, { compressor: filter.value }],
      },
    })

    if (productsUsing > 0) {
      return NextResponse.json(
        {
          error: 'Невозможно удалить',
          message: `Этот фильтр используется в ${productsUsing} товаре(ах)`,
        },
        { status: 409 }
      )
    }

    // Удаляем
    await prisma.filterOption.delete({
      where: { id: filterId },
    })

    return NextResponse.json({ message: 'Filter deleted successfully' })
  } catch (error) {
    console.error('[DELETE /api/filters/:id] Error:', error)
    return NextResponse.json({ error: 'Failed to delete filter' }, { status: 500 })
  }
}
