import { useMediaQuery } from 'react-responsive'
import Logo from '../logo/logo'
import css from './index.module.scss'

const Footer = () => {
  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })

  return (
    <footer className={css.footer}>
      <div className={`container ${css.footer__container}`}>
        {!isMobile && (
          <div className={css.footer__left}>
            <Logo color="#FBFBFB" />
            <div className={css.footer__info}>
              <a href="tel:+7(910)481-64-16" className={css.footer__tel}>
                +7 (910) 481-64-16
              </a>
              <p className={css.footer__workTime}>работаем с 9:00 до 19:00</p>
            </div>
          </div>
        )}
        {isMobile && <Logo color="#FBFBFB" />}
        {isMobile && (
          <div className={css.footer__info}>
            <a href="tel:+7(910)481-64-16" className={css.footer__tel}>
              +7 (910) 481-64-16
            </a>
            <p className={css.footer__workTime}>работаем с 9:00 до 19:00</p>
          </div>
        )}
      </div>
    </footer>
  )
}

export default Footer
