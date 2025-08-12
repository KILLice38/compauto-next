import prisma from './prisma'

export async function getProductBySlug(slug: string) {
  const s = decodeURIComponent(slug)
  // можно findUnique, если у поля @unique
  return prisma.product.findUnique({ where: { slug: s } })
}

export function getAllProductSlugs() {
  return prisma.product.findMany({ select: { slug: true, updatedAt: true } })
}
