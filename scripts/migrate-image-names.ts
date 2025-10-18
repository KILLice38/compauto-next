// scripts/migrate-image-names.ts
/**
 * Скрипт миграции для переименования файлов изображений
 *
 * Проблема:
 * - Старые файлы: /uploads/products/product-15/1755776297075-1753626512993-091__card.webp
 * - Старые seed: /uploads/seed/турбокомпрессор-gt2871r/product-50__card.webp
 *
 * Новый формат:
 * - /uploads/products/турбокомпрессор-gt2871r/турбокомпрессор-gt2871r__card.webp
 * - /uploads/products/турбокомпрессор-gt2871r/турбокомпрессор-gt2871r-gallery-1__card.webp
 *
 * Использование:
 * npx tsx scripts/migrate-image-names.ts
 */

import { PrismaClient } from '@prisma/client'
import { promises as fs } from 'fs'
import path from 'path'

const prisma = new PrismaClient()

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads')
const PRODUCTS_DIR = path.join(UPLOADS_DIR, 'products')
const SEED_DIR = path.join(UPLOADS_DIR, 'seed')

// Варианты файлов
const VARIANTS = ['source', 'card', 'detail', 'thumb']

/**
 * Извлекает базовое имя файла без варианта и расширения
 */
function extractBaseName(fileName: string): string {
  // Убираем расширение
  const withoutExt = fileName.replace(/\.webp$/i, '')
  // Убираем вариант
  return withoutExt.replace(/__(source|card|detail|thumb)$/i, '')
}

/**
 * Генерирует новое имя файла на основе slug
 */
function generateNewFileName(slug: string, variant: string, galleryIndex?: number): string {
  if (galleryIndex !== undefined) {
    return `${slug}-gallery-${galleryIndex}__${variant}.webp`
  }
  return `${slug}__${variant}.webp`
}

/**
 * Переименовывает файл, если он существует
 */
async function renameFileIfExists(oldPath: string, newPath: string): Promise<boolean> {
  try {
    await fs.access(oldPath)
    await fs.rename(oldPath, newPath)
    console.log(`  ✓ Renamed: ${path.basename(oldPath)} → ${path.basename(newPath)}`)
    return true
  } catch (error) {
    // Файл не существует или ошибка переименования
    return false
  }
}

/**
 * Мигрирует один продукт
 */
