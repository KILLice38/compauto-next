import { useCallback, useState } from 'react'
import { useMediaQuery } from 'react-responsive'
import SortList from '../sortList'
import css from './index.module.scss'

type SortValue = 'recent' | 'az' | 'za' | 'priceAsc' | 'priceDesc' | null

type SortIconProps = {
  setSort: (value: SortValue) => void
  resetPage: () => void
}

const SortIcon = ({ setSort, resetPage }: SortIconProps) => {
  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })

  const [isHovered, setIsHovered] = useState(false)
  const [isSortActive, setIsSortActive] = useState(false)
  const [isSortOpen, setIsSortOpen] = useState(false)

  const isExpanded = isHovered || isSortOpen || isSortActive

  const handleToggle = useCallback(() => {
    setIsSortOpen((prev) => !prev)
  }, [isSortOpen])

  const handleSelect = useCallback(
    (value: SortValue) => {
      setSort(value)
      setIsSortActive(value !== 'recent')
      setIsSortOpen(false)
      if (value === 'recent') {
        setIsHovered(false)
      }
      resetPage()
    },
    [setSort, resetPage]
  )

  return (
    <button
      className={`${css.sortIcon__button} ${isExpanded ? css.expanded : ''} ${isSortActive ? css.active : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={css.sortIcon__round} onClick={handleToggle}>
        <div className={css.sortIcon__iconWrapper}>
          <svg className={css.sortIcon__icon} width={isMobile ? 21 : 28} height={isMobile ? 16 : 23}>
            <use xlinkHref={`/assets/icons/sprites.svg#sort`} />
          </svg>
        </div>
        <div className={css.sortIcon__labelWrapper}>
          <p className={css.sortIcon__text}>Сортировка</p>
          <svg className={css.sortIcon__arrow} width={isMobile ? 10 : 18} height={isMobile ? 6 : 10}>
            <use xlinkHref={`/assets/icons/sprites.svg#down-arrow`} />
          </svg>
        </div>
      </div>

      {isSortOpen && <SortList setIsSortActive={setIsSortActive} onSelect={handleSelect} />}
    </button>
  )
}

export default SortIcon
