import { ProductType } from '../types/interfaces'

export function getUniqueValues(products: ProductType[], key: keyof ProductType): string[] {
  const set = new Set<string>()
  products.forEach((p) => {
    const val = p[key]
    if (typeof val === 'string' && val.trim() !== '') {
      set.add(val)
    }
  })
  return Array.from(set)
}
