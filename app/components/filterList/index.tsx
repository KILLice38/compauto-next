import type { ProductType } from '../../types/interfaces'
import css from './index.module.scss'

type FilterListProps = {
  keyName: keyof ProductType
  variants: string[]
  currentFilters: { [K in keyof ProductType]?: string | null }
  onFilterChange: <K extends keyof ProductType>(key: K, value: ProductType[K] | null) => void
  setOpenDropdown: React.Dispatch<React.SetStateAction<null | keyof ProductType>>
}

const FilterList = ({ keyName, variants, currentFilters, onFilterChange, setOpenDropdown }: FilterListProps) => {
  return (
    <ul className={css.filterList}>
      <li
        className={`${css.filterItem} ${currentFilters[keyName] == null ? css.active : ''}`}
        onClick={() => {
          onFilterChange(keyName, null)
          setOpenDropdown(null)
        }}
      >
        Все
      </li>
      {variants.map((variant) => (
        <li
          key={variant}
          className={`${css.filterItem} ${currentFilters[keyName] === variant ? css.active : ''}`}
          onClick={() => {
            console.info(keyName, variant)
            onFilterChange(keyName, variant)
            setOpenDropdown(null)
          }}
        >
          {variant}
        </li>
      ))}
    </ul>
  )
}

export default FilterList
