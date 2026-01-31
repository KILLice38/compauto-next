'use client'

import { useMediaQuery } from '../../hooks/useMediaQuery'
// import DownloadIcon from '../../components/downloadIcon'
import Filters, { TestData } from '../../components/filters'
import SearchPanel from '../../components/searchPanel'
import SortIcon from '../../components/sortIcon'
import { useCatalog } from '../../utils/useCatalog'
import css from './page.module.scss'
import Products from '../../components/products'
import { ProductType } from '../../types/interfaces'
import { useState } from 'react'

const CatalogPage = () => {
  const isLess1200 = useMediaQuery('(max-width: 1200px)')
  const [isSortExpanded, setIsSortExpanded] = useState(false)

  const { visibleProducts, hasMore, loading, filters, setSearchTerm, setFilters, setSort, loadMore, filterVariants } =
    useCatalog()

  const handleFilterChange = <K extends keyof ProductType>(key: K, value: ProductType[K] | null) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const dynamicFilterData: TestData[] = [
    {
      content: 'Марка автомобиля',
      variants: filterVariants.autoMark,
      key: 'autoMark',
    },
    {
      content: 'Модель двигателя',
      variants: filterVariants.engineModel,
      key: 'engineModel',
    },
    {
      content: 'Тип компрессора',
      variants: filterVariants.compressor,
      key: 'compressor',
    },
  ]

  return (
    <section className={css.catalog}>
      <div className="container">
        <h1 className={css.title}>Каталог продукции</h1>
        <div className={css.actions}>
          {!isLess1200 ? (
            <>
              <SearchPanel onSearch={(v) => setSearchTerm(v)} isSortExpanded={isSortExpanded} />
              {/* <DownloadIcon /> */}
            </>
          ) : (
            <>
              <SortIcon setSort={setSort} resetPage={() => {}} setIsSortExpanded={setIsSortExpanded} />
              <SearchPanel onSearch={(v) => setSearchTerm(v)} isSortExpanded={isSortExpanded} />
            </>
          )}
        </div>
        <div className={css.buttons}>
          <Filters filterData={dynamicFilterData} currentFilters={filters} onFilterChange={handleFilterChange} />
          {!isLess1200 && <SortIcon setSort={setSort} resetPage={() => {}} setIsSortExpanded={setIsSortExpanded} />}
        </div>
        {loading && visibleProducts.length === 0 ? (
          <p>Загрузка продуктов...</p>
        ) : (
          <Products products={visibleProducts} onLoadMore={loadMore} hasMore={hasMore} />
        )}
      </div>
    </section>
  )
}

export default CatalogPage
