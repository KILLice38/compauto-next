import css from './index.module.scss'

type SortType = {
  label: string
  value: 'recent' | 'az' | 'za' | 'priceAsc' | 'priceDesc'
}

const options: SortType[] = [
  { label: 'По умолчанию', value: 'recent' },
  { label: 'А-Я', value: 'az' },
  { label: 'Я-А', value: 'za' },
  { label: 'По возрастанию цены', value: 'priceAsc' },
  { label: 'По убыванию цены', value: 'priceDesc' },
]

const SortList = ({
  onSelect,
  setIsSortActive,
}: {
  onSelect: (value: SortType['value']) => void
  setIsSortActive: (value: boolean) => void
}) => {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <ul className={css.sortList} onMouseDown={stop} onClick={stop}>
      {options.map((option, index) => (
        <li
          key={index}
          className={css.item}
          onClick={() => {
            onSelect(option.value)
            if (option.value !== 'recent') {
              setIsSortActive(true)
            } else {
              setIsSortActive(false)
            }
          }}
        >
          {option.label}
        </li>
      ))}
    </ul>
  )
}

export default SortList
