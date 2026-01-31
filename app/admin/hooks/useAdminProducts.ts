'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProductType } from '../types/types'

const ITEMS_PER_PAGE = 12

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

interface UseAdminProductsOptions {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  toast: {
    success: (message: string) => void
    error: (message: string) => void
  }
}

export function useAdminProducts({ confirm, toast }: UseAdminProductsOptions) {
  const [products, setProducts] = useState<ProductType[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductType | null>(null)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchProducts = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/products?skip=0&take=${ITEMS_PER_PAGE}`)
        if (!res.ok) throw new Error(`Fetch error: ${res.status}`)
        const data: { products: ProductType[]; total: number } = await res.json()
        if (!cancelled) {
          setProducts(data.products)
          setTotal(data.total)
          setHasMore(data.products.length < data.total)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          if (err instanceof Error) {
            setError(err.message)
          } else {
            setError('Произошла неизвестная ошибка')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProducts()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (editingProduct) setShowForm(true)
  }, [editingProduct])

  const handleDelete = useCallback(
    async (id: number) => {
      const product = products?.find((p) => p.id === id)
      const productName = product?.title || `#${id}`

      const confirmed = await confirm({
        title: 'Удаление продукта',
        message: `Вы уверены, что хотите удалить "${productName}"? Это действие нельзя отменить.`,
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        variant: 'danger',
      })

      if (!confirmed) return

      const prev = products
      setProducts(prev?.filter((p) => p.id !== id) ?? null)

      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
        toast.success(`Продукт "${productName}" удалён`)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Произошла неизвестная ошибка'
        setError(errorMessage)
        toast.error(errorMessage)
        setProducts(prev)
      }
    },
    [products, confirm, toast]
  )

  const toggleForm = useCallback(() => {
    setEditingProduct(null)
    setShowForm((v) => !v)
  }, [])

  const loadMore = useCallback(async () => {
    if (!products || loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      const res = await fetch(`/api/products?skip=${products.length}&take=${ITEMS_PER_PAGE}`)
      if (!res.ok) throw new Error(`Fetch error: ${res.status}`)
      const data: { products: ProductType[]; total: number } = await res.json()

      const newProducts = [...products, ...data.products]
      setProducts(newProducts)
      setTotal(data.total)
      setHasMore(newProducts.length < data.total)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Произошла неизвестная ошибка')
      }
    } finally {
      setLoadingMore(false)
    }
  }, [products, loadingMore, hasMore])

  return {
    products,
    total,
    loading,
    loadingMore,
    error,
    showForm,
    editingProduct,
    hasMore,
    setProducts,
    setTotal,
    setShowForm,
    setEditingProduct,
    handleDelete,
    toggleForm,
    loadMore,
  }
}
