// app/api/lib/validation.ts
import { z } from 'zod'

/**
 * Zod validation schemas for API input validation
 * Prevents mass assignment attacks by explicitly defining allowed fields
 */

/**
 * Schema for creating a new product
 * Only allows specific fields, prevents mass assignment
 */
export const createProductSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(255),
  description: z.string().min(1, 'Описание обязательно').max(10000),
  price: z.number().int().min(1, 'Укажите цену').max(100_000_000),
  img: z.string().min(1, 'Загрузите главное изображение').max(500),
  gallery: z.array(z.string().max(500)).max(4).optional().default([]),
  details: z.array(z.string().max(1000)).max(20).optional().default([]),
  autoMark: z.string().min(1, 'Выберите марку авто').max(100),
  engineModel: z.string().min(1, 'Выберите модель двигателя').max(100),
  compressor: z.string().min(1, 'Выберите тип компрессора').max(100),
})

/**
 * Schema for updating a product
 * All fields are optional for partial updates
 */
export const updateProductSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional(),
  price: z.number().int().min(0).max(100_000_000).optional(),
  img: z.string().max(500).optional(),
  gallery: z.array(z.string().max(500)).max(4).optional(),
  details: z.array(z.string().max(1000)).max(20).optional(),
  autoMark: z.string().max(100).optional(),
  engineModel: z.string().max(100).optional(),
  compressor: z.string().max(100).optional(),
})

/**
 * Schema for query parameters in GET /api/products
 */
export const productQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().max(255).optional(),
  autoMark: z.string().max(100).optional(),
  engineModel: z.string().max(100).optional(),
  compressor: z.string().max(100).optional(),
  sort: z.enum(['recent', 'az', 'za', 'priceAsc', 'priceDesc']).optional(),
})

// Type exports for use in handlers
export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductQueryInput = z.infer<typeof productQuerySchema>

/**
 * Helper to format Zod errors for API responses
 */
export function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
}
