import { promises as fs } from 'fs'
import path from 'path'
import { TMP_DIR } from './paths'

/**
 * Максимальный возраст временных файлов в миллисекундах (1 день)
 */
const MAX_TMP_AGE_MS = 24 * 60 * 60 * 1000 // 1 день

/**
 * Очистка старых временных файлов из /uploads/tmp/*
 * Удаляет файлы и папки старше 1 дня
 */
export async function cleanupOldTmpFiles(): Promise<{ deletedDirs: number; deletedFiles: number; errors: string[] }> {
  let deletedDirs = 0
  let deletedFiles = 0
  const errors: string[] = []

  try {
    // Проверяем существование tmp директории
    try {
      await fs.access(TMP_DIR)
    } catch {
      // Директория не существует - нечего чистить
      return { deletedDirs: 0, deletedFiles: 0, errors: [] }
    }

    const now = Date.now()
    const entries = await fs.readdir(TMP_DIR, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(TMP_DIR, entry.name)

      try {
        const stats = await fs.stat(fullPath)
        const age = now - stats.mtimeMs

        // Если файл/папка старше 1 дня
        if (age > MAX_TMP_AGE_MS) {
          if (entry.isDirectory()) {
            // Удаляем папку рекурсивно
            await fs.rm(fullPath, { recursive: true, force: true })
            deletedDirs++
            console.log(`Deleted old tmp directory: ${entry.name} (age: ${Math.round(age / 1000 / 60 / 60)} hours)`)
          } else if (entry.isFile()) {
            // Удаляем файл
            await fs.unlink(fullPath)
            deletedFiles++
            console.log(`Deleted old tmp file: ${entry.name} (age: ${Math.round(age / 1000 / 60 / 60)} hours)`)
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process ${entry.name}: ${error instanceof Error ? error.message : String(error)}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    console.log(
      `Tmp cleanup completed: ${deletedDirs} directories, ${deletedFiles} files deleted, ${errors.length} errors`
    )
  } catch (error) {
    const errorMsg = `Failed to cleanup tmp files: ${error instanceof Error ? error.message : String(error)}`
    console.error(errorMsg)
    errors.push(errorMsg)
  }

  return { deletedDirs, deletedFiles, errors }
}

/**
 * Получить информацию о временных файлах
 */
export async function getTmpFilesInfo(): Promise<{
  totalDirs: number
  totalFiles: number
  oldDirs: number
  oldFiles: number
  totalSize: number
}> {
  let totalDirs = 0
  let totalFiles = 0
  let oldDirs = 0
  let oldFiles = 0
  let totalSize = 0

  try {
    try {
      await fs.access(TMP_DIR)
    } catch {
      return { totalDirs: 0, totalFiles: 0, oldDirs: 0, oldFiles: 0, totalSize: 0 }
    }

    const now = Date.now()
    const entries = await fs.readdir(TMP_DIR, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(TMP_DIR, entry.name)

      try {
        const stats = await fs.stat(fullPath)
        const age = now - stats.mtimeMs

        if (entry.isDirectory()) {
          totalDirs++
          if (age > MAX_TMP_AGE_MS) oldDirs++

          // Подсчитываем размер файлов в директории
          const dirSize = await getDirSize(fullPath)
          totalSize += dirSize
        } else if (entry.isFile()) {
          totalFiles++
          if (age > MAX_TMP_AGE_MS) oldFiles++
          totalSize += stats.size
        }
      } catch (error) {
        console.error(`Failed to get info for ${entry.name}:`, error)
      }
    }
  } catch (error) {
    console.error('Failed to get tmp files info:', error)
  }

  return { totalDirs, totalFiles, oldDirs, oldFiles, totalSize }
}

/**
 * Рекурсивно подсчитывает размер директории
 */
async function getDirSize(dirPath: string): Promise<number> {
  let size = 0

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      try {
        if (entry.isDirectory()) {
          size += await getDirSize(fullPath)
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath)
          size += stats.size
        }
      } catch {
        // Игнорируем ошибки для отдельных файлов
      }
    }
  } catch {
    // Игнорируем ошибки доступа к директории
  }

  return size
}
