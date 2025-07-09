import css from './index.module.scss'

const Button = ({
  type = 'link',
  isFilterActive,
  onClickFunction,
  children,
}: {
  type: string
  isFilterActive?: boolean
  onClickFunction?: () => void
  children: React.ReactNode
}) => {
  return (
    <button className={`${css.button} ${css[type]} ${isFilterActive ? css.active : ''}`} onClick={onClickFunction}>
      {children}
    </button>
  )
}

export default Button
