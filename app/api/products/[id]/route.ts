import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const data = await req.json()
  const { id } = context.params

  try {
    const updated = await prisma.product.update({
      where: { id: Number(id) },
      data,
    })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params

  try {
    await prisma.product.delete({
      where: { id: Number(id) },
    })
    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
