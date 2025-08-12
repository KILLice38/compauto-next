// types/index.ts
import { z } from 'zod'

export const AdminProductFormSchema = z.object({
  title: z.string().min(1, 'Название обязательно'),
  description: z.string().min(1, 'Короткое описание обязательно'),
  // ВАЖНО: optional — zodResolver работает по input-типу (можно не присылать поле)
  details: z.array(z.string().trim()).optional(),
  price: z.coerce.number().int().nonnegative(),
  engineModel: z.string().optional(),
  autoMark: z.string().optional(),
  compressor: z.string().optional(),
  img: z.any().optional(),
  gallery: z.any().optional(),
})

// ТИП ФОРМЫ — РОВНО input-схема (чтобы совпасть с резолвером)
export type AdminProductForm = z.input<typeof AdminProductFormSchema>

// (если используешь где-то ещё)
export type ProductFormValues = AdminProductForm

// Клиентский тип товара оставь как был
export interface ProductType {
  id: number
  slug: string
  img: string
  gallery?: string[]
  title: string
  description: string
  details?: string[]
  price: number
  engineModel?: string | null
  autoMark?: string | null
  compressor?: string | null
  createdAt?: string
  updatedAt?: string
}
