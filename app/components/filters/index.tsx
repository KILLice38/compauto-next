'use client'

import { useState, useEffect, useRef } from 'react'
import { useMediaQuery } from 'react-responsive'
import type { ProductType } from '../../types/interfaces'
import Button from '../button'
import FilterList from '../filterList'
import css from './index.module.scss'

export type TestData = {
  content: string
  variants: string[]
  key: keyof ProductType
}

type FilterProps = {
  filterData: TestData[]
  currentFilters: { [K in keyof ProductType]?: string | null }
  onFilterChange: <K extends keyof ProductType>(key: K, value: ProductType[K] | null) => void
}

const Filters = ({ filterData, currentFilters, onFilterChange }: FilterProps) => {
  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })
  const [openDropdown, setOpenDropdown] = useState<null | keyof ProductType>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current) return
      if (openDropdown !== null && !rootRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [openDropdown])

  return (
    <div ref={rootRef} className={css.filters}>
      {filterData.map((item) => {
        const isMenuOpen = openDropdown === item.key
        const isSelected = currentFilters[item.key] != null
        const isActive = isMenuOpen || isSelected

        return (
          <div key={item.key} className={css.filter}>
            <Button
              type="filter"
              isFilterActive={isActive}
              onClickFunction={() => {
                setOpenDropdown((prev) => (prev === item.key ? null : item.key))
              }}
            >
              {item.content}
              {(!isMobile || (isMobile && isMenuOpen)) && (
                <svg className={css.arrow} width={isMobile ? 10 : 18} height={isMobile ? 6 : 10}>
                  <use xlinkHref="/assets/icons/sprites.svg#down-arrow" />
                </svg>
              )}
            </Button>

            {openDropdown === item.key && (
              <FilterList
                keyName={item.key}
                variants={item.variants}
                currentFilters={currentFilters}
                onFilterChange={onFilterChange}
                setOpenDropdown={setOpenDropdown}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default Filters
