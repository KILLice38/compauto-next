'use client'

import { useMediaQuery } from 'react-responsive'
import DownloadIcon from '../../components/downloadIcon'
import Filters, { TestData } from '../../components/filters'
import SearchPanel from '../../components/searchPanel'
import SortIcon from '../../components/sortIcon'
import { useCatalog } from '../../utils/useCatalog'
import css from './page.module.scss'
import Products from '../../components/products'
import { getUniqueValues } from '../../utils/getUniqueValues'
import { ProductType } from '../../types/interfaces'

const CatalogPage = () => {
  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })

  const { visibleProducts, hasMore, loading, filters, setSearchTerm, setFilters, setSort, loadMore, allProducts } =
    useCatalog()

  const handleFilterChange = <K extends keyof ProductType>(key: K, value: ProductType[K] | null) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const autoMarkVariants = getUniqueValues(allProducts, 'autoMark')
  const engineModelVariants = getUniqueValues(allProducts, 'engineModel')
  const compressorVariants = getUniqueValues(allProducts, 'compressor')

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
              <SearchPanel onSearch={(v) => setSearchTerm(v)} />
              {/* <DownloadIcon /> */}
            </>
          ) : (
            <>
              <SortIcon setSort={setSort} resetPage={() => {}} />
              <SearchPanel onSearch={(v) => setSearchTerm(v)} />
            </>
          )}
        </div>
        <div className={css.catalog__buttons}>
          <Filters filterData={dynamicFilterData} currentFilters={filters} onFilterChange={handleFilterChange} />
          {!isMobile && <SortIcon setSort={setSort} resetPage={() => {}} />}
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
