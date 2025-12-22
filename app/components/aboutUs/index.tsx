'use client'

import { useMediaQuery } from '../../hooks/useMediaQuery'
import SvgIcon from '../svgIcon'
import css from './index.module.scss'
import Image from 'next/image'

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
  const isLess992 = useMediaQuery('(max-width: 992px)')
  const isLess768 = useMediaQuery('(max-width: 768px)')

  return (
    <section id="aboutUs" className={css.aboutUs}>
      <div className="container">
        <div className={css.content}>
          <div className={css.text}>
            <h1 className={css.title}>{aboutUsData.title}</h1>
            <p className={css.description}>{aboutUsData.description}</p>
            {!isLess768 && (
              <>
                <p className={css.description}>{aboutUsData.preList}</p>
                <ul className={css.list}>
                  {aboutUsData.items.map((item, index) => {
                    return (
                      <li key={index} className={css.item}>
                        <SvgIcon
                          type="default"
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
          {!(isLess992 && !isLess768) && (
            <Image
              src="/assets/images/about-us/man.png"
              alt="about-us"
              className={css.image}
              width={460}
              height={565}
            />
          )}

          {isLess768 && (
            <div className={css.skills}>
              <h2 className={css.skillsTitle}>{aboutUsData.preList}</h2>
              <ul className={css.list}>
                {aboutUsData.items.map((item, index) => {
                  return (
                    <li key={index} className={css.item}>
                      <SvgIcon
                        type="default"
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
