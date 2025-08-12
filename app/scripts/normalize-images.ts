// app/scripts/normalize-images.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import { promises as fs } from 'fs'
import sharp from 'sharp'

const prisma = new PrismaClient()

const VARS = ['source', 'card', 'detail', 'thumb'] as const
const SIZES: Record<string, { w: number; h: number; quality: number; fit: 'contain' }> = {
  card: { w: 260, h: 260, quality: 82, fit: 'contain' },
  detail: { w: 460, h: 299, quality: 82, fit: 'contain' },
  thumb: { w: 106, h: 69, quality: 82, fit: 'contain' },
}
const BG = { r: 255, g: 255, b: 255, alpha: 1 }

function absFromPublic(u: string) {
  return path.join(process.cwd(), 'public', u.startsWith('/') ? u.slice(1) : u)
}
function withSuffixPublic(u: string, suf: (typeof VARS)[number]) {
  const clean = u.split('?')[0]
  const dot = clean.lastIndexOf('.')
  const base = dot >= 0 ? clean.slice(0, dot) : clean
  if (suf === 'source') return `${base}__source.webp`
  return `${base.replace(/__source$/, '')}__${suf}.webp`
}
function webpSourcePublic(u: string) {
  const clean = u.split('?')[0]
  if (clean.endsWith('__source.webp')) return clean
  const dot = clean.lastIndexOf('.')
  const base = dot >= 0 ? clean.slice(0, dot) : clean
  return `${base}__source.webp`
}
async function exists(p: string) {
  try {
    await fs.stat(p)
    return true
  } catch {
    return false
  }
}

async function ensureDerivativesFromSource(sourceAbs: string) {
  const buf = await fs.readFile(sourceAbs)
  for (const key of ['card', 'detail', 'thumb'] as const) {
    const outAbs = sourceAbs.replace('__source.webp', `__${key}.webp`)
    if (!(await exists(outAbs))) {
      const { w, h, quality } = SIZES[key]
      await sharp(buf).resize(w, h, { fit: 'contain', background: BG }).toFormat('webp', { quality }).toFile(outAbs)
      console.log('created', outAbs)
    }
  }
}

async function normalizeOne(url: string): Promise<string> {
  // Возвращает новый public URL на __source.webp
  const srcAbsCandidate = absFromPublic(webpSourcePublic(url))
  const origAbs = absFromPublic(url)

  if (await exists(srcAbsCandidate)) {
    await ensureDerivativesFromSource(srcAbsCandidate)
    // удалить оригинал, если это не __source
    if (origAbs !== srcAbsCandidate && (await exists(origAbs))) {
      try {
        await fs.unlink(origAbs)
      } catch {}
    }
    return webpSourcePublic(url)
  }

  // нужно создать source из оригинала (jpg/png/webp без __source)
  const buf = await fs.readFile(origAbs)
  await sharp(buf)
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .toFormat('webp', { quality: 90 })
    .toFile(srcAbsCandidate)

  await ensureDerivativesFromSource(srcAbsCandidate)

  // удалить оригинал
  try {
    await fs.unlink(origAbs)
  } catch {}

  return webpSourcePublic(url)
}

async function main() {
  const items = await prisma.product.findMany({
    select: { id: true, slug: true, img: true, gallery: true },
  })

  for (const p of items) {
    let img = p.img
    let gal = p.gallery ?? []

    if (img) {
      const newImg = await normalizeOne(img)
      if (newImg !== img) img = newImg
    }

    const newGal: string[] = []
    for (const g of gal) {
      const newG = await normalizeOne(g)
      newGal.push(newG)
    }

    // апдейт БД если были изменения
    if (img !== p.img || JSON.stringify(newGal) !== JSON.stringify(gal)) {
      await prisma.product.update({
        where: { id: p.id },
        data: { img, gallery: newGal },
      })
      console.log(`updated #${p.id}`)
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
