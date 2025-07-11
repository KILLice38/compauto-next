'use client'

import css from './index.module.scss'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Product } from '@prisma/client'
import { ProductSchema, ProductFormValues } from '../../types'

interface Props {
  editingProduct: Product | null
  onSave: (product: Product) => void
  onCancel: () => void
}

export default function ProductForm({ editingProduct, onSave, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      img: '',
      title: '',
      description: '',
      price: 0,
      engineModel: '',
      autoMark: '',
      compressor: '',
    },
  })

  useEffect(() => {
    if (editingProduct) {
      reset({
        ...editingProduct,
        price: Number(editingProduct.price),
      })
    }
  }, [editingProduct, reset])

  const onSubmit = async (data: ProductFormValues) => {
    try {
      if (!data.img || data.img.length === 0) {
        alert('Выберите изображение')
        return
      }

      const formData = new FormData()
      formData.append('file', data.img[0])

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) throw new Error('Ошибка загрузки изображения')

      const { url: imageUrl } = await uploadRes.json()

      const productPayload = {
        ...data,
        img: imageUrl,
      }

      const isEdit = Boolean(editingProduct)
      const url = isEdit ? `/api/products/${editingProduct!.id}` : '/api/products'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload),
      })

      if (!res.ok) throw new Error(`${method} failed: ${res.status}`)

      const saved: Product = await res.json()
      onSave(saved)
      reset()
    } catch (err) {
      alert('Ошибка при сохранении: ' + (err instanceof Error ? err.message : String(err)))
    }
  }
  const handleCancel = () => {
    reset()
    onCancel()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={css.form}>
      <label className={css.label}>
        Название
        <input {...register('title')} className={css.input} />
        {errors.title && <p style={{ color: 'red' }}>{errors.title.message}</p>}
      </label>

      <label className={css.label}>
        Описание
        <textarea {...register('description')} className={css.input} />
        {errors.description && <p style={{ color: 'red' }}>{errors.description.message}</p>}
      </label>

      <label className={css.label}>
        Цена
        <input type="number" {...register('price', { valueAsNumber: true })} className={css.input} />
        {errors.price && <p style={{ color: 'red' }}>{errors.price.message}</p>}
      </label>

      <label className={css.label}>
        Модель двигателя
        <input {...register('engineModel')} className={css.input} />
        {errors.engineModel && <p style={{ color: 'red' }}>{errors.engineModel.message}</p>}
      </label>

      <label className={css.label}>
        Марка авто
        <input {...register('autoMark')} className={css.input} />
        {errors.autoMark && <p style={{ color: 'red' }}>{errors.autoMark.message}</p>}
      </label>

      <label className={css.label}>
        Компрессор
        <input {...register('compressor')} className={css.input} />
        {errors.compressor && <p style={{ color: 'red' }}>{errors.compressor.message}</p>}
      </label>

      <label className={css.label}>
        Изображение
        <input type="file" accept="image/*" {...register('img')} className={css.input} />
        {errors.img && <p style={{ color: 'red' }}>{errors.img.message?.toString()}</p>}
      </label>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={isSubmitting}>
          {editingProduct ? 'Сохранить' : 'Добавить'}
        </button>
        <button type="button" onClick={handleCancel}>
          Отмена
        </button>
      </div>
    </form>
  )
}
