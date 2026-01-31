/**
 * Audit Logging System
 * Логирует все действия в админке (создание, редактирование, удаление)
 */

import { promises as fs } from 'fs'
import path from 'path'

// Путь к файлу логов
const LOG_DIR =
  process.env.NODE_ENV === 'production' ? '/var/www/compauto/shared/logs' : path.join(process.cwd(), 'logs')

const AUDIT_LOG_FILE = path.join(LOG_DIR, 'audit.log')

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT'

export type AuditEntity = 'PRODUCT' | 'FILTER' | 'USER' | 'SESSION'

export interface AuditLogEntry {
  timestamp: string
  action: AuditAction
  entity: AuditEntity
  entityId?: string | number
  entityName?: string
  userId?: string
  userEmail?: string
  ip?: string
  userAgent?: string
  details?: Record<string, unknown>
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
}

/**
 * Форматирует запись лога в читаемую строку
 */
function formatLogEntry(entry: AuditLogEntry): string {
  const parts = [`[${entry.timestamp}]`, `[${entry.action}]`, `[${entry.entity}]`]

  if (entry.entityId) {
    parts.push(`ID:${entry.entityId}`)
  }

  if (entry.entityName) {
    parts.push(`"${entry.entityName}"`)
  }

  if (entry.userEmail) {
    parts.push(`by:${entry.userEmail}`)
  }

  if (entry.ip) {
    parts.push(`IP:${entry.ip}`)
  }

  // Добавляем детали изменений для UPDATE
  if (entry.action === 'UPDATE' && entry.oldData && entry.newData) {
    const changes = getChangedFields(entry.oldData, entry.newData)
    if (changes.length > 0) {
      parts.push(`changes:[${changes.join(', ')}]`)
    }
  }

  // Добавляем дополнительные детали
  if (entry.details) {
    parts.push(`details:${JSON.stringify(entry.details)}`)
  }

  return parts.join(' ')
}

/**
 * Определяет какие поля изменились
 */
function getChangedFields(oldData: Record<string, unknown>, newData: Record<string, unknown>): string[] {
  const changes: string[] = []
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

  for (const key of allKeys) {
    const oldVal = JSON.stringify(oldData[key])
    const newVal = JSON.stringify(newData[key])
    if (oldVal !== newVal) {
      changes.push(key)
    }
  }

  return changes
}

/**
 * Записывает лог в файл
 */
async function writeToFile(entry: AuditLogEntry): Promise<void> {
  try {
    // Создаём директорию если не существует
    await fs.mkdir(LOG_DIR, { recursive: true })

    const logLine = formatLogEntry(entry) + '\n'
    await fs.appendFile(AUDIT_LOG_FILE, logLine, 'utf-8')
  } catch (error) {
    console.error('[AUDIT] Failed to write log:', error)
  }
}

/**
 * Также выводим в консоль для PM2 логов
 */
function writeToConsole(entry: AuditLogEntry): void {
  const formattedEntry = formatLogEntry(entry)
  console.log(`[AUDIT] ${formattedEntry}`)
}

/**
 * Основная функция логирования
 */
export async function auditLog(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  const fullEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  }

  // Пишем в консоль (PM2 подхватит)
  writeToConsole(fullEntry)

  // Пишем в файл
  await writeToFile(fullEntry)
}

/**
 * Хелпер для извлечения информации из запроса
 */
export function getRequestInfo(req: Request): { ip: string; userAgent: string } {
  const headers = req.headers

  // Получаем IP (учитываем прокси)
  const ip = headers.get('x-real-ip') || headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const userAgent = headers.get('user-agent') || 'unknown'

  return { ip, userAgent }
}

/**
 * Хелперы для разных типов действий
 */
export const audit = {
  // Продукты
  productCreated: async (
    product: { id: number; title: string },
    user: { email?: string; id?: string } | null,
    req: Request
  ) => {
    const { ip, userAgent } = getRequestInfo(req)
    await auditLog({
      action: 'CREATE',
      entity: 'PRODUCT',
      entityId: product.id,
      entityName: product.title,
      userEmail: user?.email,
      userId: user?.id,
      ip,
      userAgent,
    })
  },

  productUpdated: async (
    product: { id: number; title: string },
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    user: { email?: string; id?: string } | null,
    req: Request
  ) => {
    const { ip, userAgent } = getRequestInfo(req)
    await auditLog({
      action: 'UPDATE',
      entity: 'PRODUCT',
      entityId: product.id,
      entityName: product.title,
      userEmail: user?.email,
      userId: user?.id,
      ip,
      userAgent,
      oldData,
      newData,
    })
  },

  productDeleted: async (
    product: { id: number; title: string },
    user: { email?: string; id?: string } | null,
    req: Request
  ) => {
    const { ip, userAgent } = getRequestInfo(req)
    await auditLog({
      action: 'DELETE',
      entity: 'PRODUCT',
      entityId: product.id,
      entityName: product.title,
      userEmail: user?.email,
      userId: user?.id,
      ip,
      userAgent,
    })
  },

  // Фильтры
  filterCreated: async (
    filter: { id: number; value: string; type: string },
    user: { email?: string; id?: string } | null,
    req: Request
  ) => {
    const { ip, userAgent } = getRequestInfo(req)
    await auditLog({
      action: 'CREATE',
      entity: 'FILTER',
      entityId: filter.id,
      entityName: `${filter.type}:${filter.value}`,
      userEmail: user?.email,
      userId: user?.id,
      ip,
      userAgent,
    })
  },

  filterUpdated: async (
    filter: { id: number; value: string; type: string },
    oldValue: string,
    user: { email?: string; id?: string } | null,
    req: Request
  ) => {
    const { ip, userAgent } = getRequestInfo(req)
    await auditLog({
      action: 'UPDATE',
      entity: 'FILTER',
      entityId: filter.id,
      entityName: `${filter.type}:${filter.value}`,
      userEmail: user?.email,
      userId: user?.id,
      ip,
      userAgent,
      oldData: { value: oldValue },
      newData: { value: filter.value },
    })
  },

  filterDeleted: async (
    filter: { id: number; value: string; type: string },
    user: { email?: string; id?: string } | null,
    req: Request
  ) => {
    const { ip, userAgent } = getRequestInfo(req)
    await auditLog({
      action: 'DELETE',
      entity: 'FILTER',
      entityId: filter.id,
      entityName: `${filter.type}:${filter.value}`,
      userEmail: user?.email,
      userId: user?.id,
      ip,
      userAgent,
    })
  },

  // Авторизация
  loginSuccess: async (user: { email: string; id: string }, req: Request) => {
    const { ip, userAgent } = getRequestInfo(req)
    await auditLog({
      action: 'LOGIN',
      entity: 'SESSION',
      userEmail: user.email,
      userId: user.id,
      ip,
      userAgent,
    })
  },

  loginFailed: async (email: string, req: Request) => {
    const { ip, userAgent } = getRequestInfo(req)
    await auditLog({
      action: 'LOGIN_FAILED',
      entity: 'SESSION',
      userEmail: email,
      ip,
      userAgent,
    })
  },
}
