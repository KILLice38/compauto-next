import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs/promises'

const prisma = new PrismaClient()
const DRY = process.env.DRY_RUN === '1'

// Корень public для работы: по умолчанию текущий проект/ public
const PUBLIC_ROOT = process.env.PUBLIC_ROOT ? path.resolve(process.env.PUBLIC_ROOT) : path.join(process.cwd(), 'public')

function toPublicAbs(pubPath: string) {
  const p = pubPath.startsWith('/') ? pubPath.slice(1) : pubPath
  return path.join(PUBLIC_ROOT, p)
}

function productDir(slug: string) {
  return path.join(PUBLIC_ROOT, 'uploads', 'products', slug)
}

function variantsFromSourcePub(pub: string) {
  // ожидаем путь вида /uploads/.../__source.webp
  const clean = pub.split('?')[0]
  if (!clean.endsWith('__source.webp')) {
    // если вдруг прилетел jpg/png — просто положим именно этот файл
    return [clean]
  }
  const base = clean.replace(/__source\.webp$/i, '')
  return [`${clean}`, `${base}__card.webp`, `${base}__detail.webp`, `${base}__thumb.webp`]
}

async function moveOne(pubSource: string, slug: string) {
  const dest = productDir(slug)
  await fs.mkdir(dest, { recursive: true })
  let newSource = pubSource

  for (const pub of variantsFromSourcePub(pubSource)) {
    const srcAbs = toPublicAbs(pub)
    const name = path.basename(srcAbs)
    const dstAbs = path.join(dest, name)

    try {
      // если уже на месте — скипаем
      if (srcAbs === dstAbs) continue

      // если файла в исходном месте нет — скипаем этот элемент
      await fs.stat(srcAbs).catch(() => Promise.reject(new Error('ENOENT')))

      if (!DRY) {
        // если в целевом месте уже есть файл — не затираем
        const exists = await fs
          .stat(dstAbs)
          .then(() => true)
          .catch(() => false)
        if (!exists) {
          await fs.rename(srcAbs, dstAbs).catch(async (e: any) => {
            if (e?.code === 'EXDEV') {
              // другой FS: копируем и удаляем
              const data = await fs.readFile(srcAbs)
              await fs.writeFile(dstAbs, data)
              await fs.unlink(srcAbs)
            } else {
              throw e
            }
          })
        } else {
          // целевой уже есть — исходный удалять не будем
        }
      }

      // обновим ссылку если это __source.webp
      if (pub.endsWith('__source.webp')) {
        newSource = `/uploads/products/${slug}/${name}`
      }
    } catch (e: any) {
      // пропускаем отсутствующие/проблемные файлы, но логируем
      console.warn(`[WARN] ${pub} -> ${slug}/${name}: ${e?.message || e}`)
    }
  }
  return newSource
}

async function main() {
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
