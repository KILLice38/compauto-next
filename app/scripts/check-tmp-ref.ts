import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function hasTmpToken(u: string | null | undefined, token: string) {
  if (!u) return false
  return u.includes(`/uploads/tmp/${token}/`)
}

async function main(token: string) {
  if (!token) throw new Error('Укажи токен: npx tsx app/scripts/check-tmp-ref.ts <tmp-token>')

  const rows = await prisma.product.findMany({
    select: { id: true, slug: true, img: true, gallery: true },
  })

  const imgRefs = rows.filter((r: { img: string | null }) => hasTmpToken(r.img, token))
  const galRefs = rows
    .map((r: { id: number; slug: string; gallery: string[] | null }) => ({
      id: r.id,
      slug: r.slug,
      used: (r.gallery ?? []).some((g: string) => hasTmpToken(g, token)),
    }))
    .filter((r: { used: boolean }) => r.used)
    .map(({ id, slug }: { id: number; slug: string }) => ({ id, slug }))

  console.log('IMG refs:', imgRefs)
  console.log('GALLERY refs:', galRefs)
}

const token = process.argv[2]
main(token)
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
