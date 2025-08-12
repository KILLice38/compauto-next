// app/scripts/backfill-image-variants.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import { promises as fs } from 'fs'
import sharp from 'sharp'

const prisma = new PrismaClient()

function absFromPublic(url: string) {
  return path.join(process.cwd(), 'public', url.startsWith('/') ? url.slice(1) : url)
}
function withSuffix(filePath: string, suffix: string, newExt = 'webp') {
  const ext = path.extname(filePath)
  const base = filePath.slice(0, -ext.length)
  return `${base}__${suffix}.${newExt}`
}
async function exists(p: string) {
  try {
    await fs.stat(p)
    return true
  } catch {
    return false
  }
}

async function genVariants(absOriginal: string) {
  const buf = await fs.readFile(absOriginal)
  const targets = [
    { suf: 'card', w: 260, h: 260 },
    { suf: 'detail', w: 460, h: 299 },
    { suf: 'thumb', w: 106, h: 69 },
  ]
  for (const t of targets) {
    const out = withSuffix(absOriginal, t.suf)
    if (!(await exists(out))) {
      await sharp(buf)
        .resize(t.w, t.h, { fit: 'cover', position: 'attention' })
        .toFormat('webp', { quality: 82 })
        .toFile(out)
      console.log('created', out)
    }
  }
}

async function main() {
  const items = await prisma.product.findMany({ select: { img: true, gallery: true, id: true } })
  for (const p of items) {
    if (p.img) {
      const abs = absFromPublic(p.img)
      if (await exists(abs)) await genVariants(abs)
    }
    for (const g of p.gallery ?? []) {
      const abs = absFromPublic(g)
      if (await exists(abs)) await genVariants(abs)
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
