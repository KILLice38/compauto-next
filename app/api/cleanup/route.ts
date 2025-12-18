// app/api/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../lib/auth'
import { cleanupOldTmpFiles, getTmpFilesInfo } from '../lib/cleanup'

export const runtime = 'nodejs'

/**
 * GET /api/cleanup - Получить информацию о временных файлах
 */
export async function GET(req: NextRequest) {
  // Проверка авторизации
  const authError = await requireAuth(req)
  if (authError) return authError

  try {
    const info = await getTmpFilesInfo()
    return NextResponse.json(info)
  } catch (error) {
    console.error('Failed to get tmp files info:', error)
    return NextResponse.json({ error: 'Failed to get tmp files info' }, { status: 500 })
  }
}

/**
 * POST /api/cleanup - Запустить очистку старых временных файлов
 */
export async function POST(req: NextRequest) {
  // Проверка авторизации
  const authError = await requireAuth(req)
  if (authError) return authError

  try {
    console.log('Starting manual tmp cleanup...')
    const result = await cleanupOldTmpFiles()

    if (result.errors.length > 0) {
      return NextResponse.json(
        {
          success: true,
          deletedDirs: result.deletedDirs,
          deletedFiles: result.deletedFiles,
          errors: result.errors,
          message: 'Cleanup completed with some errors',
        },
        { status: 207 } // Multi-Status
      )
    }

    return NextResponse.json({
      success: true,
      deletedDirs: result.deletedDirs,
      deletedFiles: result.deletedFiles,
      message: `Successfully deleted ${result.deletedDirs} directories and ${result.deletedFiles} files`,
    })
  } catch (error) {
    console.error('Failed to cleanup tmp files:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup tmp files',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
