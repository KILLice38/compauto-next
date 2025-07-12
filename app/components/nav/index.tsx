'use client'

import { useMediaQuery } from 'react-responsive'
import Button from '../button'
import SvgIcon from '../svgIcon'
import css from './index.module.scss'
import Link from 'next/link'
import { linkToSocial } from '../header'

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
              <Link href="/catalog" className={css.nav__link} onClick={handleClose}>
                Каталог продукции
              </Link>
            </div>
            <div className={css.nav__icons}>
              <button className={css.nav__button}>
                <SvgIcon
                  icon="whatsapp"
                  widthIcon="20px"
                  heightIcon="21px"
                  actionFunction={() => linkToSocial('https://api.whatsapp.com/send/?phone=79104816416')}
                />
              </button>
              <button className={css.nav__button}>
                <SvgIcon
                  icon="telegram"
                  widthIcon="23px"
                  heightIcon="19px"
                  actionFunction={() => linkToSocial('https://t.me/KILLice38')}
                />
              </button>
              {/* <button className={css.nav__button}>
                <SvgIcon icon="download" widthIcon="24px" heightIcon="24px" />
              </button> */}
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
