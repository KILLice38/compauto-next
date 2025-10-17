import path from 'path'

/**
 * Константы для путей к файлам и директориям
 */

// Базовые пути
export const PUBLIC_DIR = path.join(process.cwd(), 'public')
export const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads')
export const PRODUCTS_DIR = path.join(UPLOADS_DIR, 'products')
export const TMP_DIR = path.join(UPLOADS_DIR, 'tmp')

// Относительные пути (для URL)
export const UPLOADS_BASE_URL = '/uploads'
export const PRODUCTS_BASE_URL = '/uploads/products'
export const TMP_BASE_URL = '/uploads/tmp'

/**
 * Получить абсолютный путь к папке продукта
 */
export function getProductDir(slug: string): string {
  return path.join(PRODUCTS_DIR, slug)
}

/**
 * Получить абсолютный путь к временной папке
 */
export function getTmpDir(token: string): string {
  return path.join(TMP_DIR, token)
}

/**
 * Преобразовать публичный URL в абсолютный путь
 */
export function publicUrlToAbs(url: string): string {
  const cleanUrl = url.replace(/^\//, '').split('?')[0]
  return path.join(PUBLIC_DIR, cleanUrl)
}

/**
 * Преобразовать абсолютный путь в публичный URL
 */
export function absToPublicUrl(absPath: string): string {
  return absPath.replace(PUBLIC_DIR, '').replace(/\\/g, '/')
}

/**
 * Проверить, является ли URL временным (tmp)
 */
export function isTmpUrl(url: string | null | undefined): boolean {
  return !!url && url.includes(TMP_BASE_URL)
}

/**
 * Проверить, является ли URL продуктовым
 */
export function isProductUrl(url: string | null | undefined): boolean {
  return !!url && url.includes(PRODUCTS_BASE_URL)
}

/**
 * Извлечь токен из временного URL
 */
export function extractTmpToken(url: string): string | null {
  const match = url.match(/\/uploads\/tmp\/([^/]+)/)
  return match?.[1] ?? null
}

/**
 * Извлечь slug продукта из URL
 */
export function extractProductSlug(url: string): string | null {
  const match = url.match(/\/uploads\/products\/([^/]+)/)
  return match?.[1] ?? null
}
