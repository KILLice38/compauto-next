import { z } from 'zod'

export const ProductSchema = z.object({
  img: z.any().refine((files) => files?.length === 1, 'Изображение обязательно'),
  title: z.string().min(1, 'Название обязательно'),
  description: z.string().min(1, 'Описание обязательно'),
  price: z.number({ invalid_type_error: 'Цена должна быть числом' }).min(0, 'Цена ≥ 0'),
  engineModel: z.string().min(1, 'Модель двигателя обязательна'),
  autoMark: z.string().min(1, 'Марка авто обязательна'),
  compressor: z.string().min(1, 'Компрессор обязателен'),
})

export type ProductFormValues = z.infer<typeof ProductSchema>
