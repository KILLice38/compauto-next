'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProductType } from '../types/types'

const ITEMS_PER_PAGE = 12

export function useAdminProducts() {
  const [products, setProducts] = useState<ProductType[] | null>(null)
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
        const data: ProductType[] = await res.json()
        if (!cancelled) {
          setProducts(data)
          setHasMore(data.length === ITEMS_PER_PAGE)
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
      if (!window.confirm('Удалить продукт?')) return
      const prev = products
      setProducts(prev?.filter((p) => p.id !== id) ?? null)

      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Произошла неизвестная ошибка')
        }
        setProducts(prev)
      }
    },
    [products]
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
      const newData: ProductType[] = await res.json()

      setProducts([...products, ...newData])
      setHasMore(newData.length === ITEMS_PER_PAGE)
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
    loading,
    loadingMore,
    error,
    showForm,
    editingProduct,
    hasMore,
    setProducts,
    setShowForm,
    setEditingProduct,
    handleDelete,
    toggleForm,
    loadMore,
  }
}
