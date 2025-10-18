// scripts/check-db-images.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      img: true,
      gallery: true,
    },
    take: 5,
  })

  console.log('=== Первые 5 продуктов из БД ===\n')
  products.forEach((p) => {
    console.log(`ID: ${p.id}`)
    console.log(`Название: ${p.title}`)
    console.log(`Slug: ${p.slug}`)
    console.log(`Главное изображение: ${p.img}`)
    console.log(`Галерея (${p.gallery?.length || 0} шт):`)
    p.gallery?.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`)
    })
    console.log('---\n')
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
