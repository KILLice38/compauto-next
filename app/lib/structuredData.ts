import { Product } from '@prisma/client'

const BASE_URL = 'https://comp-auto.ru'

/**
 * Генерирует Schema.org разметку для продукта
 */
export function generateProductSchema(product: Product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.img ? `${BASE_URL}${product.img}` : undefined,
    brand: {
      '@type': 'Brand',
      name: product.autoMark,
    },
    offers: {
      '@type': 'Offer',
      url: `${BASE_URL}/catalog/${product.slug}`,
      priceCurrency: 'RUB',
      price: product.price,
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'Komp-Auto',
      },
    },
    sku: product.slug,
    category: 'Турбокомпрессоры',
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Модель двигателя',
        value: product.engineModel,
      },
      {
        '@type': 'PropertyValue',
        name: 'Тип компрессора',
        value: product.compressor,
      },
    ],
  }
}

/**
 * Генерирует Schema.org разметку для хлебных крошек
 */
export function generateBreadcrumbSchema(product: Product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Главная',
        item: BASE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Каталог',
        item: `${BASE_URL}/catalog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.title,
        item: `${BASE_URL}/catalog/${product.slug}`,
      },
    ],
  }
}

/**
 * Генерирует Schema.org разметку для организации (для главной страницы)
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Komp-Auto',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: 'Продажа турбокомпрессоров и запчастей для автомобилей',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'RU',
    },
  }
}

/**
 * Генерирует Schema.org разметку для WebSite с поиском
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Komp-Auto',
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/catalog?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}
