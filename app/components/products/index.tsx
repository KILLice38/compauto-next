import type { ProductType } from '../../types/interfaces'
import Button from '../button'
import Product from '../product'
import css from './index.module.scss'

export const Products = ({
  products,
  onLoadMore,
  hasMore,
}: {
  products: ProductType[]
  onLoadMore: () => void
  hasMore: boolean
}) => {
  return (
    <section className={css.products}>
      <div className={css.wrapper}>
        {products.map((product) => (
          <Product key={product.slug} type="catalog" product={product} />
        ))}
      </div>
      {hasMore && products.length > 0 && (
        <Button type="more" onClickFunction={onLoadMore}>
          Загрузить еще
        </Button>
      )}
    </section>
  )
}

export default Products
