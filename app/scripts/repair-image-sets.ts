import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import { promises as fs } from 'fs'
import sharp from 'sharp'

const prisma = new PrismaClient()
const BG = { r: 255, g: 255, b: 255, alpha: 1 }

function abs(u: string) {
  return path.join(process.cwd(), 'public', u.startsWith('/') ? u.slice(1) : u)
}
function dir(u: string) {
  return path.dirname(abs(u))
}
function file(u: string) {
  return path.basename(abs(u))
}
function stripQuery(u: string) {
  const i = u.indexOf('?')
  return i >= 0 ? u.slice(0, i) : u
}
function noExt(p: string) {
  const i = p.lastIndexOf('.')
  return i >= 0 ? p.slice(0, i) : p
}

function baseNoSource(pub: string) {
  const clean = stripQuery(pub)
  const base = noExt(clean)
  return base.endsWith('__source') ? base.slice(0, -'__source'.length) : base
}
function pubSource(pubBaseNoSource: string) {
  return `${pubBaseNoSource}__source.webp`
}
function pubVariant(pubBaseNoSource: string, suf: 'card' | 'detail' | 'thumb') {
  return `${pubBaseNoSource}__${suf}.webp`
}

function absFromPub(pub: string) {
  return abs(pub)
}
function exists(p: string) {
  return fs
    .stat(p)
    .then(() => true)
    .catch(() => false)
}

async function renameIfExists(oldAbs: string, newAbs: string) {
  if (await exists(oldAbs)) {
    await fs.mkdir(path.dirname(newAbs), { recursive: true })
    await fs.rename(oldAbs, newAbs)
    return true
  }
  return false
}

async function ensureVariantsFromSource(absSource: string) {
  const buf = await fs.readFile(absSource)
  const targets = [
    { suf: 'card', w: 260, h: 260 },
    { suf: 'detail', w: 460, h: 299 },
    { suf: 'thumb', w: 106, h: 69 },
  ] as const
  for (const t of targets) {
    const out = absFromPub(
      pubVariant(
        noExt(absSource)
          .replace(/\\/g, '/')
          .replace(/^.*public/, '')
          .replace(/^/, '')
          .replace(/^/, '/') /*unused*/,
        t.suf
      )
    )
    // проще:
    const outAbs = absSource.replace('__source.webp', `__${t.suf}.webp`)
    if (!(await exists(outAbs))) {
      await sharp(buf)
        .resize(t.w, t.h, { fit: 'contain', background: BG })
        .toFormat('webp', { quality: 82 })
        .toFile(outAbs)
      console.log('created', outAbs)
    }
  }
}

function isRaster(p: string) {
  return /\.(png|jpg|jpeg)$/i.test(p)
}

async function normalizeOnePublicUrl(pubUrl: string) {
  // Нормализуем файловый набор и вернём КАНОНИЧЕСКИЙ public URL на __source.webp
  const clean = stripQuery(pubUrl)
  const baseNS = baseNoSource(clean)
  const pubSrc = pubSource(baseNS)
  const pubCard = pubVariant(baseNS, 'card')
  const pubDet = pubVariant(baseNS, 'detail')
  const pubTh = pubVariant(baseNS, 'thumb')

  const absSrc = absFromPub(pubSrc)
  const absCard = absFromPub(pubCard)
  const absDet = absFromPub(pubDet)
  const absTh = absFromPub(pubTh)

  // 1) Переименуем двойные суффиксы -> одиночные
  const doubles = [
    absFromPub(`${baseNS}__source__card.webp`),
    absCard,
    absFromPub(`${baseNS}__source__detail.webp`),
    absDet,
    absFromPub(`${baseNS}__source__thumb.webp`),
    absTh,
  ]
  await renameIfExists(doubles[0], doubles[1])
  await renameIfExists(doubles[2], doubles[3])
  await renameIfExists(doubles[4], doubles[5])

  // 2) Если absSrc нет, но есть оригинал .png/.jpg — конвертим в source
  const candidates = [absFromPub(`${baseNS}.png`), absFromPub(`${baseNS}.jpg`), absFromPub(`${baseNS}.jpeg`)]
  if (!(await exists(absSrc))) {
    for (const c of candidates) {
      if (await exists(c)) {
        const buf = await fs.readFile(c)
        await sharp(buf)
          .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
          .toFormat('webp', { quality: 90 })
          .toFile(absSrc)
        // удаляем оригинал
        try {
          await fs.unlink(c)
        } catch {}
        break
      }
    }
  }

  // 3) Если absSrc вдруг сгенерился не тут — ничего; если есть absSrc — догенерим варианты
  if (await exists(absSrc)) {
    await ensureVariantsFromSource(absSrc)
  }

  // 4) Подчистим оставшиеся исходники, если absSrc уже есть
  for (const c of candidates) {
    if ((await exists(absSrc)) && (await exists(c))) {
      try {
        await fs.unlink(c)
      } catch {}
    }
  }

  return pubSrc // канонический URL
}

async function main() {
  const items = await prisma.product.findMany({ select: { id: true, img: true, gallery: true } })

  for (const p of items) {
    let changed = false
    let img = p.img
    let gal = p.gallery ?? []

    if (img) {
      const canonical = await normalizeOnePublicUrl(img)
      if (canonical !== img) {
        img = canonical
        changed = true
      }
    }

    const newGal: string[] = []
    for (const g of gal) {
      const canonical = await normalizeOnePublicUrl(g)
      newGal.push(canonical)
      if (canonical !== g) changed = true
    }

    if (changed) {
      await prisma.product.update({ where: { id: p.id }, data: { img, gallery: newGal } })
      console.log('DB updated', p.id)
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
