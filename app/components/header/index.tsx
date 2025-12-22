'use client'

import { useMediaQuery } from '../../hooks/useMediaQuery'
import Burger from '../burger'
import Logo from '../logo'
import SvgIcon from '../svgIcon'
import css from './index.module.scss'

const telegramIconSizes = {
  widths: {
    default: '23px',
    tablet: '21px',
    mobile: '23px',
  },
  heights: {
    default: '19px',
    tablet: '17px',
    mobile: '19px',
  },
}

const whatsappIconSizes = {
  widths: {
    default: '20px',
    tablet: '18px',
    mobile: '20px',
  },
  heights: {
    default: '20px',
    tablet: '18px',
    mobile: '20px',
  },
}

export const linkToSocial = (link: string) => {
  window.open(link, '_blank')
}
const Header = ({
  setIsNavOpen,
  isNavOpen,
}: {
  setIsNavOpen: React.Dispatch<React.SetStateAction<boolean>>
  isNavOpen: boolean
}) => {
  const isTablet = useMediaQuery('(max-width: 992px)')
  const isMobile = useMediaQuery('(max-width: 768px)')

  const activeWhatsappIconSizes = {
    width: isMobile
      ? whatsappIconSizes.widths.mobile
      : isTablet
        ? whatsappIconSizes.widths.tablet
        : whatsappIconSizes.widths.default,
    height: isMobile
      ? whatsappIconSizes.heights.mobile
      : isTablet
        ? whatsappIconSizes.heights.tablet
        : whatsappIconSizes.heights.default,
  }

  const activeTelegramIconSizes = {
    width: isMobile
      ? telegramIconSizes.widths.mobile
      : isTablet
        ? telegramIconSizes.widths.tablet
        : telegramIconSizes.widths.default,
    height: isMobile
      ? telegramIconSizes.heights.mobile
      : isTablet
        ? telegramIconSizes.heights.tablet
        : telegramIconSizes.heights.default,
  }

  return (
    <header className={css.header}>
      <div className={`container ${css.container}`}>
        <Logo color={'#c0392b'} setIsNavOpen={setIsNavOpen} />
        {!isMobile && (
          <div className={css.wrapper}>
            <a href="tel:+7(910)481-64-16" className={css.tel}>
              +7 (910) 481-64-16
            </a>
            <div className={css.socials}>
              <SvgIcon
                icon="whatsapp"
                widthIcon={activeWhatsappIconSizes.width}
                heightIcon={activeWhatsappIconSizes.height}
                type="social"
                actionFunction={() => linkToSocial('https://api.whatsapp.com/send/?phone=79104816416')}
              />
              <SvgIcon
                icon="telegram"
                widthIcon={activeTelegramIconSizes.width}
                heightIcon={activeTelegramIconSizes.height}
                type="social"
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
