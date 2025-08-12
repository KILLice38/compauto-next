import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import fs from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

// ---------- FS helpers ----------

const VARIANT_SUFFIXES = ['source', 'card', 'detail', 'thumb'] as const
const IGNORABLE_FILES = new Set(['.DS_Store', 'Thumbs.db'])

function stripQuery(u: string) {
  const i = u.indexOf('?')
  return i >= 0 ? u.slice(0, i) : u
}
function isHttpUrl(str: string | null | undefined) {
  return !!str && /^https?:\/\//i.test(str)
}
function publicUrlToAbs(u: string) {
  const rel = stripQuery(u).replace(/^\//, '')
  return path.join(process.cwd(), 'public', rel)
}
function productFolderAbs(slug: string) {
  return path.join(process.cwd(), 'public', 'uploads', 'products', slug)
}
function tmpFolderAbs(token: string) {
  return path.join(process.cwd(), 'public', 'uploads', 'tmp', token)
}
function isTmpUrl(u: string | null | undefined) {
  return !!u && /\/uploads\/tmp\//.test(u)
}
function extractTmpToken(u: string): string | null {
  const m = stripQuery(u).match(/\/uploads\/tmp\/([^/]+)/)
  return m?.[1] ?? null
}

// базовый путь без __source/__card/__detail/__thumb и без расширения
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

// поддерживаем и старые __source__card.webp, и нормальные __card.webp
function absVariantCandidates(publicUrl: string, suf: (typeof VARIANT_SUFFIXES)[number]) {
  const clean = stripQuery(publicUrl)
  const dot = clean.lastIndexOf('.')
  const base = dot >= 0 ? clean.slice(0, dot) : clean
  const baseNoSource = base.endsWith('__source') ? base.slice(0, -'__source'.length) : base
  const single = `${baseNoSource}__${suf}.webp`
  const double = `${baseNoSource}__source__${suf}.webp`
  return [single, double].map((p) => publicUrlToAbs(p))
}

async function unlinkWithVariants(publicUrl: string | null | undefined) {
  if (!publicUrl || isHttpUrl(publicUrl)) return
  const absOriginal = publicUrlToAbs(publicUrl)
  const targets = new Set<string>([absOriginal])
  for (const suf of VARIANT_SUFFIXES) {
    for (const abs of absVariantCandidates(publicUrl, suf)) targets.add(abs)
  }
  await Promise.all(
    Array.from(targets).map(async (p) => {
      try {
        await fs.unlink(p)
      } catch {}
    })
  )
}

async function isDirEffectivelyEmpty(dir: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      if (e.isFile()) {
        if (!IGNORABLE_FILES.has(e.name)) return false
      } else if (e.isDirectory()) {
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

// Перенос сета (__source/__card/__detail/__thumb) из tmp → products/<slug>
// Возвращает канонический public URL на __source.webp и (опц.) tmp-токен для последующей очистки.
async function finalizeAssetToProduct(publicUrl: string, slug: string): Promise<{ url: string; tmpToken?: string }> {
  if (!isTmpUrl(publicUrl)) {
    // уже в products или внешний URL
    return { url: publicUrl }
  }

  const token = extractTmpToken(publicUrl) ?? undefined
  const variantsPub = allVariantPublicsFromAny(publicUrl)
  const destDir = productFolderAbs(slug)
  await fs.mkdir(destDir, { recursive: true })

  let finalUrl = ''
  for (const p of variantsPub) {
    const absOld = publicUrlToAbs(p) // из tmp/<token>/*
    const fileName = path.basename(absOld)
    const absNew = path.join(destDir, fileName)
    try {
      await fs.rename(absOld, absNew) // переносим если есть
      if (fileName.endsWith('__source.webp')) {
        finalUrl = `/uploads/products/${slug}/${fileName}`
      }
    } catch {
      // варианта могло не быть — ок
    }
  }

  // если по какой-то причине __source.webp не перенесся, но оригинал был — построим URL по имени из исходного
  if (!finalUrl) {
    const base = baseNoVariantNoExt(publicUrl)
    const fileName = `${path.basename(base)}__source.webp`
    finalUrl = `/uploads/products/${slug}/${fileName}`
  }

  return { url: finalUrl, tmpToken: token }
}

// ---------- Handlers ----------

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })

  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(product)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })

  try {
    const current = await prisma.product.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'Продукт не найден' }, { status: 404 })

    const body = await req.json()
    const { id: _ignoreId, slug: _ignoreSlug, ...data } = body ?? {}

    // Сначала переносим возможные tmp-файлы → products/<slug>
    const usedTmpTokens = new Set<string>()
    let finalImg = data.img as string | undefined
    if (typeof finalImg === 'string' && isTmpUrl(finalImg)) {
      const res = await finalizeAssetToProduct(finalImg, current.slug)
      finalImg = res.url
      if (res.tmpToken) usedTmpTokens.add(res.tmpToken)
    }

    let finalGallery: string[] | undefined
    if (Array.isArray(data.gallery)) {
      const out: string[] = []
      for (const u of data.gallery) {
        if (typeof u === 'string' && isTmpUrl(u)) {
          const res = await finalizeAssetToProduct(u, current.slug)
          out.push(res.url)
          if (res.tmpToken) usedTmpTokens.add(res.tmpToken)
        } else if (typeof u === 'string') {
          out.push(u)
        }
      }
      finalGallery = out
    }

    // Нормализуем поля
    const nextGallery: string[] | undefined = Array.isArray(finalGallery) ? finalGallery.slice(0, 4) : undefined
    const nextDetails: string[] | undefined = Array.isArray(data.details)
      ? data.details.map((s: string) => String(s).trim()).filter(Boolean)
      : undefined

    const droppedTmp = Array.isArray(finalGallery)
      ? finalGallery.filter((u) => isTmpUrl(u) && !(nextGallery ?? []).includes(u))
      : []
    if (droppedTmp.length) {
      // удалим сами файлы + попытаемся подчистить их tmp-папки
      const tokens = new Set<string>()
      await Promise.all(
        droppedTmp.map(async (u) => {
          await unlinkWithVariants(u) // удалит __source/__card/__detail/__thumb в tmp
          const t = extractTmpToken(u)
          if (t) tokens.add(t)
        })
      )
      await Promise.all(Array.from(tokens).map((t) => pruneFolderIfEmpty(tmpFolderAbs(t))))
    }

    // Теперь чистим старые файлы, только если они реально заменяются
    if (finalImg && current.img && finalImg !== current.img) {
      await unlinkWithVariants(current.img)
    }
    if (nextGallery) {
      const prev = current.gallery ?? []
      const removed = prev.filter((x) => !nextGallery!.includes(x))
      await Promise.all(removed.map((u) => unlinkWithVariants(u)))
    }

    // Обновляем запись
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        img: finalImg ?? current.img,
        gallery: nextGallery ?? current.gallery,
        details: nextDetails,
      },
    })

    // Чистим пустые tmp/<token> (после переноса всех файлов этого токена)
    await Promise.all(
      Array.from(usedTmpTokens).map(async (t) => {
        await pruneFolderIfEmpty(tmpFolderAbs(t))
      })
    )

    // Если вдруг все локальные файлы удалили/заменили на внешние URL — подчистим пустую папку товара
    if (current.slug) {
      await pruneFolderIfEmpty(productFolderAbs(current.slug))
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update product:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })

  try {
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ error: 'Продукт не найден' }, { status: 404 })

    // 1) удаляем главную и галерею (включая все варианты имён)
    await unlinkWithVariants(product.img)
    await Promise.all((product.gallery ?? []).map((u) => unlinkWithVariants(u)))

    // 2) удаляем запись из БД
    await prisma.product.delete({ where: { id } })

    // 3) удаляем папку товара рекурсивно
    if (product.slug) {
      const dir = productFolderAbs(product.slug)
      try {
        await fs.rm(dir, { recursive: true, force: true })
      } catch (e) {
        console.warn('Failed to remove product folder', dir, e)
      }
    }

    return NextResponse.json({ message: 'Продукт успешно удалён' })
  } catch (error) {
    console.error('Failed to delete product:', error)
    return NextResponse.json({ error: 'Ошибка при удалении продукта' }, { status: 500 })
  }
}
