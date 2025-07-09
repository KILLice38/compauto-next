'use client'

import { useMediaQuery } from 'react-responsive'
import DownloadIcon from '../../components/downloadIcon'
import Filters, { TestData } from '../../components/filters'
import SearchPanel from '../../components/searchPanel'
import SortIcon from '../../components/sortIcon'
import type { ProductType } from '../../types/interfaces'
import { useCatalog } from '../../utils/useCatalog'
import css from './page.module.scss'
import { useEffect, useState } from 'react'
import Products from '../../components/products'
import { getUniqueValues } from '../../utils/getUniqueValues'

const PAGE_SIZE = 12

const CatalogPage = () => {
  const [products, setProducts] = useState<ProductType[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const loadProducts = async (reset = false) => {
    if (loading) return
    setLoading(true)
    try {
      const skip = reset ? 0 : page * PAGE_SIZE
      const res = await fetch(`/api/products?skip=${skip}&take=${PAGE_SIZE}`)
      const newProducts: ProductType[] = await res.json()

      setProducts((prev) => (reset ? newProducts : [...prev, ...newProducts]))
      setHasMore(newProducts.length === PAGE_SIZE)
      setPage(reset ? 1 : page + 1)
    } catch {
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts(true)
  }, [])

  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })

  const {
    visibleProducts,
    hasMore: filteredHasMore,
    filters,
    setSearchTerm,
    setFilters,
    setSort,
    resetPage,
  } = useCatalog(products, PAGE_SIZE)

  const handleFilterChange = <K extends keyof ProductType>(key: K, value: ProductType[K] | null) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value }
      return updated
    })
    resetPage()
  }

  /// Фильтры

  const autoMarkVariants = getUniqueValues(products, 'autoMark')
  const engineModelVariants = getUniqueValues(products, 'engineModel')
  const compressorVariants = getUniqueValues(products, 'compressor')

  // TestData из filters
  const dynamicFilterData: TestData[] = [
    {
      content: 'Марка автомобиля',
      variants: autoMarkVariants,
      key: 'autoMark',
    },
    {
      content: 'Модель двигателя',
      variants: engineModelVariants,
      key: 'engineModel',
    },
    {
      content: 'Тип компрессора',
      variants: compressorVariants,
      key: 'compressor',
    },
  ]

  return (
    <section className={css.catalog}>
      <div className="container">
        <h1 className={css.catalog__title}>Каталог продукции</h1>
        <div className={css.catalog__actions}>
          {!isMobile ? (
            <>
              <SearchPanel
                onSearch={(value) => {
                  setSearchTerm(value)
                  resetPage()
                }}
              />
              <DownloadIcon />
            </>
          ) : (
            <>
              <SortIcon setSort={setSort} resetPage={resetPage} />
              <SearchPanel
                onSearch={(value) => {
                  setSearchTerm(value)
                  resetPage()
                }}
              />
            </>
          )}
        </div>
        <div className={css.catalog__buttons}>
          <Filters filterData={dynamicFilterData} currentFilters={filters} onFilterChange={handleFilterChange} />
          {!isMobile && <SortIcon setSort={setSort} resetPage={resetPage} />}
        </div>
        {loading && products.length === 0 ? (
          <p>Загрузка продуктов...</p>
        ) : (
          <Products products={visibleProducts} onLoadMore={() => loadProducts(false)} hasMore={hasMore} />
        )}
      </div>
    </section>
  )
}

export default CatalogPage
