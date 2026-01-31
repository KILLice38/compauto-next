import path from 'path'

/**
 * Константы для путей к файлам и директориям
 *
 * SECURITY: Все функции в этом модуле защищены от path traversal атак.
 * Любой путь проверяется на то, что он не выходит за пределы разрешённых директорий.
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
 * Класс ошибки для path traversal атак
 */
export class PathTraversalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PathTraversalError'
  }
}

/**
 * Проверяет, что путь не содержит опасных последовательностей
 */
function containsTraversalPatterns(input: string): boolean {
  // Проверяем на наличие .. в любом виде
  const dangerous = ['..', '%2e%2e', '%2e.', '.%2e', '%252e', '..%2f', '%2f..', '..%5c', '%5c..']

  const lower = input.toLowerCase()
  return dangerous.some((pattern) => lower.includes(pattern))
}

/**
 * Валидирует slug/token - только безопасные символы
 * Разрешены: буквы, цифры, дефис, подчёркивание
 */
function isValidSlugOrToken(input: string): boolean {
  // Пустой или слишком длинный
  if (!input || input.length > 255) return false

  // Только безопасные символы: буквы (включая кириллицу), цифры, дефис, подчёркивание
  const safePattern = /^[\p{L}\p{N}_-]+$/u
  return safePattern.test(input)
}

/**
 * Проверяет, что результирующий путь находится внутри базовой директории
 */
function isPathWithinBase(resultPath: string, baseDir: string): boolean {
  const normalizedResult = path.normalize(resultPath)
  const normalizedBase = path.normalize(baseDir)

  // Путь должен начинаться с базовой директории
  return normalizedResult.startsWith(normalizedBase + path.sep) || normalizedResult === normalizedBase
}

/**
 * Получить абсолютный путь к папке продукта
 * @throws {PathTraversalError} если slug содержит опасные символы
 */
export function getProductDir(slug: string): string {
  if (!isValidSlugOrToken(slug)) {
    throw new PathTraversalError(`Invalid product slug: ${slug}`)
  }

  const result = path.join(PRODUCTS_DIR, slug)

  if (!isPathWithinBase(result, PRODUCTS_DIR)) {
    throw new PathTraversalError(`Path traversal attempt detected in product slug: ${slug}`)
  }

  return result
}

/**
 * Получить абсолютный путь к временной папке
 * @throws {PathTraversalError} если token содержит опасные символы
 */
export function getTmpDir(token: string): string {
  if (!isValidSlugOrToken(token)) {
    throw new PathTraversalError(`Invalid tmp token: ${token}`)
  }

  const result = path.join(TMP_DIR, token)

  if (!isPathWithinBase(result, TMP_DIR)) {
    throw new PathTraversalError(`Path traversal attempt detected in tmp token: ${token}`)
  }

  return result
}

/**
 * Преобразовать публичный URL в абсолютный путь
 * @throws {PathTraversalError} если URL пытается выйти за пределы PUBLIC_DIR
 */
