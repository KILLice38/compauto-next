'use client'

import Link from 'next/link'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { ProductType } from '../../types/interfaces'
import css from './index.module.scss'
import Image from 'next/image'
import imageLoader from '../../lib/imageLoader'
import { variantUrl } from '../../lib/imageVariants'

const Product = ({ type, product }: { type: string; product: ProductType }) => {
  const { img, title, description, price, slug } = product
  const isMobile = useMediaQuery('(max-width: 575px)')

  return (
    <Link href={`/catalog/${slug}`} className={`${css.product} ${isMobile ? css[type] : ''}`} aria-label={title}>
      <Image
        loader={imageLoader}
        src={variantUrl(img, 'card')}
        alt={title}
        className={css.image}
        width={260}
        height={260}
        unoptimized
      />
      <div className={css.text}>
        <h3 className={css.title}>{title}</h3>
        <p className={css.description}>{description}</p>
        <p className={css.price}>от {price.toLocaleString('ru-RU')} ₽</p>
      </div>
    </Link>
  )
}

export default Product
