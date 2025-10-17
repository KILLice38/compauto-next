// types/index.ts
import { z } from 'zod'

// Re-export ProductType from the shared types (Prisma-generated)
export type { ProductType, ProductDTO } from '../../types/interfaces'

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
