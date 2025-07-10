'use client'

import { useMediaQuery } from 'react-responsive'
import type { ProductType } from '../../types/interfaces'
import css from './index.module.scss'
import Image from 'next/image'

const Product = ({ type, product }: { type: string; product: ProductType }) => {
  const { img, title, description, price } = product
  const isMobile = useMediaQuery({ query: '(max-width: 575px)' })

  return (
    <div className={`${css.product} ${isMobile ? css[type] : ''}`}>
      <Image src={img} alt="Продукт" className={css.product__image} width={260} height={260} />
      <div className={css.product__text}>
        <h6 className={css.product__title}>{title}</h6>
        <p className={css.product__description}>{description}</p>
        <p className={css.product__price}>от {price.toLocaleString('ru-RU')} ₽</p>
      </div>
    </div>
  )
}

export default Product