async function migrateProduct(product: any) {
  console.log(`\nМигрирую продукт: ${product.title} (${product.slug})`)

  let imgUpdated = false
  let galleryUpdated = false
  const newGallery: string[] = []

  // 1. Мигрируем главное изображение
  if (product.img) {
    const oldImgUrl = product.img

    // Проверяем, откуда изображение (seed или products)
    let oldDir: string
    let oldFileName: string

    if (oldImgUrl.includes('/uploads/seed/')) {
      // Из seed
      const match = oldImgUrl.match(/\/uploads\/seed\/([^/]+)\/(.+)/)
      if (match) {
        const [, oldSlug, fileName] = match
        oldDir = path.join(SEED_DIR, oldSlug)
        oldFileName = fileName
      } else {
        console.log(`  ⚠ Не удалось распарсить seed URL: ${oldImgUrl}`)
        return
      }
    } else if (oldImgUrl.includes('/uploads/products/')) {
      // Из products
      const match = oldImgUrl.match(/\/uploads\/products\/([^/]+)\/(.+)/)
      if (match) {
        const [, oldSlug, fileName] = match
        oldDir = path.join(PRODUCTS_DIR, oldSlug)
        oldFileName = fileName
      } else {
        console.log(`  ⚠ Не удалось распарсить products URL: ${oldImgUrl}`)
        return
      }
    } else {
      console.log(`  ⚠ Неизвестный формат URL: ${oldImgUrl}`)
      return
    }

    // Создаем новую директорию для продукта
    const newDir = path.join(PRODUCTS_DIR, product.slug)
    await fs.mkdir(newDir, { recursive: true })

    // Переносим все варианты главного изображения
    const oldBaseName = extractBaseName(oldFileName)
    let renamed = false

    for (const variant of VARIANTS) {
      const oldFilePath = path.join(oldDir, `${oldBaseName}__${variant}.webp`)
      const newFileName = generateNewFileName(product.slug, variant)
      const newFilePath = path.join(newDir, newFileName)

      if (await renameFileIfExists(oldFilePath, newFilePath)) {
        renamed = true
        if (variant === 'source') {
          imgUpdated = true
        }
      }
    }

    if (renamed) {
      const newImgUrl = `/uploads/products/${product.slug}/${product.slug}__source.webp`
      console.log(`  → Новый URL главного изображения: ${newImgUrl}`)
      product.img = newImgUrl
    }

    // Удаляем старую директорию, если она пустая
    try {
      const files = await fs.readdir(oldDir)
      if (files.length === 0) {
        await fs.rmdir(oldDir)
        console.log(`  ✓ Удалена пустая директория: ${oldDir}`)
      }
    } catch {}
  }

  // 2. Мигрируем галерею
  if (product.gallery && Array.isArray(product.gallery)) {
    console.log(`  Мигрирую галерею (${product.gallery.length} изображений)`)

    for (let i = 0; i < product.gallery.length; i++) {
      const oldGalleryUrl = product.gallery[i]

      // Извлекаем путь к старому файлу
      let oldDir: string
      let oldFileName: string

      if (oldGalleryUrl.includes('/uploads/seed/')) {
        const match = oldGalleryUrl.match(/\/uploads\/seed\/([^/]+)\/(.+)/)
        if (match) {
          const [, oldSlug, fileName] = match
          oldDir = path.join(SEED_DIR, oldSlug)
          oldFileName = fileName
        } else {
          console.log(`  ⚠ Не удалось распарсить seed gallery URL: ${oldGalleryUrl}`)
          newGallery.push(oldGalleryUrl)
          continue
        }
      } else if (oldGalleryUrl.includes('/uploads/products/')) {
        const match = oldGalleryUrl.match(/\/uploads\/products\/([^/]+)\/(.+)/)
        if (match) {
          const [, oldSlug, fileName] = match
          oldDir = path.join(PRODUCTS_DIR, oldSlug)
          oldFileName = fileName
        } else {
          console.log(`  ⚠ Не удалось распарсить products gallery URL: ${oldGalleryUrl}`)
          newGallery.push(oldGalleryUrl)
          continue
        }
      } else {
        console.log(`  ⚠ Неизвестный формат gallery URL: ${oldGalleryUrl}`)
        newGallery.push(oldGalleryUrl)
        continue
      }

      const newDir = path.join(PRODUCTS_DIR, product.slug)
      const oldBaseName = extractBaseName(oldFileName)
      let renamed = false

      for (const variant of VARIANTS) {
        const oldFilePath = path.join(oldDir, `${oldBaseName}__${variant}.webp`)
        const newFileName = generateNewFileName(product.slug, variant, i + 1)
        const newFilePath = path.join(newDir, newFileName)

        if (await renameFileIfExists(oldFilePath, newFilePath)) {
          renamed = true
          if (variant === 'source') {
            galleryUpdated = true
          }
        }
      }

      if (renamed) {
        const newGalleryUrl = `/uploads/products/${product.slug}/${product.slug}-gallery-${i + 1}__source.webp`
        newGallery.push(newGalleryUrl)
      } else {
        newGallery.push(oldGalleryUrl)
      }
    }

    product.gallery = newGallery
  }

  // 3. Обновляем запись в БД, если были изменения
  if (imgUpdated || galleryUpdated) {
    await prisma.product.update({
      where: { id: product.id },
      data: {
        img: product.img,
        gallery: product.gallery,
      },
    })
    console.log(`  ✓ Обновлена запись в БД`)
  } else {
    console.log(`  ℹ Файлы не были изменены`)
  }
}

async function main() {
  console.log('=== Миграция названий файлов изображений ===\n')

  // Получаем все продукты
  const products = await prisma.product.findMany()
  console.log(`Найдено продуктов: ${products.length}\n`)

  if (products.length === 0) {
    console.log('Нет продуктов для миграции')
    return
  }

  // Мигрируем каждый продукт
  for (const product of products) {
    await migrateProduct(product)
  }

  console.log('\n=== Миграция завершена ===')

  // Проверяем, остались ли файлы в seed директории
  try {
    const seedFiles = await fs.readdir(SEED_DIR)
    if (seedFiles.length > 0) {
      console.log(`\n⚠ В директории /uploads/seed/ остались файлы:`)
      for (const file of seedFiles) {
        console.log(`  - ${file}`)
      }
      console.log(`\nВы можете удалить эту директорию вручную после проверки.`)
    }
  } catch (error) {
    // Директория не существует - это нормально
  }
}

main()
  .catch((error) => {
    console.error('Ошибка при миграции:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
