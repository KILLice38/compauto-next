'use client'

import React from 'react'
import type { Product } from '@prisma/client'
import ProductComponent from '../../../components/product'
import css from './index.module.scss'

interface Props {
  products: Product[] | null
  onEdit: (product: Product) => void
  onDelete: (id: number) => void
}

export default function AdminList({ products, onEdit, onDelete }: Props) {
  if (!products) return <p>Загрузка...</p>
  if (products.length === 0) return <p>Продуктов пока нет.</p>

  return (
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
  )
}
