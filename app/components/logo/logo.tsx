import Link from 'next/link'
import css from './logo.module.scss'

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
        <svg className={css.logo__icon} style={{ color }}>
          <use xlinkHref="/assets/icons/sprites.svg#logo" />
        </svg>
        <div className={css.logo__text}>
          <p className={css.logo__title}>КомпАвто</p>
          <p className={css.logo__slogan}>Решаем быстро – делаем красиво</p>
        </div>
      </div>
    </Link>
  )
}

export default Logo
