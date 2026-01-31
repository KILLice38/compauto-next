// app/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import fs from 'fs/promises'
import path from 'path'
import { requireAuth, getCurrentUser } from '../../lib/auth'
import { getProductDir, getTmpDir, publicUrlToAbs, isTmpUrl, extractTmpToken, PRODUCTS_BASE_URL } from '../../lib/paths'
import { stripQuery, baseNoVariantNoExt, allVariantPublicsFromAny, pruneFolderIfEmpty } from '../../lib/fileUtils'
import { audit } from '../../lib/auditLog'
import { updateProductSchema, formatZodError } from '../../lib/validation'

export const runtime = 'nodejs'

// ---------- types for Next 15 route context ----------
type RouteParams = Promise<{ id: string }>

// ---------- FS helpers ----------
const VARIANT_SUFFIXES = ['source', 'card', 'detail', 'thumb'] as const

function isHttpUrl(str: string | null | undefined) {
  return !!str && /^https?:\/\//i.test(str)
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

// Перенос сета (__source/__card/__detail/__thumb) из tmp → products/<slug>
// Возвращает канонический public URL на __source.webp и (опц.) tmp-токен для последующей очистки.
async function finalizeAssetToProduct(publicUrl: string, slug: string): Promise<{ url: string; tmpToken?: string }> {
  if (!isTmpUrl(publicUrl)) {
    // уже в products или внешний URL
    return { url: publicUrl }
  }

  const token = extractTmpToken(publicUrl) ?? undefined
  const variantsPub = allVariantPublicsFromAny(publicUrl)
  const destDir = getProductDir(slug)
  await fs.mkdir(destDir, { recursive: true })

  let finalUrl = ''
  for (const p of variantsPub) {
    const absOld = publicUrlToAbs(p) // из tmp/<token>/*
    const fileName = path.basename(absOld)
    const absNew = path.join(destDir, fileName)
    try {
      await fs.rename(absOld, absNew) // переносим если есть
      if (fileName.endsWith('__source.webp')) {
        finalUrl = `${PRODUCTS_BASE_URL}/${slug}/${fileName}`
      }
    } catch {
      // варианта могло не быть — ок
    }
  }

  // если по какой-то причине __source.webp не перенесся, но оригинал был — построим URL по имени из исходного
  if (!finalUrl) {
    const base = baseNoVariantNoExt(publicUrl)
    const fileName = `${path.basename(base)}__source.webp`
    finalUrl = `${PRODUCTS_BASE_URL}/${slug}/${fileName}`
  }

  return { url: finalUrl, tmpToken: token }
}

// ---------- Handlers (Next 15: params is Promise) ----------

export async function GET(_req: NextRequest, ctx: { params: RouteParams }) {
  const { id } = await ctx.params
  const numId = Number(id)
  if (Number.isNaN(numId)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })

  const product = await prisma.product.findUnique({ where: { id: numId } })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(product)
}

