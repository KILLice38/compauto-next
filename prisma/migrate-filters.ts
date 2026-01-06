import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const prisma = new PrismaClient({
  adapter: new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL })),
})

async function migrateFilters() {
  console.log('🔄 Начинаем миграцию фильтров...\n')

  try {
    // Получаем все продукты
    const products = await prisma.product.findMany({
      select: {
        autoMark: true,
        engineModel: true,
        compressor: true,
      },
    })

    console.log(`📦 Найдено продуктов: ${products.length}`)

    // Собираем уникальные значения
    const autoMarks = new Set<string>()
    const engineModels = new Set<string>()
    const compressors = new Set<string>()

    products.forEach((product) => {
      if (product.autoMark) autoMarks.add(product.autoMark)
      if (product.engineModel) engineModels.add(product.engineModel)
      if (product.compressor) compressors.add(product.compressor)
    })

    console.log(`\n📊 Уникальные значения:`)
    console.log(`  - Марки авто: ${autoMarks.size}`)
    console.log(`  - Модели двигателя: ${engineModels.size}`)
    console.log(`  - Типы компрессора: ${compressors.size}`)

    // Создаем FilterOption записи
    let created = 0
    let skipped = 0

    console.log(`\n💾 Создаем записи в FilterOption...`)

    // Марки авто
    for (const value of autoMarks) {
      try {
        await (prisma as any).filterOption.create({
          data: {
            type: 'autoMark',
            value,
          },
        })
        created++
      } catch (error) {
        // Запись уже существует (unique constraint)
        skipped++
      }
    }

    // Модели двигателя
    for (const value of engineModels) {
      try {
        await (prisma as any).filterOption.create({
          data: {
            type: 'engineModel',
            value,
          },
        })
        created++
      } catch (error) {
        skipped++
      }
    }

    // Типы компрессора
    for (const value of compressors) {
      try {
        await (prisma as any).filterOption.create({
          data: {
            type: 'compressor',
            value,
          },
        })
        created++
      } catch (error) {
        skipped++
      }
    }

    console.log(`\n✅ Миграция завершена успешно!`)
    console.log(`  - Создано новых записей: ${created}`)
    console.log(`  - Пропущено (уже существуют): ${skipped}`)

    // Показываем итоговую статистику
    const filterOptions = await (prisma as any).filterOption.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
    })

    console.log(`\n📈 Итоговая статистика FilterOption:`)
    filterOptions.forEach((fo: { type: string; _count: { id: number } }) => {
      const typeName =
        fo.type === 'autoMark' ? 'Марки авто' : fo.type === 'engineModel' ? 'Модели двигателя' : 'Типы компрессора'
      console.log(`  - ${typeName}: ${fo._count.id}`)
    })
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrateFilters()
