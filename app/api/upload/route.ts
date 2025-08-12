// app/api/upload/route.ts
import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import sharp from 'sharp'

export const runtime = 'nodejs'

/* ---------- общие FS-хелперы ---------- */

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}
function absFromPublic(u: string) {
  const rel = u.startsWith('/') ? u.slice(1) : u
  return path.join(process.cwd(), 'public', rel)
}
function tmpFolderAbs(token: string) {
  return path.join(process.cwd(), 'public', 'uploads', 'tmp', token)
}
function productDir(slug: string) {
  return path.join(process.cwd(), 'public', 'uploads', 'products', slug)
}
function isTmp(u: string | null | undefined) {
  return !!u && /\/uploads\/tmp\//.test(u)
}
function tokenFromUrl(u: string): string | null {
  const m = u.match(/\/uploads\/tmp\/([^/]+)/)
  return m?.[1] ?? null
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
  await sharp(buffer)
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .toFormat('webp', { quality: 90 })
    .toFile(absSource)
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
  await Promise.all(
    targets.map(async ({ suf, w, h }) => {
      const out = variantAbsFromSource(absSource, suf)
      await sharp(buf).resize(w, h, { fit: 'contain', background: bg }).toFormat('webp', { quality: 82 }).toFile(out)
    })
  )
}

export async function POST(req: Request) {
  const formData = await req.formData()
  const folder = (formData.get('folder') as string) || '' // e.g. "tmp/<uuid>" или "products/<slug>"
  const one = formData.get('file') as File | null
  const many = formData.getAll('files') as File[]

  const basePublic = path.join(process.cwd(), 'public', 'uploads', folder)
  await ensureDir(basePublic)

  const toPublicUrl = (abs: string) => abs.replace(path.join(process.cwd(), 'public'), '').replace(/\\/g, '/')

  if (one) {
    const { abs, fileName, buffer } = await saveTemp(basePublic, one)
    const absSource = await makeSource(abs, buffer)
    await makeVariantsFromSource(absSource)
    return NextResponse.json({ url: toPublicUrl(absSource) })
  }

  if (many.length > 0) {
    const urls: string[] = []
    for (const f of many) {
      const { abs, buffer } = await saveTemp(basePublic, f)
      const absSource = await makeSource(abs, buffer)
      await makeVariantsFromSource(absSource)
      urls.push(toPublicUrl(absSource))
    }
    return NextResponse.json({ urls })
  }

  return NextResponse.json({ error: 'No file(s) provided' }, { status: 400 })
}

/* ---------- удаление tmp-файлов (DELETE) ---------- */

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const urls = Array.isArray(body?.urls) ? (body.urls as string[]) : []
    if (!urls.length) return NextResponse.json({ deleted: 0 })

    let deleted = 0
    const tokens = new Set<string>()

    for (const u of urls) {
      if (!isTmp(u)) continue
      const variants = allVariantPublicsFromAny(u)
      for (const v of variants) {
        const abs = absFromPublic(v)
        try {
          await fs.unlink(abs)
          deleted++
        } catch {}
      }
      const t = tokenFromUrl(u)
      if (t) tokens.add(t)
    }

    // подчистим пустые tmp/<token>
    await Promise.all(Array.from(tokens).map((t) => pruneFolderIfEmpty(tmpFolderAbs(t))))

    return NextResponse.json({ deleted })
  } catch (e) {
    console.error('DELETE /api/upload failed:', e)
    return NextResponse.json({ error: 'Failed to delete tmp files' }, { status: 500 })
  }
}
