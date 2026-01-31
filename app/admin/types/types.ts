// types/index.ts
import { z } from 'zod'

// Re-export ProductType from the shared types (Prisma-generated)
export type { ProductType, ProductDTO } from '../../types/interfaces'

export const AdminProductFormSchema = z.object({
  title: z.string().min(1, 'Название обязательно'),
  description: z.string().min(1, 'Короткое описание обязательно'),
  // ВАЖНО: z.any() для details из-за ограничений react-hook-form useFieldArray с примитивами
  // Валидация происходит на уровне API (app/api/lib/validation.ts)
  details: z.any().optional(),
  price: z.coerce.number().int().nonnegative(),
  engineModel: z.string().optional(),
  autoMark: z.string().optional(),
  compressor: z.string().optional(),
  // URL изображений (строки после загрузки на сервер)
  img: z.string().optional(),
  gallery: z.array(z.string()).optional(),
})

// ТИП ФОРМЫ — РОВНО input-схема (чтобы совпасть с резолвером)
export type AdminProductForm = z.input<typeof AdminProductFormSchema>

// (если используешь где-то ещё)
export type ProductFormValues = AdminProductForm
