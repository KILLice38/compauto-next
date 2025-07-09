import { useMediaQuery } from 'react-responsive'
import SvgIcon from '../svgIcon'
import css from './index.module.scss'

const aboutUsData = {
  title: 'О нас без воды',
  description:
    'Уже больше 10 лет мы производим кронштейны компрессора для коммерческого транспорта, рефрижераторов, кондиционеров и холодильного оборудования. Это не просто железки — это точные, надёжные детали, которые не  подведут в работе.',
  preList: 'Что умеем:',
  items: [
    {
      icon: 'storage',
      widthIcon: '20px',
      heightIcon: '16px',
      text: 'Склад всегда в бою — постоянный ассортимент под рукой;',
    },
    { icon: 'volume', widthIcon: '19px', heightIcon: '18px', text: 'Любой объём — хоть партия, хоть единичка;' },
    { icon: 'drawing', widthIcon: '20px', heightIcon: '20px', text: 'Чертёж есть? Сделаем. Работаем по вашим ТЗ;' },
    {
      icon: 'result',
      widthIcon: '19px',
      heightIcon: '20px',
      text: 'Свой цех, своё ОТК, свой результат. Идеально с первой попытки;',
    },
    {
      icon: 'update',
      widthIcon: '20px',
      heightIcon: '20px',
      text: 'Обновляем ассортимент, пока конкуренты листы режут.',
    },
  ],
}

const AboutUs = () => {
  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })

  return (
    <section id="aboutUs" className={css.aboutUs}>
      <div className="container">
        <div className={css.aboutUs__content}>
          <div className={css.aboutUs__text}>
            <h1 className={css.aboutUs__title}>{aboutUsData.title}</h1>
            <p className={css.aboutUs__description}>{aboutUsData.description}</p>
            {!isMobile && (
              <>
                <p className={css.aboutUs__description}>{aboutUsData.preList}</p>
                <ul className={css.aboutUs__list}>
                  {aboutUsData.items.map((item, index) => {
                    return (
                      <li key={index} className={css.aboutUs__item}>
                        <SvgIcon
                          type="nonactive"
                          icon={item.icon}
                          widthIcon={item.widthIcon}
                          heightIcon={item.heightIcon}
                        />
                        {item.text}
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>
          <img src="/assets/images/about-us.jpg" alt="about-us" className={css.aboutUs__image} />
          {isMobile && (
            <div className={css.aboutUs__skills}>
              <h2 className={css.aboutUs__skillsTitle}>{aboutUsData.preList}</h2>
              <ul className={css.aboutUs__list}>
                {aboutUsData.items.map((item, index) => {
                  return (
                    <li key={index} className={css.aboutUs__item}>
                      <SvgIcon
                        type="nonactive"
                        icon={item.icon}
                        widthIcon={item.widthIcon}
                        heightIcon={item.heightIcon}
                      />
                      {item.text}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default AboutUs
