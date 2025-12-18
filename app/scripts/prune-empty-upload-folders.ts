// app/scripts/prune-empty-upload-folders.ts
import path from 'path'
import { promises as fs } from 'fs'

const IGNORABLE_FILES = new Set(['.DS_Store', 'Thumbs.db'])

const PRODUCTS_ROOT = path.join(process.cwd(), 'public', 'uploads', 'products')
const TMP_ROOT = path.join(process.cwd(), 'public', 'uploads', 'tmp')

type Opts = { dryRun: boolean; includeTmp: boolean }

async function exists(p: string) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function dirIsEffectivelyEmpty(dir: string): Promise<boolean> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const useful = entries.filter((e) => !IGNORABLE_FILES.has(e.name))
  if (useful.length === 0) return true
  for (const e of useful) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (!(await dirIsEffectivelyEmpty(full))) return false
    } else {
      // нашёлся файл ≠ игноримому — директория не пустая
      return false
    }
  }
  // все «полезные» — только пустые подпапки
  return true
}

async function pruneEmptyImmediateSubdirs(root: string, { dryRun }: Opts) {
  if (!(await exists(root))) return { removed: 0 }

  const entries = await fs.readdir(root, { withFileTypes: true })
  let removed = 0

  for (const e of entries) {
    if (!e.isDirectory()) continue
    const sub = path.join(root, e.name)
    if (await dirIsEffectivelyEmpty(sub)) {
      if (dryRun) {
        console.log('[dry-run] would remove:', sub)
      } else {
        await fs.rm(sub, { recursive: true, force: true })
        console.log('removed:', sub)
      }
      removed++
    }
  }
  return { removed }
}

async function main() {
  const args = process.argv.slice(2)
  const opts: Opts = {
    dryRun: args.includes('--dry-run'),
    includeTmp: args.includes('--include-tmp'),
  }

  console.log('Scanning:', PRODUCTS_ROOT)
  const a = await pruneEmptyImmediateSubdirs(PRODUCTS_ROOT, opts)

  let b = { removed: 0 }
  if (opts.includeTmp) {
    console.log('Scanning:', TMP_ROOT)
    b = await pruneEmptyImmediateSubdirs(TMP_ROOT, opts)
  }

  console.log(
    `Done. Removed ${a.removed} empty dirs under products${opts.includeTmp ? `, ${b.removed} under tmp` : ''}.`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
