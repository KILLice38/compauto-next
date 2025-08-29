import Link from 'next/link'
import css from './index.module.scss'

const Logo = ({
  color,
  setIsNavOpen,
}: {
  color: string | undefined
  setIsNavOpen?: React.Dispatch<React.SetStateAction<boolean>>
}) => {
  return (
    <Link href={'/'} onClick={() => setIsNavOpen?.(false)}>
      <div className={css.logo}>
        <svg className={css.icon} style={{ color }}>
          <use xlinkHref="/assets/icons/sprites.svg#logo" />
        </svg>
        <div className={css.text}>
          <p className={css.title}>КомпАвто</p>
          <p className={css.slogan}>Решаем быстро – делаем красиво</p>
        </div>
      </div>
    </Link>
  )
}

export default Logo
