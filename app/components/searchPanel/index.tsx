import { useState } from 'react'
import { useMediaQuery } from 'react-responsive'
import css from './index.module.scss'

const SearchPanel = ({ onSearch }: { onSearch: (searchTerm: string) => void }) => {
  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })
  const [value, setValue] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    onSearch(newValue)
  }

  return (
    <div className={css.searchPanel}>
      <input
        type="text"
        placeholder="Поиск по каталогу"
        className={css.searchPanel__input}
        value={value}
        onChange={handleChange}
      />
      <svg className={css.searchPanel__icon} width={isMobile ? 20 : 24} height={isMobile ? 20 : 24}>
        <use xlinkHref="/assets/icons/sprites.svg#loop" />
      </svg>
    </div>
  )
}

export default SearchPanel
