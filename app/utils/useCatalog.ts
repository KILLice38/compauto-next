import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import type { ProductType } from '../types/interfaces'
import { filterByKey, filterBySearch, sortProducts } from './catalogUtils'

const PAGE_SIZE = 4

export function useCatalog() {
  const [allProducts, setAllProducts] = useState<ProductType[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ [K in keyof ProductType]?: string | null }>({})
  const [sort, setSort] = useState<'recent' | 'az' | 'za' | 'priceAsc' | 'priceDesc' | null>('recent')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const prevSearch = useRef(searchTerm)
  const prevFilters = useRef(filters)
  const prevSort = useRef(sort)

  const loadingRef = useRef(false)
  const allProductsRef = useRef<ProductType[]>([])
  allProductsRef.current = allProducts

  const loadFromServer = useCallback(async (reset = false) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)

    try {
      const skip = reset ? 0 : allProductsRef.current.length
      const res = await fetch(`/api/products?skip=${skip}&take=${PAGE_SIZE}`)
      const data: ProductType[] = await res.json()

      setAllProducts((prev) => (reset ? data : [...prev, ...data]))
      setHasMore(data.length === PAGE_SIZE)

      if (reset) {
        setPage(1)
      } else {
        setPage((p) => p + 1)
      }
    } catch {
      setHasMore(false)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const searchChanged = prevSearch.current !== searchTerm
    const filtersChanged = JSON.stringify(prevFilters.current) !== JSON.stringify(filters)
    const sortChanged = prevSort.current !== sort

    if (searchChanged || filtersChanged || sortChanged) {
      loadFromServer(true)
    }

    prevSearch.current = searchTerm
    prevFilters.current = filters
    prevSort.current = sort
  }, [searchTerm, filters, sort, loadFromServer])

  useEffect(() => {
    loadFromServer(true)
  }, [loadFromServer])

  const processed = useMemo(() => {
    let arr = filterBySearch(allProducts, searchTerm)
    Object.entries(filters).forEach(([key, val]) => {
      arr = filterByKey(arr, key as keyof ProductType, val ?? null)
    })
    arr = sortProducts(arr, sort)
    return arr
  }, [allProducts, searchTerm, filters, sort])

  const visibleProducts = processed.slice(0, page * PAGE_SIZE)

  return {
    visibleProducts,
    hasMore,
    loading,
    filters,
    setSearchTerm,
    setFilters,
    setSort,
    loadMore: () => loadFromServer(false),
    resetPage: () => setPage(1),
    allProducts,
  }
}
