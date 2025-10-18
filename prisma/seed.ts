// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'

const prisma = new PrismaClient()

// Константы для путей
const PUBLIC_DIR = path.join(process.cwd(), 'public')
const PRODUCTS_IMAGES_DIR = path.join(PUBLIC_DIR, 'uploads', 'products')

/**
 * Генерирует простое цветное изображение-заглушку
 */
async function generatePlaceholderImage(slug: string, color: { r: number; g: number; b: number }): Promise<string> {
  const dir = path.join(PRODUCTS_IMAGES_DIR, slug)
  await fs.mkdir(dir, { recursive: true })

  // Генерируем варианты изображений
  const variants = [
    { suffix: 'source', width: 2000, height: 2000 },
    { suffix: 'card', width: 260, height: 260 },
    { suffix: 'detail', width: 460, height: 299 },
    { suffix: 'thumb', width: 106, height: 69 },
  ]

  // Используем slug в качестве базового имени файла
  const baseName = slug
  let sourceUrl = ''

  for (const variant of variants) {
    const fileName = `${baseName}__${variant.suffix}.webp`
    const filePath = path.join(dir, fileName)

    // Создаем простое цветное изображение
    await sharp({
      create: {
        width: variant.width,
        height: variant.height,
        channels: 4,
        background: color,
      },
    })
      .webp({ quality: 85 })
      .toFile(filePath)

    if (variant.suffix === 'source') {
      sourceUrl = `/uploads/products/${slug}/${fileName}`
    }
  }

  return sourceUrl
}

/**
 * Генерирует галерею изображений
 */
async function generateGallery(
  slug: string,
  baseColor: { r: number; g: number; b: number },
  count: number
): Promise<string[]> {
  const gallery: string[] = []
  const dir = path.join(PRODUCTS_IMAGES_DIR, slug)

  for (let i = 0; i < count; i++) {
    // Немного варьируем цвет для каждого изображения в галерее
    const color = {
      r: Math.min(255, baseColor.r + i * 20),
      g: Math.min(255, baseColor.g + i * 15),
      b: Math.min(255, baseColor.b + i * 10),
    }

    // Генерируем варианты для галереи с суффиксом -gallery-{i}
    const baseName = `${slug}-gallery-${i + 1}`

    const variants = [
      { suffix: 'source', width: 2000, height: 2000 },
      { suffix: 'card', width: 260, height: 260 },
      { suffix: 'detail', width: 460, height: 299 },
      { suffix: 'thumb', width: 106, height: 69 },
    ]

    let sourceUrl = ''
    for (const variant of variants) {
      const fileName = `${baseName}__${variant.suffix}.webp`
      const filePath = path.join(dir, fileName)

      await sharp({
        create: {
          width: variant.width,
          height: variant.height,
          channels: 4,
          background: color,
        },
      })
        .webp({ quality: 85 })
        .toFile(filePath)

      if (variant.suffix === 'source') {
        sourceUrl = `/uploads/products/${slug}/${fileName}`
      }
    }

    gallery.push(sourceUrl)
  }

  return gallery
}

