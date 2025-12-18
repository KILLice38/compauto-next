// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import sharp from 'sharp'
import { requireAuth } from '../lib/auth'
import { UPLOADS_DIR, getTmpDir, publicUrlToAbs, absToPublicUrl, isTmpUrl, extractTmpToken } from '../lib/paths'
import { ensureDir, allVariantPublicsFromAny, pruneFolderIfEmpty } from '../lib/fileUtils'

export const runtime = 'nodejs'

/* ---------- генерация картинок (POST) ---------- */

// Допустимые MIME типы для изображений
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

// Максимальный размер файла: 2 MB
const MAX_FILE_SIZE = 2 * 1024 * 1024

function isValidImageType(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())
}

function isValidFileSize(file: File): boolean {
  return file.size > 0 && file.size <= MAX_FILE_SIZE
}

function checkImageSignature(buffer: Buffer): boolean {
  // Проверяем JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true
  }
  // Проверяем PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return true
  }
  // Проверяем GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return true
  }
  // Проверяем WebP (RIFF...WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true
  }
  return false
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
    { suf: 'card', w: 400, h: 400 },
    { suf: 'detail', w: 800, h: 800 },
    { suf: 'thumb', w: 106, h: 69 },
  ] as const

  // ИЗМЕНЕНО: Прозрачный фон вместо белого
  // Это решает проблему с белыми полями на непрозрачных изображениях
  const bg = { r: 255, g: 255, b: 255, alpha: 0 }

  try {
    await Promise.all(
      targets.map(async ({ suf, w, h }) => {
        const out = variantAbsFromSource(absSource, suf)
        try {
          await sharp(buf)
            .resize(w, h, { fit: 'contain', background: bg })
            .toFormat('webp', { quality: 82, effort: 6 })
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

      // Валидация размера файла
      if (!isValidFileSize(one)) {
        return NextResponse.json(
          { error: `File size ${one.size} bytes exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes (2 MB)` },
          { status: 400 }
        )
      }

      try {
        const { abs, buffer } = await saveTemp(basePublic, one)

        // Дополнительная проверка размера после загрузки
        if (buffer.length > MAX_FILE_SIZE) {
          try {
            await fs.unlink(abs)
          } catch {}
          return NextResponse.json(
            { error: `Файл слишком большой (${(buffer.length / 1024 / 1024).toFixed(2)} MB). Максимум: 2 MB` },
            { status: 413 }
          )
        }

        // Проверка магических байтов
        if (!checkImageSignature(buffer)) {
          // Удаляем временный файл
          try {
            await fs.unlink(abs)
          } catch {}
          return NextResponse.json(
            { error: 'Invalid image file. The file signature does not match allowed image types.' },
            { status: 400 }
          )
        }

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

        // Валидация размера файла
        if (!isValidFileSize(f)) {
          errors.push(`File ${i + 1} (${f.name}): File size ${f.size} bytes exceeds 2 MB limit`)
          continue
        }

        try {
          const { abs, buffer } = await saveTemp(basePublic, f)

          // Проверка магических байтов
          if (!checkImageSignature(buffer)) {
            // Удаляем временный файл
            try {
              await fs.unlink(abs)
            } catch {}
            errors.push(`File ${i + 1} (${f.name}): Invalid image signature`)
            continue
          }

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
