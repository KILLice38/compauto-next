// components/product-gallery/index.tsx
'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import css from './index.module.scss'
import SvgIcon from '../svgIcon'
import { variantUrl } from '../../lib/imageVariants'

type Props = {
  images: string[]
  placeholder?: string
  minSlides?: number
  maxSlides?: number
}

export default function ProductGallery({
  images,
  placeholder = '/assets/images/no-image.png',
  minSlides = 3,
  maxSlides = 5,
}: Props) {
  const prepared = useMemo(() => {
    const base = images.filter(Boolean).map((u) => ({
      main: variantUrl(u, 'detail'),
      thumb: variantUrl(u, 'thumb'),
    }))
    const capped = base.slice(0, maxSlides)
    while (capped.length < Math.max(minSlides, 1)) {
      capped.push({ main: placeholder, thumb: placeholder })
    }
    return capped
  }, [images, placeholder, minSlides, maxSlides])

  const [idx, setIdx] = useState(0)
  const n = prepared.length

  const prevIndex = (idx - 1 + n) % n
  const nextIndex = (idx + 1) % n

  const goPrev = () => setIdx(prevIndex)
  const goNext = () => setIdx(nextIndex)

  // если всего один слайд — рисуем только main
  if (n === 1) {
    return (
      <div className={css.slider}>
        <Image src={prepared[0].main} alt="" width={460} height={299} className={css.mainImg} unoptimized />
      </div>
    )
  }

  return (
    <div className={css.slider}>
      <Image src={prepared[idx].main} alt="" width={460} height={299} className={css.mainImg} unoptimized />
      <div className={css.actions}>
        <button
          type="button"
          className={`${css.slide} ${css.slidePrev}`}
          onClick={goPrev}
          aria-label="Показать предыдущую"
        >
          <Image src={prepared[prevIndex].thumb} alt="" width={106} height={69} className={css.slideImg} unoptimized />
        </button>
        <div className={css.buttons}>
          <button type="button" className={`${css.button} ${css.buttonPrev}`} onClick={goPrev} aria-label="Назад">
            <SvgIcon icon="left-arrow" widthIcon="24px" heightIcon="21px" widthRound="60px" heightRound="60px" />
          </button>
          <button type="button" className={`${css.button} ${css.buttonNext}`} onClick={goNext} aria-label="Вперёд">
            <SvgIcon icon="right-arrow" widthIcon="24px" heightIcon="21px" widthRound="60px" heightRound="60px" />
          </button>
        </div>
        <button
          type="button"
          className={`${css.slide} ${css.slideNext}`}
          onClick={goNext}
          aria-label="Показать следующую"
        >
          <Image src={prepared[nextIndex].thumb} alt="" width={106} height={69} className={css.slideImg} unoptimized />
        </button>
      </div>
    </div>
  )
}
