import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const data = await req.json()

  try {
    // Сначала достаём текущий продукт из БД
    const currentProduct = await prisma.product.findUnique({
      where: { id: Number(id) },
    })

    if (!currentProduct) {
      return NextResponse.json({ error: 'Продукт не найден' }, { status: 404 })
    }

    // Если в данных на обновление есть поле img и оно отличается от текущего —
    // удаляем старый файл изображения
    if (data.img && data.img !== currentProduct.img && currentProduct.img) {
      const relativePath = currentProduct.img.startsWith('/') ? currentProduct.img.slice(1) : currentProduct.img
      const filePath = path.join(process.cwd(), 'public', relativePath)

      try {
        await fs.unlink(filePath)
      } catch (err) {
        console.warn(`Не удалось удалить старый файл изображения: ${filePath}`, err)
      }
    }

    // Обновляем продукт в базе
    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
    })

    if (!product) {
      return NextResponse.json({ error: 'Продукт не найден' }, { status: 404 })
    }

    if (product.img) {
      const relativePath = product.img.startsWith('/') ? product.img.slice(1) : product.img

      const filePath = path.join(process.cwd(), 'public', relativePath)

      try {
        await fs.unlink(filePath)
      } catch (err) {
        console.warn(`Не удалось удалить файл изображения: ${filePath}`, err)
      }
    }

    await prisma.product.delete({
      where: { id: Number(id) },
    })

    return NextResponse.json({ message: 'Продукт успешно удалён' })
  } catch (error) {
    console.error('Ошибка при удалении продукта:', error)
    return NextResponse.json({ error: 'Ошибка при удалении продукта' }, { status: 500 })
  }
}
