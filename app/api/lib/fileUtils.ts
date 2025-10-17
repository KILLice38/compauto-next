// app/api/lib/fileUtils.ts
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Создаёт директорию рекурсивно если не существует
 */
export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}

/**
 * Удаляет query string из URL
 * @example stripQuery('/uploads/image.webp?t=123') => '/uploads/image.webp'
 */
export function stripQuery(url: string): string {
  const queryIndex = url.indexOf('?')
  return queryIndex >= 0 ? url.slice(0, queryIndex) : url
}

/**
 * Получает базовое имя файла без варианта и расширения
 * @example baseNoVariantNoExt('/uploads/image__source.webp') => '/uploads/image'
 */
export function baseNoVariantNoExt(publicUrl: string): string {
  const clean = stripQuery(publicUrl)
  const dotIndex = clean.lastIndexOf('.')
  const noExt = dotIndex >= 0 ? clean.slice(0, dotIndex) : clean
  return noExt.replace(/__(source|card|detail|thumb)$/i, '')
}

/**
 * Получает все варианты изображения из любого публичного URL
 * @example allVariantPublicsFromAny('/uploads/image__source.webp')
 * => ['/uploads/image__source.webp', '/uploads/image__card.webp', ...]
 */
export function allVariantPublicsFromAny(publicUrl: string): string[] {
  const base = baseNoVariantNoExt(publicUrl)
  return [`${base}__source.webp`, `${base}__card.webp`, `${base}__detail.webp`, `${base}__thumb.webp`]
}

/**
 * Проверяет является ли директория пустой (рекурсивно)
 */
export async function isDirEffectivelyEmpty(dir: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile()) {
        return false
      }
      if (entry.isDirectory()) {
        const subDirEmpty = await isDirEffectivelyEmpty(path.join(dir, entry.name))
        if (!subDirEmpty) {
          return false
        }
      }
    }
    return true
  } catch {
    // Если директория не существует или нет доступа - считаем пустой
    return true
  }
}

/**
 * Удаляет директорию если она пуста (рекурсивно)
 */
export async function pruneFolderIfEmpty(dir: string): Promise<void> {
  try {
    const isEmpty = await isDirEffectivelyEmpty(dir)
    if (isEmpty) {
      await fs.rm(dir, { recursive: true, force: true })
    }
  } catch {
    // Игнорируем ошибки при удалении
  }
}
