// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../lib/prisma'
import path from 'path'
import { promises as fs } from 'fs'

/** --- helpers --- */
function isTmp(u: string) {
  return /\/uploads\/tmp\//.test(u)
}
function absFromPublic(u: string) {
  const rel = u.startsWith('/') ? u.slice(1) : u
  return path.join(process.cwd(), 'public', rel)
}
function productDir(slug: string) {
  return path.join(process.cwd(), 'public', 'uploads', 'products', slug)
}
function tmpFolderAbs(token: string) {
  return path.join(process.cwd(), 'public', 'uploads', 'tmp', token)
}
function tokenFromUrl(u: string): string | null {
  const m = u.match(/\/uploads\/tmp\/([^/]+)/)
  return m?.[1] ?? null
}
function stripQuery(u: string) {
  const i = u.indexOf('?')
  return i >= 0 ? u.slice(0, i) : u
}
function baseNoVariantNoExt(pub: string) {
  const clean = stripQuery(pub)
  const dot = clean.lastIndexOf('.')
  const noExt = dot >= 0 ? clean.slice(0, dot) : clean
  return noExt.replace(/__(source|card|detail|thumb)$/i, '')
}
function allVariantPublicsFromAny(pub: string) {
  const base = baseNoVariantNoExt(pub)
  return [`${base}__source.webp`, `${base}__card.webp`, `${base}__detail.webp`, `${base}__thumb.webp`]
}
async function isDirEffectivelyEmpty(dir: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      if (e.isFile()) return false
      if (e.isDirectory()) {
        if (!(await isDirEffectivelyEmpty(path.join(dir, e.name)))) return false
      }
    }
    return true
  } catch {
    return true
  }
}
async function pruneFolderIfEmpty(dir: string) {
  try {
    if (await isDirEffectivelyEmpty(dir)) {
      await fs.rm(dir, { recursive: true, force: true })
    }
  } catch {}
}

/**
 * Переносит набор (__source/__card/__detail/__thumb) из tmp → products/<slug>.
 * Возвращает: { url: publicUrlНа__source.webp, token?: tmpTokenIfAny }
 */
async function finalizeAsset(sourceUrl: string, slug: string): Promise<{ url: string; token?: string }> {
  if (!isTmp(sourceUrl)) {
    return { url: sourceUrl } // уже в products или внешний URL
  }

  const token = tokenFromUrl(sourceUrl) ?? undefined
  const targetDir = productDir(slug)
  await fs.mkdir(targetDir, { recursive: true })

  const publics = allVariantPublicsFromAny(sourceUrl)
  let finalSourceUrl = ''
  for (const pub of publics) {
    const absOld = absFromPublic(pub)
    const fileName = path.basename(absOld)
    const absNew = path.join(targetDir, fileName)
    try {
      await fs.rename(absOld, absNew) // move если файл есть
      if (fileName.endsWith('__source.webp')) {
        finalSourceUrl = `/uploads/products/${slug}/${fileName}`
      }
    } catch {
      // варианта могло не быть — ок
    }
  }

  if (!finalSourceUrl) {
    // подстраховка, если __source.webp не перенесли (но исходный base известен)
    const base = baseNoVariantNoExt(sourceUrl)
    const fileName = `${path.basename(base)}__source.webp`
    finalSourceUrl = `/uploads/products/${slug}/${fileName}`
  }

  return { url: finalSourceUrl, token }
}

/** --- slug helpers --- */
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

/** --- handlers --- */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json()
    if (!raw.title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
    if (!raw.img) return NextResponse.json({ error: 'Main image required' }, { status: 400 })

    // 1) slug
    const base = slugify(raw.title)
    const slug = `${base}-${randomSuffix()}`

    // 2) перенос ассетов + сбор использованных tmp-токенов
    const usedTokens = new Set<string>()

    const imgRes = await finalizeAsset(raw.img, slug)
    if (imgRes.token) usedTokens.add(imgRes.token)
    const img = imgRes.url

    const gallery: string[] = []
    if (Array.isArray(raw.gallery)) {
      for (const u of raw.gallery) {
        if (typeof u !== 'string') continue
        const gRes = await finalizeAsset(u, slug)
        if (gRes.token) usedTokens.add(gRes.token)
        gallery.push(gRes.url)
      }
    }

    const details: string[] | undefined = Array.isArray(raw.details)
      ? raw.details.map((s: string) => s.trim()).filter(Boolean)
      : undefined

    // 3) создаём продукт
    const product = await prisma.product.create({
      data: {
        ...raw,
        slug,
        img,
        gallery: gallery.slice(0, 4),
        details,
      },
    })

    // 4) чистим пустые tmp/<token>
    await Promise.all(
      Array.from(usedTokens).map(async (t) => {
        await pruneFolderIfEmpty(tmpFolderAbs(t))
      })
    )

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Prisma create error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const skip = Number(url.searchParams.get('skip')) || 0
    const take = Number(url.searchParams.get('take')) || 12

    // Filtering parameters
    const search = url.searchParams.get('search')
    const autoMark = url.searchParams.get('autoMark')
    const engineModel = url.searchParams.get('engineModel')
    const compressor = url.searchParams.get('compressor')

    // Sorting parameter
    const sort = url.searchParams.get('sort') // 'recent' | 'az' | 'za' | 'priceAsc' | 'priceDesc'

    // Build where clause for filtering
    const where: any = {}

    if (search) {
      where.title = { contains: search, mode: 'insensitive' }
    }

    if (autoMark) {
      where.autoMark = autoMark
    }

    if (engineModel) {
      where.engineModel = engineModel
    }

    if (compressor) {
      where.compressor = compressor
    }

    // Build orderBy clause for sorting
    let orderBy: any = { createdAt: 'desc' } // default

    if (sort === 'az') {
      orderBy = { title: 'asc' }
    } else if (sort === 'za') {
      orderBy = { title: 'desc' }
    } else if (sort === 'priceAsc') {
      orderBy = { price: 'asc' }
    } else if (sort === 'priceDesc') {
      orderBy = { price: 'desc' }
    }

    const products = await prisma.product.findMany({
      where,
      skip,
      take,
      orderBy,
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
