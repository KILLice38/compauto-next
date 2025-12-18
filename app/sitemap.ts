import { MetadataRoute } from 'next'
import prisma from './lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://comp-auto.ru'

  try {
    // Получаем все продукты с необходимыми полями для sitemap
    const products = await prisma.product.findMany({
      select: {
        slug: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Статические страницы
    const staticPages: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/catalog`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      },
    ]

    // Динамические страницы продуктов
    const productPages: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${baseUrl}/catalog/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [...staticPages, ...productPages]
  } catch (error) {
    console.error('[SITEMAP] Error generating sitemap:', error)

    // Fallback: возвращаем только статические страницы если БД недоступна
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/catalog`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      },
    ]
  }
}
