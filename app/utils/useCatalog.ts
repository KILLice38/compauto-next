import { useMemo, useState } from 'react'
import type { ProductType } from '../types/interfaces'
import { filterByKey, filterBySearch, sortProducts } from './catalogUtils'

export function useCatalog(allProducts: ProductType[], perPage = 12) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ [K in keyof ProductType]?: string | null }>({})
  const [sort, setSort] = useState<'recent' | 'az' | 'za' | 'priceAsc' | 'priceDesc' | null>('recent')
  const [page, setPage] = useState(1)

  const processed = useMemo(() => {
    let arr = filterBySearch(allProducts, searchTerm)
    Object.entries(filters).forEach(([key, val]) => {
      arr = filterByKey(arr, key as keyof ProductType, val ?? null)
    })
    arr = sortProducts(arr, sort)
    return arr
  }, [allProducts, searchTerm, filters, sort])

  const visibleProducts = processed.slice(0, page * perPage)
  const hasMore = visibleProducts.length < processed.length

  return {
    visibleProducts,
    hasMore,
    filters,
    loadMore: () => setPage((p) => p + 1),
    setSearchTerm,
    setFilters,
    setSort,
    resetPage: () => setPage(1),
  }
}
