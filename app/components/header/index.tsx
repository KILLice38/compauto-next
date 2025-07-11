import { useMediaQuery } from 'react-responsive'
import Burger from '../burger'
import Logo from '../logo/logo'
import SvgIcon from '../svgIcon'
import css from './index.module.scss'

const Header = ({
  setIsNavOpen,
  isNavOpen,
}: {
  setIsNavOpen: React.Dispatch<React.SetStateAction<boolean>>
  isNavOpen: boolean
}) => {
  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })

  const linkToSocial = (link: string) => {
    window.open(link, '_blank')
  }

  return (
    <header className={css.header}>
      <div className={`container ${css.header__container}`}>
        <Logo color={'#c0392b'} setIsNavOpen={setIsNavOpen} />
        {!isMobile && (
          <div className={css.header__wrapper}>
            <a href="tel:+7(910)481-64-16" className={css.header__tel}>
              +7 (910) 481-64-16
            </a>
            <div className={css.header__socials}>
              <SvgIcon
                icon="whatsapp"
                widthIcon="20px"
                heightIcon="21px"
                actionFunction={() => linkToSocial('https://api.whatsapp.com/send/?phone=79104816416')}
              />
              <SvgIcon
                icon="telegram"
                widthIcon="23px"
                heightIcon="19px"
                actionFunction={() => linkToSocial('https://t.me/KILLice38')}
              />
            </div>
            {/* <div className={css.searchPanel}>
              <SvgIcon icon="loop" widthIcon="24px" heightIcon="24px" />
            </div> */}
          </div>
        )}
        {isMobile && <Burger setIsNavOpen={setIsNavOpen} isNavOpen={isNavOpen} />}
      </div>
    </header>
  )
}

export default Header
