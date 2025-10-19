#!/usr/bin/env tsx
/**
 * Скрипт миграции изображений
 *
 * Регенерирует все варианты изображений с прозрачным фоном вместо белого.
 * Это нужно для плавного перехода со старой реализации на новую.
 *
 * Использование:
 *   pnpm tsx scripts/migrate-images.ts
 *
 * Опции:
 *   --dry-run  - Показать, какие файлы будут обработаны, без изменений
 *   --force    - Перезаписать существующие варианты
 */

import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const UPLOADS_DIR = path.join(__dirname, '../public/uploads')
const PRODUCTS_DIR = path.join(UPLOADS_DIR, 'products')

// Проверка аргументов командной строки
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isForce = args.includes('--force')

interface ImageVariants {
  source: string
  card: string
  detail: string
  thumb: string
}

async function regenerateVariants(sourceFilePath: string): Promise<void> {
  const buf = await fs.readFile(sourceFilePath)
  const baseWithoutExt = sourceFilePath.replace(/__source\.webp$/, '')

  const targets = [
    { suf: 'card', w: 260, h: 260 },
    { suf: 'detail', w: 460, h: 299 },
    { suf: 'thumb', w: 106, h: 69 },
  ] as const

  // Прозрачный фон вместо белого
  const bg = { r: 255, g: 255, b: 255, alpha: 0 }

  for (const { suf, w, h } of targets) {
    const outPath = `${baseWithoutExt}__${suf}.webp`

    if (!isForce) {
      // Проверяем, существует ли уже файл
      try {
        await fs.access(outPath)
        console.log(`  ⏭️  Пропуск ${path.basename(outPath)} (уже существует)`)
        continue
      } catch {
        // Файл не существует, продолжаем
      }
    }

    if (isDryRun) {
      console.log(`  🔄 Будет создан: ${path.basename(outPath)}`)
      continue
    }

    await sharp(buf).resize(w, h, { fit: 'contain', background: bg }).toFormat('webp', { quality: 82 }).toFile(outPath)

    console.log(`  ✅ Создан: ${path.basename(outPath)}`)
  }
}

async function findAllSourceImages(dir: string): Promise<string[]> {
  const sourceImages: string[] = []

  async function scan(currentDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)

        if (entry.isDirectory()) {
          await scan(fullPath)
        } else if (entry.isFile() && entry.name.endsWith('__source.webp')) {
          sourceImages.push(fullPath)
        }
      }
    } catch (error) {
      console.error(`Ошибка при сканировании ${currentDir}:`, error)
    }
  }

  await scan(dir)
  return sourceImages
}

async function main() {
  console.log('\n🚀 Скрипт миграции изображений')
  console.log('━'.repeat(60))

  if (isDryRun) {
    console.log('⚠️  РЕЖИМ ПРОБНОГО ПРОГОНА (--dry-run)')
    console.log('   Файлы не будут изменены\n')
  }

  if (isForce) {
    console.log('⚠️  РЕЖИМ ПРИНУДИТЕЛЬНОЙ ПЕРЕЗАПИСИ (--force)')
    console.log('   Существующие варианты будут перезаписаны\n')
  }

  // Проверяем существование директории
  try {
    await fs.access(PRODUCTS_DIR)
  } catch {
    console.error(`❌ Директория ${PRODUCTS_DIR} не найдена`)
    console.log('\n💡 Возможно, у вас еще нет загруженных изображений.')
    console.log('   Этот скрипт нужен только для миграции существующих изображений.\n')
    process.exit(0)
  }

  console.log(`📂 Сканирование директории: ${PRODUCTS_DIR}\n`)

  const sourceImages = await findAllSourceImages(PRODUCTS_DIR)

  if (sourceImages.length === 0) {
    console.log('✨ Изображения для миграции не найдены')
    console.log('   Все новые изображения уже будут создаваться с прозрачным фоном.\n')
    process.exit(0)
  }

  console.log(`📊 Найдено ${sourceImages.length} исходных изображений\n`)

  let processed = 0
  let skipped = 0
  let failed = 0

  for (const sourceImage of sourceImages) {
    const relativePath = path.relative(PRODUCTS_DIR, sourceImage)
    console.log(`\n🖼️  Обработка: ${relativePath}`)

    try {
      await regenerateVariants(sourceImage)
      processed++
    } catch (error) {
      console.error(`  ❌ Ошибка:`, error)
      failed++
    }
  }

  console.log('\n' + '━'.repeat(60))
  console.log('📈 Результаты миграции:')
  console.log(`   ✅ Обработано: ${processed}`)
  console.log(`   ⏭️  Пропущено: ${skipped}`)
  console.log(`   ❌ Ошибок: ${failed}`)

  if (isDryRun) {
    console.log('\n💡 Чтобы применить изменения, запустите без --dry-run')
  } else if (failed === 0) {
    console.log('\n✨ Миграция успешно завершена!')
    console.log('   Все изображения теперь имеют прозрачный фон.')
  }

  console.log('')
}

main().catch((error) => {
  console.error('\n❌ Критическая ошибка:', error)
  process.exit(1)
})
