'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMediaQuery } from 'react-responsive'
import Button from '../button'
import Product from '../product'
import SvgIcon from '../svgIcon'
import css from './index.module.scss'
import Link from 'next/link'
import { ProductType } from '../../types/interfaces'

const MAX_SLIDER_ITEMS = 8

const Novelty = () => {
  const isLess992 = useMediaQuery({ query: '(max-width: 992px)' })
  const isLess768 = useMediaQuery({ query: '(max-width: 768px)' })
  const isLess575 = useMediaQuery({ query: '(max-width: 575px)' })

  const [products, setProducts] = useState<ProductType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/products', { signal: ctrl.signal })
        if (!res.ok) throw new Error('Network error')
        const data: ProductType[] = await res.json()
        setProducts(data)
      } catch {
      } finally {
        setLoading(false)
      }
    })()
    return () => ctrl.abort()
  }, [])

  const itemsPerPage = isLess575 ? 1 : isLess768 ? 2 : isLess992 ? 3 : 4

  const sliderItems = useMemo(() => {
    const last = products.slice(-MAX_SLIDER_ITEMS)
    return [...last].reverse()
  }, [products])

  const totalPages = Math.max(Math.ceil(sliderItems.length / itemsPerPage), 1)
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    setCurrentPage((prev) => {
      const maxPage = Math.max(totalPages - 1, 0)
      return Math.min(prev, maxPage)
    })
  }, [itemsPerPage, sliderItems.length, totalPages])

  const goPrev = () => setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages)
  const goNext = () => setCurrentPage((prev) => (prev + 1) % totalPages)

  const startIndex = currentPage * itemsPerPage
  const visibleItems = sliderItems.slice(startIndex, startIndex + itemsPerPage)

  if (loading) return null

  if (!sliderItems.length) return null

  const navDisabled = totalPages <= 1

  return (
    <section id="novelty" className={css.novelty}>
      <div className="container">
        <h2 className={css.title}>Новинки</h2>

        <div className={css.slider}>
          {visibleItems.map((product) => (
            <Product key={product.slug} type="novelty" product={product} />
          ))}
        </div>

        <div className={css.arrows}>
          <button className={css.button} onClick={goPrev} aria-label="Предыдущие новинки" disabled={navDisabled}>
            <SvgIcon icon="left-arrow" widthIcon="24px" heightIcon="21px" type="arrow" />
          </button>
          <button className={css.button} onClick={goNext} aria-label="Следующие новинки" disabled={navDisabled}>
            <SvgIcon icon="right-arrow" widthIcon="24px" heightIcon="21px" type="arrow" />
          </button>
        </div>

        {isLess768 && (
          <Link href="/catalog">
            <Button type="link">Перейти в каталог продукции</Button>
          </Link>
        )}
      </div>
    </section>
  )
}

export default Novelty
