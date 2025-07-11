import { NextRequest, NextResponse } from 'next/server'
import dotenv from 'dotenv'
dotenv.config()
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const data = await req.json()

  try {
    const product = await prisma.product.create({ data })
    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof Error) {
      console.error('Prisma error:', error.message)
    } else {
      console.error('Unknown error:', error)
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const skip = Number(url.searchParams.get('skip')) || 0
    const take = Number(url.searchParams.get('take')) || 10

    const products = await prisma.product.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
