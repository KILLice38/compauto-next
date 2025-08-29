'use client'

import { useMediaQuery } from 'react-responsive'
import Characteristics from '../characteristics'
import ProductGallery from '../productGallery'
import css from './index.module.scss'
import { Product } from '@prisma/client'

const ProductContent = ({
  images,
  product,
  detailParams,
  hasDetails,
  hasShort,
}: {
  images: string[]
  product: Product
  detailParams: string[]
  hasDetails: boolean
  hasShort: boolean
}) => {
  const isLess992 = useMediaQuery({ query: '(max-width: 992px)' })
  const isLess768 = useMediaQuery({ query: '(max-width: 768px)' })

  if (isLess768) {
    return (
      <div className={css.content}>
        <h1 className={css.title}>{product.title}</h1>
        <div className={css.mainInfo}>
          <ProductGallery images={images} minSlides={3} maxSlides={5} />
          <div className={css.description}>
            {hasDetails ? (
              detailParams.map((p: string, i: number) => <p key={i}>{p}</p>)
            ) : hasShort ? (
              <p>{product.description}</p>
            ) : (
              <p className={css.paragraph}>Описания ещё нет.</p>
            )}
          </div>
        </div>
        <Characteristics product={product} />
      </div>
    )
  } else if (isLess992) {
    return (
      <div className={css.content}>
        <h1 className={css.title}>{product.title}</h1>
        <div className={css.mainInfo}>
          <ProductGallery images={images} minSlides={3} maxSlides={5} />
          <div className={css.description}>
            {hasDetails ? (
              detailParams.map((p: string, i: number) => <p key={i}>{p}</p>)
            ) : hasShort ? (
              <p>{product.description}</p>
            ) : (
              <p className={css.paragraph}>Описания ещё нет.</p>
            )}
          </div>
        </div>
        <Characteristics product={product} />
      </div>
    )
  } else {
    return (
      <div className={css.content}>
        <div className={css.mainInfo}>
          <ProductGallery images={images} minSlides={3} maxSlides={5} />
          <div className={css.mainText}>
            <h1 className={css.title}>{product.title}</h1>
            <div className={css.description}>
              {hasDetails ? (
                detailParams.map((p: string, i: number) => <p key={i}>{p}</p>)
              ) : hasShort ? (
                <p>{product.description}</p>
              ) : (
                <p className={css.paragraph}>Описания ещё нет.</p>
              )}
            </div>
          </div>
        </div>
        <Characteristics product={product} />
      </div>
    )
  }
}

export default ProductContent
