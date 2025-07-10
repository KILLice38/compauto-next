'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMediaQuery } from 'react-responsive'
import Button from '../button'
import Product from '../product'
import SvgIcon from '../svgIcon'
import css from './index.module.scss'
import Link from 'next/link'
import { ProductType } from '../../types/interfaces'

const MAX_SLIDER_ITEMS = 12

const Novelty = () => {
  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })

  const [productsDataNovelty, setProductsDataNovelty] = useState<ProductType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data: ProductType[]) => {
        setProductsDataNovelty(data.slice(0, MAX_SLIDER_ITEMS))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const itemsPerPage = isMobile ? 1 : 4

  const sliderItems = useMemo(() => {
    const len = productsDataNovelty.length
    const sliceStart = Math.max(len - MAX_SLIDER_ITEMS, 0)
    const lastItems = productsDataNovelty.slice(sliceStart, len)
    return lastItems.reverse()
  }, [productsDataNovelty])

  const totalPages = Math.ceil(sliderItems.length / itemsPerPage)

  const [currentPage, setCurrentPage] = useState(0)

  const handlePrev = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages)
  }
  const handleNext = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages)
  }

  const startIndex = currentPage * itemsPerPage
  const visibleItems = sliderItems.slice(startIndex, startIndex + itemsPerPage)

  // Если нет новинок / нет продуктов
  if (loading) return <p>Загрузка новинок...</p>
  if (!productsDataNovelty.length) return <p>Новинок пока нет.</p>

  return (
    <section id="novelty" className={css.novelty}>
      <div className="container">
        <h2 className={css.novelty__title}>Новинки</h2>
        <div className={css.novelty__slider}>
          {visibleItems.map((product, index) => (
            <Product key={index} type="novelty" product={product} />
          ))}
        </div>
        <div className={css.novelty__arrows}>
          <button className={css.novelty__button} onClick={handlePrev}>
            <SvgIcon icon="left-arrow" widthIcon="24px" heightIcon="21px" widthRound="60px" heightRound="60px" />
          </button>
          <button className={css.novelty__button} onClick={handleNext}>
            <SvgIcon icon="right-arrow" widthIcon="24px" heightIcon="21px" widthRound="60px" heightRound="60px" />
          </button>
        </div>
        {isMobile && (
          <Link href="/catalog">
            <Button type="link">Перейти в каталог продукции</Button>
          </Link>
        )}
      </div>
    </section>
  )
}

export default Novelty
