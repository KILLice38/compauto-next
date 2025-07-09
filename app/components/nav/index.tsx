'use client'

import { useMediaQuery } from 'react-responsive'
import Button from '../button'
import SvgIcon from '../svgIcon'
import css from './index.module.scss'
import Link from 'next/link'

const Nav = ({ setIsNavOpen }: { setIsNavOpen: React.Dispatch<React.SetStateAction<boolean>> }) => {
  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })

  const handleClose = () => setIsNavOpen((prev) => !prev)

  return (
    <nav className={css.nav}>
      <div className={`container ${css.nav__container}`}>
        {isMobile ? (
          <>
            <div className={css.nav__links}>
              <Link href="/#novelty" className={css.nav__link} onClick={handleClose}>
                Новинки
              </Link>
              <Link href="/#aboutUs" className={css.nav__link} onClick={handleClose}>
                О нас
              </Link>
              <Link href="/catalog" className={css.nav__link} onClick={handleClose}>
                Каталог продукции
              </Link>
              <a href="#" download className={css.nav__link} onClick={handleClose}>
                Политика обработки персональных данных
              </a>
              <a href="#" download className={css.nav__link} onClick={handleClose}>
                Договор оферты
              </a>
            </div>
            <div className={css.nav__icons}>
              <button className={css.nav__button}>
                <SvgIcon icon="whatsapp" widthIcon="20px" heightIcon="21px" />
              </button>
              <button className={css.nav__button}>
                <SvgIcon icon="telegram" widthIcon="23px" heightIcon="19px" />
              </button>
              <button className={css.nav__button}>
                <SvgIcon icon="download" widthIcon="24px" heightIcon="24px" />
              </button>
            </div>
          </>
        ) : (
          <>
            <Link href={'/'}>
              <Button type="link">Главная</Button>
            </Link>
            <Link href={'/catalog'}>
              <Button type="link">Каталог продукции</Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default Nav
