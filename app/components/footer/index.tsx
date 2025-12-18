import { useMediaQuery } from 'react-responsive'
import Logo from '../logo'
import css from './index.module.scss'

const Footer = () => {
  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })

  return (
    <footer className={css.footer}>
      <div className={`container ${css.container}`}>
        {!isMobile && (
          <div className={css.left}>
            <Logo color="#FBFBFB" />
            <div className={css.info}>
              <a href="emailto:@example.com" className={css.mail}>
                9104816416@mail.ru
              </a>
              <a href="tel:+7(910)481-64-16" className={css.tel}>
                +7 (910) 481-64-16
              </a>
              <p className={css.workTime}>работаем с 9:00 до 19:00</p>
            </div>
          </div>
        )}
        {isMobile && <Logo color="#FBFBFB" />}
        {isMobile && (
          <div className={css.info}>
            <a href="emailto:@example.com" className={css.mail}>
              9104816416@mail.ru
            </a>
            <a href="tel:+7(910)481-64-16" className={css.tel}>
              +7 (910) 481-64-16
            </a>
            <p className={css.workTime}>работаем с 9:00 до 19:00</p>
          </div>
        )}
      </div>
    </footer>
  )
}

export default Footer
