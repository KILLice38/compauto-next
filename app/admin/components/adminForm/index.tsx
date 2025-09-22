'use client'

import css from './index.module.scss'
import { useForm, useFieldArray, type SubmitHandler, FieldError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import type { ProductType } from '../../types/types'
import { AdminProductFormSchema, type AdminProductForm } from '../../types/types'
import Image from 'next/image'

interface Props {
  editingProduct: ProductType | null
  onSave: (product: ProductType) => void
  onCancel: () => void
}

export default function ProductForm({ editingProduct, onSave, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AdminProductForm>({
    resolver: zodResolver(AdminProductFormSchema),
    defaultValues: {
      title: '',
      description: '',
      details: [],
      price: 0,
      engineModel: '',
      autoMark: '',
      compressor: '',
      img: undefined,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'details' })

  useEffect(() => {
    if (editingProduct) {
      reset({
        title: editingProduct.title,
        description: editingProduct.description,
        details: editingProduct.details ?? [],
        price: Number(editingProduct.price),
        engineModel: editingProduct.engineModel ?? '',
        autoMark: editingProduct.autoMark ?? '',
        compressor: editingProduct.compressor ?? '',
      })
      setGalleryUrls(editingProduct.gallery ?? [])
    } else {
      setGalleryUrls([])
    }
  }, [editingProduct, reset])

  const [galleryUrls, setGalleryUrls] = useState<string[]>([])

  const [uploadFolder] = useState(() => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    return `tmp/${id}`
  })

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const uploadOne = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', uploadFolder)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('Ошибка загрузки файла')
    const { url } = await res.json()
    return url as string
  }

  const isTmpUrl = (u: string) => u.includes('/uploads/tmp/')
  const cleanupTmp = async (urls: string | string[]) => {
    const arr = Array.isArray(urls) ? urls : [urls]
    const tmp = arr.filter((u) => isTmpUrl(u))
    if (tmp.length === 0) return
    try {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: tmp }),
      })
    } catch {}
  }

  const freeSlots = Math.max(0, 4 - galleryUrls.length)

  const onPickGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const f = e.target.files?.[0]
      e.target.value = ''
      if (!f) return
      if (freeSlots <= 0) {
        alert('Достигнут лимит: максимум 4 фото')
        return
      }
      const url = await uploadOne(f)
      setGalleryUrls((prev) => [...prev, url])
    } catch (err) {
      alert('Ошибка загрузки: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const removeGalleryItem = async (idx: number) => {
    const u = galleryUrls[idx]
    await cleanupTmp(u)
    setGalleryUrls((prev) => prev.filter((_, i) => i !== idx))
  }

  const makeThumb = (u: string) => u.replace('__source.webp', '__thumb.webp')

  const onSubmit: SubmitHandler<AdminProductForm> = async (data) => {
    try {
      const isEdit = Boolean(editingProduct)

      let mainImgUrl = editingProduct?.img ?? ''
      const mainFile = (data.img as FileList | undefined)?.[0]
      if (!isEdit && !mainFile) {
        alert('Выберите главную фотографию')
        return
      }
      if (mainFile) mainImgUrl = await uploadOne(mainFile) // в tmp/<uuid>

      if (galleryUrls.length > 4) {
        alert('Максимум 4 фото в галерее')
        return
      }

      const payload = {
        title: data.title,
        description: data.description,
        details: (data.details ?? []).map((s) => s.trim()).filter(Boolean),
        price: Number(data.price),
        engineModel: data.engineModel || null,
        autoMark: data.autoMark || null,
        compressor: data.compressor || null,
        img: mainImgUrl,
        gallery: galleryUrls,
      }

      const url = isEdit ? `/api/products/${editingProduct!.id}` : '/api/products'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`${method} failed: ${res.status}`)

      const saved: ProductType = await res.json()
      onSave(saved)
      reset()
      setGalleryUrls([])
    } catch (err) {
      alert('Ошибка при сохранении: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleCancel = async () => {
    await cleanupTmp(galleryUrls)
    reset()
    setGalleryUrls([])
    onCancel()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={css.form}>
      <div className={css.formScroll}>
        <label className={css.label}>
          Название
          <input {...register('title')} className={css.input} />
          {errors.title && <p className={css.error}>{String(errors.title.message)}</p>}
        </label>

        <label className={css.label}>
          Короткое описание
          <textarea {...register('description')} className={css.input} />
          {errors.description && <p className={css.error}>{String(errors.description.message)}</p>}
        </label>

        <div className={css.label}>
          <span>Подробное описание (абзацы)</span>
          {fields.map((f, idx) => (
            <div key={f.id} className={css.row}>
              <textarea {...register(`details.${idx}` as const)} className={css.input} />
              <button type="button" onClick={() => remove(idx)} className={css.btnGhost}>
                Удалить
              </button>
            </div>
          ))}
          <button type="button" onClick={() => append('')} className={css.btnGhost}>
            + Абзац
          </button>
          {/* {errors.details && <p className={css.error}>{String((errors.details as any)?.message ?? '')}</p>} */}
          {(() => {
            const d = errors.details
            const msg = d && typeof d === 'object' && 'message' in d ? String((d as FieldError).message ?? '') : ''
            return msg ? <p className={css.error}>{msg}</p> : null
          })()}
        </div>

        <label className={css.label}>
          Цена
          <input type="number" {...register('price', { valueAsNumber: true })} className={css.input} />
          {errors.price && <p className={css.error}>{String(errors.price.message)}</p>}
        </label>

        <label className={css.label}>
          Модель двигателя
          <input {...register('engineModel')} className={css.input} />
        </label>

        <label className={css.label}>
          Марка авто
          <input {...register('autoMark')} className={css.input} />
        </label>

        <label className={css.label}>
          Компрессор
          <input {...register('compressor')} className={css.input} />
        </label>

        <label className={css.label}>
          Главная фотография (обязательно при создании)
          <input type="file" accept="image/*" {...register('img')} className={css.input} />
        </label>

        {/* Управляемая галерея */}
        <div className={css.label}>
          <div className={css.galleryHeader}>
            <strong>Галерея (до 4 шт.)</strong>
            <div className={css.spacer} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={freeSlots <= 0}
              title={freeSlots <= 0 ? 'Лимит исчерпан' : 'Добавить фото'}
              className={css.btn}
            >
              + Фото
            </button>
            <small className={css.muted}>Свободно: {freeSlots}</small>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onPickGalleryFile}
            />
          </div>

          <div className={css.imagesGrid}>
            {galleryUrls.map((u, i) => (
              <div key={i} className={css.imageItem}>
                <Image src={makeThumb(u)} alt="" width={106} height={69} className={css.thumb} unoptimized />
                <button type="button" onClick={() => removeGalleryItem(i)} className={css.btnGhostSmall}>
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* панель действий — ВСЕГДА видна */}
      <div className={css.formActions}>
        <button type="button" onClick={handleCancel} className={css.btnGhost}>
          Отмена
        </button>
        <button type="submit" disabled={isSubmitting} className={css.btn}>
          {editingProduct ? 'Сохранить' : 'Добавить'}
        </button>
      </div>
    </form>
  )
}
