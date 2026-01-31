// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../lib/prisma'
import path from 'path'
import { promises as fs } from 'fs'
import { requireAuth, getCurrentUser } from '../lib/auth'
import { getProductDir, getTmpDir, publicUrlToAbs, isTmpUrl, extractTmpToken, PRODUCTS_BASE_URL } from '../lib/paths'
import { allVariantPublicsFromAny, pruneFolderIfEmpty, baseNoVariantNoExt } from '../lib/fileUtils'
import { audit } from '../lib/auditLog'
import { createProductSchema, productQuerySchema, formatZodError } from '../lib/validation'
import { checkRateLimit, RateLimitPresets } from '../lib/rateLimit'

// Тип для отслеживания перемещённых файлов (для rollback)
interface MovedFile {
  from: string
  to: string
}

/**
 * Откатывает перемещение файлов — перемещает обратно из to в from
 */
async function rollbackMoves(movedFiles: MovedFile[]): Promise<void> {
  for (const { from, to } of movedFiles) {
    try {
      await fs.rename(to, from)
    } catch {
      // Если не удалось откатить, удаляем файл из целевой папки
      try {
        await fs.unlink(to)
      } catch {
        // Игнорируем — файл мог не существовать
      }
    }
  }
}

/**
 * Переносит набор (__source/__card/__detail/__thumb) из tmp → products/<slug>.
 * Возвращает: { url, token, movedFiles } — movedFiles для возможного rollback
 */
async function finalizeAsset(
  sourceUrl: string,
  slug: string
): Promise<{ url: string; token?: string; movedFiles: MovedFile[] }> {
  if (!isTmpUrl(sourceUrl)) {
    return { url: sourceUrl, movedFiles: [] } // уже в products или внешний URL
  }

  const token = extractTmpToken(sourceUrl) ?? undefined
  const targetDir = getProductDir(slug)
  await fs.mkdir(targetDir, { recursive: true })

  const publics = allVariantPublicsFromAny(sourceUrl)
  const movedFiles: MovedFile[] = []
  let finalSourceUrl = ''

  for (const pub of publics) {
    const absOld = publicUrlToAbs(pub)
    const fileName = path.basename(absOld)
    const absNew = path.join(targetDir, fileName)
    try {
      await fs.rename(absOld, absNew) // move если файл есть
      movedFiles.push({ from: absOld, to: absNew })
      if (fileName.endsWith('__source.webp')) {
        finalSourceUrl = `${PRODUCTS_BASE_URL}/${slug}/${fileName}`
      }
    } catch {
      // варианта могло не быть — ок
    }
  }

  if (!finalSourceUrl) {
    // подстраховка, если __source.webp не перенесли (но исходный base известен)
    const base = baseNoVariantNoExt(sourceUrl)
    const fileName = `${path.basename(base)}__source.webp`
    finalSourceUrl = `${PRODUCTS_BASE_URL}/${slug}/${fileName}`
  }

  return { url: finalSourceUrl, token, movedFiles }
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
  // Проверка авторизации
  const authError = await requireAuth(req)
  if (authError) return authError

  // Для rollback при ошибке БД
  const allMovedFiles: MovedFile[] = []
  const usedTokens = new Set<string>()

  try {
    const raw = await req.json()

    // Validate input with Zod - prevents mass assignment
    const parseResult = createProductSchema.safeParse(raw)
    if (!parseResult.success) {
      return NextResponse.json({ error: formatZodError(parseResult.error) }, { status: 400 })
    }
    const validated = parseResult.data

    // 1) slug
    const base = slugify(validated.title)
    const slug = `${base}-${randomSuffix()}`

    // 2) перенос ассетов + сбор использованных tmp-токенов + отслеживание для rollback
    const imgRes = await finalizeAsset(validated.img, slug)
    if (imgRes.token) usedTokens.add(imgRes.token)
    allMovedFiles.push(...imgRes.movedFiles)
    const img = imgRes.url

    const gallery: string[] = []
    for (const u of validated.gallery) {
      const gRes = await finalizeAsset(u, slug)
      if (gRes.token) usedTokens.add(gRes.token)
      allMovedFiles.push(...gRes.movedFiles)
      gallery.push(gRes.url)
    }

    const details = validated.details.map((s) => s.trim()).filter(Boolean)

    // 3) создаём продукт - only validated fields
    // Если здесь произойдёт ошибка, файлы будут откачены в catch блоке
    const product = await prisma.product.create({
      data: {
        slug,
        title: validated.title,
        description: validated.description,
        price: validated.price,
        img,
        gallery: gallery.slice(0, 4),
        details,
        autoMark: validated.autoMark,
        engineModel: validated.engineModel,
        compressor: validated.compressor,
      },
    })

    // 4) логируем действие
    const user = await getCurrentUser(req)
    await audit.productCreated(
      { id: product.id, title: product.title },
      user ? { id: user.id as string, email: user.email as string } : null,
      req
    )

    // 5) чистим пустые tmp/<token>
    await Promise.all(
      Array.from(usedTokens).map(async (t) => {
        await pruneFolderIfEmpty(getTmpDir(t))
      })
    )

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Product create error:', error)

    // Rollback: возвращаем файлы обратно в tmp
    if (allMovedFiles.length > 0) {
      console.log(`Rolling back ${allMovedFiles.length} moved files...`)
      await rollbackMoves(allMovedFiles)
    }

    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  // Rate limiting for public API - 60 requests per minute
  const rateLimitError = checkRateLimit(req, 'api:products:get', RateLimitPresets.API_LIGHT)
  if (rateLimitError) return rateLimitError

  try {
    const url = new URL(req.url)

    // Validate query params with Zod
    const queryParams = {
      skip: url.searchParams.get('skip') ?? undefined,
      take: url.searchParams.get('take') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
      autoMark: url.searchParams.get('autoMark') ?? undefined,
      engineModel: url.searchParams.get('engineModel') ?? undefined,
      compressor: url.searchParams.get('compressor') ?? undefined,
      sort: url.searchParams.get('sort') ?? undefined,
    }

    const parseResult = productQuerySchema.safeParse(queryParams)
    if (!parseResult.success) {
      return NextResponse.json({ error: formatZodError(parseResult.error) }, { status: 400 })
    }
    const { skip, take, search, autoMark, engineModel, compressor, sort } = parseResult.data

    // Build where clause for filtering
    const where: Record<string, string | { contains: string; mode: string }> = {}

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
    let orderBy: { createdAt: 'desc' } | { title: 'asc' | 'desc' } | { price: 'asc' | 'desc' } = { createdAt: 'desc' } // default

    if (sort === 'az') {
      orderBy = { title: 'asc' }
    } else if (sort === 'za') {
      orderBy = { title: 'desc' }
    } else if (sort === 'priceAsc') {
      orderBy = { price: 'asc' }
    } else if (sort === 'priceDesc') {
      orderBy = { price: 'desc' }
    }

    // Parallel queries: products + total count
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({ products, total })
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