export function publicUrlToAbs(url: string): string {
  // Проверка на опасные паттерны до нормализации
  if (containsTraversalPatterns(url)) {
    throw new PathTraversalError(`Path traversal attempt detected in URL: ${url}`)
  }

  // Убираем начальный слэш и query параметры
  const cleanUrl = url.replace(/^\//, '').split('?')[0]

  // Дополнительная проверка после очистки
  if (containsTraversalPatterns(cleanUrl)) {
    throw new PathTraversalError(`Path traversal attempt detected after cleaning URL: ${url}`)
  }

  const result = path.join(PUBLIC_DIR, cleanUrl)
  const normalizedResult = path.normalize(result)

  // Проверяем что результат внутри PUBLIC_DIR
  if (!isPathWithinBase(normalizedResult, PUBLIC_DIR)) {
    throw new PathTraversalError(`Path traversal attempt: URL ${url} resolves outside PUBLIC_DIR`)
  }

  return normalizedResult
}

/**
 * Преобразовать абсолютный путь в публичный URL
 * @throws {PathTraversalError} если путь не находится внутри PUBLIC_DIR
 */
export function absToPublicUrl(absPath: string): string {
  const normalizedPath = path.normalize(absPath)

  if (!isPathWithinBase(normalizedPath, PUBLIC_DIR)) {
    throw new PathTraversalError(`Path ${absPath} is not within PUBLIC_DIR`)
  }

  return normalizedPath.replace(PUBLIC_DIR, '').replace(/\\/g, '/')
}

/**
 * Проверить, является ли URL временным (tmp)
 * Безопасная проверка - URL должен начинаться с TMP_BASE_URL
 */
export function isTmpUrl(url: string | null | undefined): boolean {
  if (!url) return false

  // Нормализуем URL для проверки
  const cleanUrl = url.split('?')[0]

  // URL должен начинаться с /uploads/tmp/
  return cleanUrl.startsWith(TMP_BASE_URL + '/')
}

/**
 * Проверить, является ли URL продуктовым
 * Безопасная проверка - URL должен начинаться с PRODUCTS_BASE_URL
 */
export function isProductUrl(url: string | null | undefined): boolean {
  if (!url) return false

  // Нормализуем URL для проверки
  const cleanUrl = url.split('?')[0]

  // URL должен начинаться с /uploads/products/
  return cleanUrl.startsWith(PRODUCTS_BASE_URL + '/')
}

/**
 * Извлечь токен из временного URL
 * @returns токен или null если URL невалидный
 */
export function extractTmpToken(url: string): string | null {
  if (!isTmpUrl(url)) return null

  const match = url.match(/\/uploads\/tmp\/([^/?]+)/)
  const token = match?.[1]

  // Валидируем токен
  if (token && isValidSlugOrToken(token)) {
    return token
  }

  return null
}

/**
 * Извлечь slug продукта из URL
 * @returns slug или null если URL невалидный
 */
export function extractProductSlug(url: string): string | null {
  if (!isProductUrl(url)) return null

  const match = url.match(/\/uploads\/products\/([^/?]+)/)
  const slug = match?.[1]

  // Валидируем slug
  if (slug && isValidSlugOrToken(slug)) {
    return slug
  }

  return null
}

/**
 * Безопасно создать путь к файлу внутри директории продукта
 * @throws {PathTraversalError} если filename содержит опасные символы
 */
export function getProductFilePath(slug: string, filename: string): string {
  const productDir = getProductDir(slug) // уже валидирован

  // Проверяем filename
  if (containsTraversalPatterns(filename)) {
    throw new PathTraversalError(`Path traversal attempt in filename: ${filename}`)
  }

  // filename должен быть простым именем файла без путей
  const basename = path.basename(filename)
  if (basename !== filename || !basename) {
    throw new PathTraversalError(`Invalid filename: ${filename}`)
  }

  const result = path.join(productDir, basename)

  if (!isPathWithinBase(result, productDir)) {
    throw new PathTraversalError(`Path traversal attempt in product file: ${filename}`)
  }

  return result
}

/**
 * Безопасно создать путь к файлу внутри временной директории
 * @throws {PathTraversalError} если filename содержит опасные символы
 */
export function getTmpFilePath(token: string, filename: string): string {
  const tmpDir = getTmpDir(token) // уже валидирован

  // Проверяем filename
  if (containsTraversalPatterns(filename)) {
    throw new PathTraversalError(`Path traversal attempt in filename: ${filename}`)
  }

  // filename должен быть простым именем файла без путей
  const basename = path.basename(filename)
  if (basename !== filename || !basename) {
    throw new PathTraversalError(`Invalid filename: ${filename}`)
  }

  const result = path.join(tmpDir, basename)

  if (!isPathWithinBase(result, tmpDir)) {
    throw new PathTraversalError(`Path traversal attempt in tmp file: ${filename}`)
  }

  return result
}
