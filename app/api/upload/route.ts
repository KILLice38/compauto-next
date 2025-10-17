// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import sharp from 'sharp'
import { requireAuth } from '../lib/auth'
import { UPLOADS_DIR, getTmpDir, publicUrlToAbs, absToPublicUrl, isTmpUrl, extractTmpToken } from '../lib/paths'

export const runtime = 'nodejs'

/* ---------- общие FS-хелперы ---------- */

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}
function stripQuery(u: string) {
  const i = u.indexOf('?')
  return i >= 0 ? u.slice(0, i) : u
}
// base без __source/__card/__detail/__thumb и без расширения
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

/* ---------- генерация картинок (POST) ---------- */

// Допустимые MIME типы для изображений
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

function isValidImageType(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())
}

function sourcePath(filePath: string, ext = 'webp') {
  const extOld = path.extname(filePath)
  const base = filePath.slice(0, -extOld.length)
  return `${base}__source.${ext}`
}
async function saveTemp(baseDir: string, file: File) {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const ts = Date.now()
  const fileName = `${ts}-${safeName}`
  const abs = path.join(baseDir, fileName)
  await fs.writeFile(abs, buffer)
  return { abs, fileName, buffer }
}
async function makeSource(absOriginal: string, buffer: Buffer) {
  const absSource = sourcePath(absOriginal)

  try {
    await sharp(buffer)
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .toFormat('webp', { quality: 90 })
      .toFile(absSource)
  } catch (error) {
    console.error('Sharp error in makeSource:', error)
    // Удаляем оригинальный файл при ошибке
    try {
      await fs.unlink(absOriginal)
    } catch {}
    throw new Error('Failed to process image. The file may be corrupted or in an unsupported format.')
  }

  // Удаляем оригинал после успешной обработки
  try {
    await fs.unlink(absOriginal)
  } catch {}

  return absSource
}
function baseWithoutExt(p: string) {
  const i = p.lastIndexOf('.')
  return i >= 0 ? p.slice(0, i) : p
}
function baseWithoutSource(absSource: string) {
  const base = baseWithoutExt(absSource)
  return base.endsWith('__source') ? base.slice(0, -'__source'.length) : base
}
function variantAbsFromSource(absSource: string, suf: 'card' | 'detail' | 'thumb') {
  return `${baseWithoutSource(absSource)}__${suf}.webp`
}
async function makeVariantsFromSource(absSource: string) {
  const buf = await fs.readFile(absSource)
  const targets = [
    { suf: 'card', w: 260, h: 260 },
    { suf: 'detail', w: 460, h: 299 },
    { suf: 'thumb', w: 106, h: 69 },
  ] as const
  const bg = { r: 255, g: 255, b: 255, alpha: 1 }

  try {
    await Promise.all(
      targets.map(async ({ suf, w, h }) => {
        const out = variantAbsFromSource(absSource, suf)
        try {
          await sharp(buf)
            .resize(w, h, { fit: 'contain', background: bg })
            .toFormat('webp', { quality: 82 })
            .toFile(out)
        } catch (error) {
          console.error(`Sharp error creating variant ${suf}:`, error)
          throw error
        }
      })
    )
  } catch (error) {
    console.error('Sharp error in makeVariantsFromSource:', error)
    // Удаляем source файл при ошибке создания вариантов
    try {
      await fs.unlink(absSource)
    } catch {}
    throw new Error('Failed to create image variants. The source image may be corrupted.')
  }
}

export async function POST(req: NextRequest) {
  // Проверка авторизации
  const authError = await requireAuth(req)
  if (authError) return authError

  try {
    const formData = await req.formData()
    const folder = (formData.get('folder') as string) || '' // e.g. "tmp/<uuid>" или "products/<slug>"
    const one = formData.get('file') as File | null
    const many = formData.getAll('files') as File[]

    const basePublic = path.join(UPLOADS_DIR, folder)
    await ensureDir(basePublic)

    // Обработка одного файла
    if (one) {
      // Валидация типа файла
      if (!isValidImageType(one)) {
        return NextResponse.json(
          { error: `Invalid file type: ${one.type}. Allowed types: JPEG, PNG, WebP, GIF` },
          { status: 400 }
        )
      }

      try {
        const { abs, buffer } = await saveTemp(basePublic, one)
        const absSource = await makeSource(abs, buffer)
        await makeVariantsFromSource(absSource)
        return NextResponse.json({ url: absToPublicUrl(absSource) })
      } catch (error) {
        console.error('Error processing single file:', error)
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to process image' },
          { status: 500 }
        )
      }
    }

    // Обработка нескольких файлов
    if (many.length > 0) {
      const urls: string[] = []
      const errors: string[] = []

      for (let i = 0; i < many.length; i++) {
        const f = many[i]

        // Валидация типа файла
        if (!isValidImageType(f)) {
          errors.push(`File ${i + 1} (${f.name}): Invalid type ${f.type}`)
          continue
        }

        try {
          const { abs, buffer } = await saveTemp(basePublic, f)
          const absSource = await makeSource(abs, buffer)
          await makeVariantsFromSource(absSource)
          urls.push(absToPublicUrl(absSource))
        } catch (error) {
          console.error(`Error processing file ${i + 1} (${f.name}):`, error)
          errors.push(`File ${i + 1} (${f.name}): ${error instanceof Error ? error.message : 'Processing failed'}`)
        }
      }

      if (urls.length === 0 && errors.length > 0) {
        return NextResponse.json({ error: 'All files failed to process', details: errors }, { status: 500 })
      }

      return NextResponse.json({ urls, errors: errors.length > 0 ? errors : undefined })
    }

    return NextResponse.json({ error: 'No file(s) provided' }, { status: 400 })
  } catch (error) {
    console.error('Unexpected error in POST /api/upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/* ---------- удаление tmp-файлов (DELETE) ---------- */

export async function DELETE(req: NextRequest) {
  // Проверка авторизации
  const authError = await requireAuth(req)
  if (authError) return authError

  try {
    const body = await req.json().catch(() => ({}))
    const urls = Array.isArray(body?.urls) ? (body.urls as string[]) : []
    if (!urls.length) return NextResponse.json({ deleted: 0 })

    let deleted = 0
    const tokens = new Set<string>()

    for (const u of urls) {
      if (!isTmpUrl(u)) continue
      const variants = allVariantPublicsFromAny(u)
      for (const v of variants) {
        const abs = publicUrlToAbs(v)
        try {
          await fs.unlink(abs)
          deleted++
        } catch {}
      }
      const t = extractTmpToken(u)
      if (t) tokens.add(t)
    }

    // подчистим пустые tmp/<token>
    await Promise.all(Array.from(tokens).map((t) => pruneFolderIfEmpty(getTmpDir(t))))

    return NextResponse.json({ deleted })
  } catch (e) {
    console.error('DELETE /api/upload failed:', e)
    return NextResponse.json({ error: 'Failed to delete tmp files' }, { status: 500 })
  }
}