export async function PUT(req: NextRequest, ctx: { params: RouteParams }) {
  // Проверка авторизации
  const authError = await requireAuth(req)
  if (authError) return authError

  const { id } = await ctx.params
  const numId = Number(id)
  if (Number.isNaN(numId)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })

  try {
    const current = await prisma.product.findUnique({ where: { id: numId } })
    if (!current) return NextResponse.json({ error: 'Продукт не найден' }, { status: 404 })

    const body = await req.json()

    // Validate input with Zod - prevents mass assignment
    const parseResult = updateProductSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json({ error: formatZodError(parseResult.error) }, { status: 400 })
    }
    const validated = parseResult.data

    // Сначала переносим возможные tmp-файлы → products/<slug>
    const usedTmpTokens = new Set<string>()
    let finalImg = validated.img
    if (typeof finalImg === 'string' && isTmpUrl(finalImg)) {
      const res = await finalizeAssetToProduct(finalImg, current.slug)
      finalImg = res.url
      if (res.tmpToken) usedTmpTokens.add(res.tmpToken)
    }

    let finalGallery: string[] | undefined
    if (Array.isArray(validated.gallery)) {
      const out: string[] = []
      for (const u of validated.gallery) {
        if (isTmpUrl(u)) {
          const res = await finalizeAssetToProduct(u, current.slug)
          out.push(res.url)
          if (res.tmpToken) usedTmpTokens.add(res.tmpToken)
        } else {
          out.push(u)
        }
      }
      finalGallery = out
    }

    // Нормализуем поля
    const nextGallery: string[] | undefined = Array.isArray(finalGallery) ? finalGallery.slice(0, 4) : undefined
    const nextDetails: string[] | undefined = Array.isArray(validated.details)
      ? validated.details.map((s) => s.trim()).filter(Boolean)
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
      await Promise.all(Array.from(tokens).map((t) => pruneFolderIfEmpty(getTmpDir(t))))
    }

    // Теперь чистим старые файлы, только если они реально заменяются
    if (finalImg && current.img && finalImg !== current.img) {
      await unlinkWithVariants(current.img)
    }
    if (nextGallery) {
      const prev = current.gallery ?? []
      const removed = prev.filter((x: string) => !nextGallery!.includes(x))
      await Promise.all(removed.map(unlinkWithVariants))
    }

    // Обновляем запись - only validated fields
    const updated = await prisma.product.update({
      where: { id: numId },
      data: {
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.price !== undefined && { price: validated.price }),
        ...(validated.autoMark !== undefined && { autoMark: validated.autoMark }),
        ...(validated.engineModel !== undefined && { engineModel: validated.engineModel }),
        ...(validated.compressor !== undefined && { compressor: validated.compressor }),
        img: finalImg ?? current.img,
        gallery: nextGallery ?? current.gallery,
        details: nextDetails,
      },
    })

    // Логируем изменение
    const user = await getCurrentUser(req)
    await audit.productUpdated(
      { id: updated.id, title: updated.title },
      {
        title: current.title,
        description: current.description,
        price: current.price,
        autoMark: current.autoMark,
        engineModel: current.engineModel,
        compressor: current.compressor,
      },
      {
        title: updated.title,
        description: updated.description,
        price: updated.price,
        autoMark: updated.autoMark,
        engineModel: updated.engineModel,
        compressor: updated.compressor,
      },
      user ? { id: user.id as string, email: user.email as string } : null,
      req
    )

    // Чистим пустые tmp/<token> (после переноса всех файлов этого токена)
    await Promise.all(
      Array.from(usedTmpTokens).map(async (t) => {
        await pruneFolderIfEmpty(getTmpDir(t))
      })
    )

    // Если вдруг все локальные файлы удалили/заменили на внешние URL — подчистим пустую папку товара
    if (current.slug) {
      await pruneFolderIfEmpty(getProductDir(current.slug))
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update product:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: { params: RouteParams }) {
  // Проверка авторизации
  const authError = await requireAuth(req)
  if (authError) return authError

  const { id } = await ctx.params
  const numId = Number(id)
  if (Number.isNaN(numId)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })

  try {
    const product = await prisma.product.findUnique({ where: { id: numId } })
    if (!product) return NextResponse.json({ error: 'Продукт не найден' }, { status: 404 })

    // 1) удаляем главную и галерею (включая все варианты имён)
    await unlinkWithVariants(product.img)
    await Promise.all((product.gallery ?? []).map(unlinkWithVariants))

    // 2) логируем удаление
    const user = await getCurrentUser(req)
    await audit.productDeleted(
      { id: product.id, title: product.title },
      user ? { id: user.id as string, email: user.email as string } : null,
      req
    )

    // 3) удаляем запись из БД
    await prisma.product.delete({ where: { id: numId } })

    // 4) удаляем папку товара рекурсивно
    if (product.slug) {
      const dir = getProductDir(product.slug)
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
