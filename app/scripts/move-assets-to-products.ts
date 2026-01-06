import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import path from 'path'
import fs from 'fs/promises'

const prisma = new PrismaClient({
  adapter: new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL })),
})
const DRY = process.env.DRY_RUN === '1'
const PUBLIC_ROOT = process.env.PUBLIC_ROOT ? path.resolve(process.env.PUBLIC_ROOT) : path.join(process.cwd(), 'public')

function toPublicAbs(pubPath: string) {
  const p = pubPath.startsWith('/') ? pubPath.slice(1) : pubPath
  return path.join(PUBLIC_ROOT, p)
}

function productDir(slug: string) {
  return path.join(PUBLIC_ROOT, 'uploads', 'products', slug)
}

function variantsFromSourcePub(pub: string): string[] {
  const clean = pub.split('?')[0]
  if (!clean.endsWith('__source.webp')) return [clean]
  const base = clean.replace(/__source\.webp$/i, '')
  return [`${clean}`, `${base}__card.webp`, `${base}__detail.webp`, `${base}__thumb.webp`]
}

async function moveOne(pubSource: string, slug: string): Promise<string> {
  const dest = productDir(slug)
  await fs.mkdir(dest, { recursive: true })
  let newSource = pubSource

  for (const pub of variantsFromSourcePub(pubSource)) {
    const srcAbs = toPublicAbs(pub)
    const name = path.basename(srcAbs)
    const dstAbs = path.join(dest, name)

    try {
      if (srcAbs === dstAbs) continue

      // бросим явную ошибку, если файла нет
      await fs.stat(srcAbs)

      if (!DRY) {
        const exists = await fs
          .stat(dstAbs)
          .then(() => true)
          .catch(() => false)
        if (!exists) {
          await fs.rename(srcAbs, dstAbs).catch(async (e: unknown) => {
            const err = e as NodeJS.ErrnoException
            if (err?.code === 'EXDEV') {
              const data = await fs.readFile(srcAbs)
              await fs.writeFile(dstAbs, data)
              await fs.unlink(srcAbs)
            } else {
              throw err
            }
          })
        }
      }

      if (pub.endsWith('__source.webp')) {
        newSource = `/uploads/products/${slug}/${name}`
      }
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException
      console.warn(`[WARN] ${pub} -> ${slug}/${name}: ${err?.message ?? String(e)}`)
    }
  }
  return newSource
}

async function main(): Promise<void> {
  const rows = await prisma.product.findMany({
    select: { id: true, slug: true, img: true, gallery: true },
  })

  let touched = 0
  for (const p of rows) {
    if (!p.slug || p.slug.trim() === '') {
      console.warn(`[SKIP] id=${p.id} без slug`)
      continue
    }

    let changed = false
    let newImg = p.img
    if (p.img && !p.img.startsWith(`/uploads/products/${p.slug}/`)) {
      const moved = await moveOne(p.img, p.slug)
      if (moved !== p.img) {
        newImg = moved
        changed = true
      }
    }

    const newGal: string[] = []
    for (const g of p.gallery ?? []) {
      if (g && !g.startsWith(`/uploads/products/${p.slug}/`)) {
        const moved = await moveOne(g, p.slug)
        newGal.push(moved)
        if (moved !== g) changed = true
      } else if (g) {
        newGal.push(g)
      }
    }

    if (changed && !DRY) {
      await prisma.product.update({
        where: { id: p.id },
        data: { img: newImg, gallery: newGal },
      })
      touched++
      console.log(`[OK] id=${p.id} -> products/${p.slug}`)
    } else if (changed && DRY) {
      console.log(`[DRY] id=${p.id} будет перенесён`)
    }
  }

  console.log(`Done. ${DRY ? '(dry-run) ' : ''}updated=${touched}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
