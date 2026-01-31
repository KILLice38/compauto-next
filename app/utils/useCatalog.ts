import { useState, useEffect, useRef, useCallback } from 'react'
import type { ProductType } from '../types/interfaces'

const PAGE_SIZE = 12

// Тип для вариантов фильтров
interface FilterVariants {
  autoMark: string[]
  engineModel: string[]
  compressor: string[]
}

export function useCatalog() {
  const [visibleProducts, setVisibleProducts] = useState<ProductType[]>([])
  const [total, setTotal] = useState(0)
  const [filterVariants, setFilterVariants] = useState<FilterVariants>({
    autoMark: [],
    engineModel: [],
    compressor: [],
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<{ [K in keyof ProductType]?: string | null }>({})
  const [sort, setSort] = useState<'recent' | 'az' | 'za' | 'priceAsc' | 'priceDesc' | null>('recent')
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const prevSearch = useRef(searchTerm)
  const prevFilters = useRef(filters)
  const prevSort = useRef(sort)
  const initialLoadDone = useRef(false)

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
        const data: { products: ProductType[]; total: number } = await res.json()

        const newProducts = reset ? data.products : [...visibleProducts, ...data.products]
        setVisibleProducts(newProducts)
        setTotal(data.total)
        setHasMore(newProducts.length < data.total)
      } catch {
        setHasMore(false)
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    },
    [buildQueryString, visibleProducts]
  )

  // Initial load on mount
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      loadFromServer(true)
    }
  }, [loadFromServer])

  // Reload on search/filter/sort changes
  useEffect(() => {
    if (!initialLoadDone.current) return // Skip initial load, handled above

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

  // Load filter variants from dedicated endpoint (not from products)
  useEffect(() => {
    const loadFilterVariants = async () => {
      try {
        const res = await fetch('/api/filters')
        const data: {
          autoMark: { value: string }[]
          engineModel: { value: string }[]
          compressor: { value: string }[]
        } = await res.json()
        setFilterVariants({
          autoMark: data.autoMark.map((f) => f.value),
          engineModel: data.engineModel.map((f) => f.value),
          compressor: data.compressor.map((f) => f.value),
        })
      } catch (error) {
        console.error('Failed to load filter variants:', error)
      }
    }
    loadFilterVariants()
  }, [])

  return {
    visibleProducts,
    total,
    hasMore,
    loading,
    filters,
    setSearchTerm,
    setFilters,
    setSort,
    loadMore: () => loadFromServer(false),
    filterVariants,
  }
}
