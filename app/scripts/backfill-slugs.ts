import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const prisma = new PrismaClient({
  adapter: new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL })),
})

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

function randomSuffix(len = 6) {
  return Math.random()
    .toString(36)
    .slice(2, 2 + len)
}

async function ensureUniqueSlug(base: string) {
  let attempt = 0
  while (true) {
    const candidate = attempt === 0 ? `${base}-${randomSuffix()}` : `${base}-${randomSuffix(8)}`
    const exists = await prisma.product.findUnique({ where: { slug: candidate } })
    if (!exists) return candidate
    attempt++
  }
}

async function main() {
  const items = await prisma.product.findMany({ where: { slug: '' } })

  for (const p of items) {
    const base = slugify(p.title || `product-${p.id}`)
    const slug = await ensureUniqueSlug(base)
    await prisma.product.update({
      where: { id: p.id },
      data: { slug },
    })
    console.log(`Backfilled #${p.id} -> ${slug}`)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
