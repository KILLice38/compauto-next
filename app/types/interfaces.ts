import type { Product } from '@prisma/client'

// Use Prisma-generated types as the source of truth
export type ProductType = Product

// For API responses where dates are serialized as strings
export type ProductDTO = Omit<Product, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}
