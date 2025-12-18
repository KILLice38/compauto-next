'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import Button from '../components/button'
import ProductForm from './components/adminForm'
import AdminList from './components/adminList'
import FilterManager from './components/filterManager'
import { useAdminProducts } from './hooks/useAdminProducts'
import css from './page.module.scss'
import type { ProductType } from './types/types'

export default function AdminPageClient() {
  const {
    products,
    showForm,
    editingProduct,
    loadingMore,
    hasMore,
    setProducts,
    setShowForm,
    setEditingProduct,
    handleDelete,
    toggleForm,
    loadMore,
  } = useAdminProducts()

  const [showFilterManager, setShowFilterManager] = useState(false)

  const handleSave = (savedProduct: ProductType) => {
    setProducts((cur) => {
      const exists = cur?.some((p) => p.id === savedProduct.id)
      if (exists) {
        return cur?.map((p) => (p.id === savedProduct.id ? savedProduct : p)) ?? null
      }
      return cur ? [savedProduct, ...cur] : [savedProduct]
    })
    setEditingProduct(null)
    setShowForm(false)
  }

  const handleCancel = () => {
    setEditingProduct(null)
    setShowForm(false)
  }

  return (
    <div className={css.admin}>
      <div className="container">
        <h2 className={css.title}>Управление товарами</h2>

        <div className={css['manage-buttons']}>
          <Button onClickFunction={toggleForm} type="modal">
            {showForm ? 'Отменить' : 'Добавить продукт'}
          </Button>
          <Button onClickFunction={() => setShowFilterManager(true)} type="filter">
            Редактировать фильтры
          </Button>
          <Button onClickFunction={() => signOut({ callbackUrl: '/admin/login' })} type="out">
            Выйти
          </Button>
        </div>

        {showForm && (
          <div className={css.overlay} onClick={handleCancel}>
            <div className={css.modal} onClick={(e) => e.stopPropagation()}>
              <button className={css['close-button']} onClick={handleCancel}>
                ✕
              </button>
              <ProductForm editingProduct={editingProduct} onSave={handleSave} onCancel={handleCancel} />
            </div>
          </div>
        )}

        <AdminList
          products={products}
          onEdit={setEditingProduct}
          onDelete={handleDelete}
          onLoadMore={loadMore}
          loadingMore={loadingMore}
          hasMore={hasMore}
        />

        {showFilterManager && <FilterManager onClose={() => setShowFilterManager(false)} />}
      </div>
    </div>
  )
}
