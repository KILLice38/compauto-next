import css from './index.module.scss'

const Burger = ({
  setIsNavOpen,
  isNavOpen,
}: {
  setIsNavOpen: React.Dispatch<React.SetStateAction<boolean>>
  isNavOpen: boolean
}) => {
  return (
    <div className={`${css.burger} ${isNavOpen ? css.active : ''}`} onClick={() => setIsNavOpen((prev) => !prev)}>
      <span></span>
      <span></span>
    </div>
  )
}

export default Burger
