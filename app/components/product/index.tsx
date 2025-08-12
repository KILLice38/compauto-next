'use client'

import Link from 'next/link'
import { useMediaQuery } from 'react-responsive'
import type { ProductType } from '../../types/interfaces'
import css from './index.module.scss'
import Image from 'next/image'
import imageLoader from '../../lib/imageLoader'
import { variantUrl } from '../../lib/imageVariants'

const Product = ({ type, product }: { type: string; product: ProductType }) => {
  const { img, title, description, price, slug } = product
  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })

  return (
    <Link href={`/catalog/${slug}`} className={`${css.product} ${isMobile ? css[type] : ''}`} aria-label={title}>
      <Image
        loader={imageLoader}
        src={variantUrl(img, 'card')}
        alt={title}
        className={css.product__image}
        width={260}
        height={260}
        unoptimized
      />
      <div className={css.product__text}>
        <h6 className={css.product__title}>{title}</h6>
        <p className={css.product__description}>{description}</p>
        <p className={css.product__price}>от {price.toLocaleString('ru-RU')} ₽</p>
      </div>
    </Link>
  )
}

export default Product
