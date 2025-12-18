'use client'

import React from 'react'
import type { ProductType } from '../../types/types'
import ProductComponent from '../../../components/product'
import css from './index.module.scss'

interface Props {
  products: ProductType[] | null
  onEdit: (product: ProductType) => void
  onDelete: (id: number) => void
  onLoadMore?: () => void
  loadingMore?: boolean
  hasMore?: boolean
}

export default function AdminList({ products, onEdit, onDelete, onLoadMore, loadingMore, hasMore }: Props) {
  if (!products) return <p>Загрузка...</p>
  if (products.length === 0) return <p>Продуктов пока нет.</p>

  return (
    <div className={css.wrapper}>
      <div className={css['products-list']}>
        {products.map((product) => (
          <div key={product.id} className={css['product-wrapper']}>
            <div className={css['product-container']}>
              <ProductComponent type="admin" product={product} />
              <div className={css.buttons}>
                <button className={css['btn-edit']} onClick={() => onEdit(product)}>
                  Изменить
                </button>
                <button className={css['btn-delete']} onClick={() => onDelete(product.id)}>
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && onLoadMore && (
        <div className={css['load-more-container']}>
          <button className={css['btn-load-more']} onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
          </button>
        </div>
      )}
    </div>
  )
}
