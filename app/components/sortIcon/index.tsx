import { useCallback, useEffect, useRef, useState } from 'react'
import SortList from '../sortList'
import s from './index.module.scss'

type SortValue = 'recent' | 'az' | 'za' | 'priceAsc' | 'priceDesc' | null

type Props = {
  setSort: (value: SortValue) => void
  resetPage: () => void
  setIsSortExpanded: (value: boolean) => void
}

const Sort = ({ setSort, resetPage, setIsSortExpanded }: Props) => {
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)
  const [open, setOpen] = useState(false)

  const btnRef = useRef<HTMLButtonElement>(null)

  const expanded = hovered || open || active

  const toggle = useCallback(() => setOpen((v) => !v), [])

  const onSelect = useCallback(
    (value: SortValue) => {
      setSort(value)
      setActive(value !== 'recent')
      setOpen(false)
      resetPage()
    },
    [setSort, resetPage]
  )

  useEffect(() => {
    setIsSortExpanded(expanded)
  }, [expanded, setIsSortExpanded])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
        setHovered(false)
      }
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  const onPointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') setHovered(true)
  }
  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') setHovered(false)
  }

  return (
    <button
      ref={btnRef}
      type="button"
      className={[s.button, expanded ? s.expanded : '', active ? s.active : ''].join(' ')}
      aria-expanded={open}
      aria-haspopup="listbox"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={toggle}
    >
      <div className={s.round}>
        <div className={s.iconWrap} aria-hidden="true">
          <svg className={s.icon}>
            <use href="/assets/icons/sprites.svg#sort" />
          </svg>
        </div>
        <div className={s.label} aria-hidden="true">
          <p className={s.text}>Сортировка</p>
          <svg className={s.arrow}>
            <use href="/assets/icons/sprites.svg#down-arrow" />
          </svg>
        </div>
      </div>

      {open && <SortList setIsSortActive={setActive} onSelect={onSelect} />}
    </button>
  )
}

export default Sort
