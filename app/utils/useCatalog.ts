import { useState, useEffect, useRef, useCallback } from 'react'
import type { ProductType } from '../types/interfaces'

const PAGE_SIZE = 12

export function useCatalog() {
  const [visibleProducts, setVisibleProducts] = useState<ProductType[]>([])
  const [allProducts, setAllProducts] = useState<ProductType[]>([]) // For filter variants only
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ [K in keyof ProductType]?: string | null }>({})
  const [sort, setSort] = useState<'recent' | 'az' | 'za' | 'priceAsc' | 'priceDesc' | null>('recent')
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const prevSearch = useRef(searchTerm)
  const prevFilters = useRef(filters)
  const prevSort = useRef(sort)

  const loadingRef = useRef(false)

  // Build query string from current filters and sort
  const buildQueryString = useCallback(
    (skip: number) => {
      const params = new URLSearchParams()
      params.set('skip', skip.toString())
      params.set('take', PAGE_SIZE.toString())

      if (searchTerm) {
        params.set('search', searchTerm)
      }

      if (filters.autoMark) {
        params.set('autoMark', String(filters.autoMark))
      }

      if (filters.engineModel) {
        params.set('engineModel', String(filters.engineModel))
      }

      if (filters.compressor) {
        params.set('compressor', String(filters.compressor))
      }

      if (sort && sort !== 'recent') {
        params.set('sort', sort)
      }

      return params.toString()
    },
    [searchTerm, filters, sort]
  )

  const loadFromServer = useCallback(
    async (reset = false) => {
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)

      try {
        const skip = reset ? 0 : visibleProducts.length
        const queryString = buildQueryString(skip)
        const res = await fetch(`/api/products?${queryString}`)
        const data: ProductType[] = await res.json()

        setVisibleProducts((prev) => (reset ? data : [...prev, ...data]))
        setHasMore(data.length === PAGE_SIZE)
      } catch {
        setHasMore(false)
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [buildQueryString, visibleProducts.length]
  )

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

  // Load all products once for filter variants (unfiltered)
  useEffect(() => {
    const loadAllForFilters = async () => {
      try {
        const res = await fetch('/api/products?skip=0&take=1000') // Load up to 1000 products for filter options
        const data: ProductType[] = await res.json()
        setAllProducts(data)
      } catch (error) {
        console.error('Failed to load products for filters:', error)
      }
    }
    loadAllForFilters()
  }, [])

  return {
    visibleProducts,
    hasMore,
    loading,
    filters,
    setSearchTerm,
    setFilters,
    setSort,
    loadMore: () => loadFromServer(false),
    allProducts,
  }
}
