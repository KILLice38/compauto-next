import type { ProductType } from '../types/interfaces'

export function filterBySearch(products: ProductType[], term: string) {
  const lower = term.toLowerCase()
  return products.filter((p) => p.title.toLowerCase().includes(lower))
}

export function filterByKey<T extends keyof ProductType>(
  products: ProductType[],
  key: T,
  value: ProductType[T] | null
) {
  if (value == null) {
    return products
  }
  return products.filter((product) => product[key] === value)
}

export function sortProducts(
  products: ProductType[],
  option: 'recent' | 'az' | 'za' | 'priceAsc' | 'priceDesc' | null
) {
  if (option === 'az') {
    return [...products].sort((a, b) => a.title.localeCompare(b.title))
  }
  if (option === 'za') {
    return [...products].sort((a, b) => b.title.localeCompare(a.title))
  }
  if (option === 'priceAsc') {
    return [...products].sort((a, b) => a.price - b.price)
  }
  if (option === 'priceDesc') {
    return [...products].sort((a, b) => b.price - a.price)
  }
  if (option === 'recent') {
    return [...products]
  }
  return products
}