// Данные для seed
const productsData = [
  {
    title: 'Турбокомпрессор GT1749V',
    description: 'Турбина для дизельных двигателей с переменной геометрией',
    autoMark: 'Volkswagen',
    engineModel: 'TDI 1.9',
    compressor: 'GT1749V',
    price: 25000,
    color: { r: 45, g: 52, b: 54 },
  },
  {
    title: 'Турбокомпрессор K03',
    description: 'Компактная турбина для бензиновых двигателей малого объема',
    autoMark: 'Audi',
    engineModel: 'TFSI 1.8',
    compressor: 'K03',
    price: 32000,
    color: { r: 64, g: 64, b: 64 },
  },
  {
    title: 'Турбокомпрессор GT2056V',
    description: 'Мощная турбина для дизельных двигателей среднего класса',
    autoMark: 'Mercedes-Benz',
    engineModel: 'OM642',
    compressor: 'GT2056V',
    price: 45000,
    color: { r: 76, g: 76, b: 76 },
  },
  {
    title: 'Турбокомпрессор K04',
    description: 'Увеличенная турбина для тюнинга и спортивных автомобилей',
    autoMark: 'Volkswagen',
    engineModel: 'TSI 2.0',
    compressor: 'K04',
    price: 38000,
    color: { r: 52, g: 58, b: 64 },
  },
  {
    title: 'Турбокомпрессор GT1544V',
    description: 'Экономичная турбина для малолитражных дизелей',
    autoMark: 'Peugeot',
    engineModel: 'HDi 1.6',
    compressor: 'GT1544V',
    price: 22000,
    color: { r: 40, g: 44, b: 52 },
  },
  {
    title: 'Турбокомпрессор HX35W',
    description: 'Надежная турбина для грузовых автомобилей',
    autoMark: 'Cummins',
    engineModel: '6BT 5.9',
    compressor: 'HX35W',
    price: 48000,
    color: { r: 88, g: 88, b: 88 },
  },
  {
    title: 'Турбокомпрессор GT1752S',
    description: 'Современная турбина с улучшенной эффективностью',
    autoMark: 'Renault',
    engineModel: 'dCi 1.5',
    compressor: 'GT1752S',
    price: 28000,
    color: { r: 48, g: 52, b: 60 },
  },
  {
    title: 'Турбокомпрессор K16',
    description: 'Высокопроизводительная турбина для мощных моторов',
    autoMark: 'Porsche',
    engineModel: 'M96/97',
    compressor: 'K16',
    price: 65000,
    color: { r: 32, g: 36, b: 40 },
  },
  {
    title: 'Турбокомпрессор GT2260V',
    description: 'Турбина премиум-класса с переменной геометрией',
    autoMark: 'BMW',
    engineModel: 'N54B30',
    compressor: 'GT2260V',
    price: 52000,
    color: { r: 68, g: 72, b: 76 },
  },
  {
    title: 'Турбокомпрессор TD04',
    description: 'Универсальная турбина японского производства',
    autoMark: 'Subaru',
    engineModel: 'EJ20',
    compressor: 'TD04',
    price: 35000,
    color: { r: 56, g: 60, b: 64 },
  },
  {
    title: 'Турбокомпрессор GT1238S',
    description: 'Компактная турбина для городских автомобилей',
    autoMark: 'Smart',
    engineModel: 'M160',
    compressor: 'GT1238S',
    price: 18000,
    color: { r: 80, g: 80, b: 80 },
  },
  {
    title: 'Турбокомпрессор HX40W',
    description: 'Мощная турбина для коммерческого транспорта',
    autoMark: 'Iveco',
    engineModel: 'F1C',
    compressor: 'HX40W',
    price: 55000,
    color: { r: 44, g: 48, b: 52 },
  },
  {
    title: 'Турбокомпрессор K03S',
    description: 'Спортивная версия популярной турбины',
    autoMark: 'Audi',
    engineModel: 'AEB 1.8T',
    compressor: 'K03S',
    price: 36000,
    color: { r: 60, g: 64, b: 68 },
  },
  {
    title: 'Турбокомпрессор GT2871R',
    description: 'Турбина для тюнинга с ball-bearing подшипниками',
    autoMark: 'Universal',
    engineModel: 'Custom',
    compressor: 'GT2871R',
    price: 72000,
    color: { r: 36, g: 40, b: 44 },
  },
]

async function main() {
  console.log('Starting database seed...')

  // Очистка существующих товаров
  console.log('Cleaning existing products...')
  await prisma.product.deleteMany()

  // Очистка директории с products изображениями (для чистого seed)
  console.log('Cleaning products images directory...')
  try {
    await fs.rm(PRODUCTS_IMAGES_DIR, { recursive: true, force: true })
  } catch (error) {
    // Директория может не существовать
  }
  await fs.mkdir(PRODUCTS_IMAGES_DIR, { recursive: true })

  // Создание товаров
  console.log('Creating products with images...')

  for (const data of productsData) {
    // Генерируем slug
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')

    console.log(`Creating product: ${data.title}`)

    // Генерируем главное изображение
    const img = await generatePlaceholderImage(slug, data.color)

    // Генерируем галерею (2-4 изображения)
    const galleryCount = Math.floor(Math.random() * 3) + 2 // 2-4 изображений
    const gallery = await generateGallery(slug, data.color, galleryCount)

    // Создаем товар в БД
    await prisma.product.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        details: [
          `Турбокомпрессор ${data.compressor}`,
          `Совместим с ${data.autoMark} ${data.engineModel}`,
          'Новый, оригинальное качество',
          'Гарантия 12 месяцев',
          'Быстрая доставка по России',
        ],
        price: data.price,
        engineModel: data.engineModel,
        autoMark: data.autoMark,
        compressor: data.compressor,
        img,
        gallery,
      },
    })

    console.log(`✓ Created: ${data.title}`)
  }

  const count = await prisma.product.count()
  console.log(`\n✓ Seed completed! Created ${count} products.`)
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
