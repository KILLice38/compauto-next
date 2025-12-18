'use client'

import css from './index.module.scss'
import { useForm, useFieldArray, type SubmitHandler, FieldError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import type { ProductType } from '../../types/types'
import { AdminProductFormSchema, type AdminProductForm } from '../../types/types'
import Image from 'next/image'
import { useToast } from '../../../contexts/ToastContext'
import ImageCropModal from '../imageCropModal'
import { readFile } from '../../../utils/cropImage'

interface Props {
  editingProduct: ProductType | null
  onSave: (product: ProductType) => void
  onCancel: () => void
}

interface FilterOptions {
  autoMark: Array<{ id: number; value: string }>
  engineModel: Array<{ id: number; value: string }>
  compressor: Array<{ id: number; value: string }>
}

export default function ProductForm({ editingProduct, onSave, onCancel }: Props) {
  const toast = useToast()

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

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    autoMark: [],
    engineModel: [],
    compressor: [],
  })
  const [loadingFilters, setLoadingFilters] = useState(true)

  // Загружаем опции фильтров
  useEffect(() => {
    async function loadFilters() {
      try {
        const res = await fetch('/api/filters')
        if (res.ok) {
          const data = await res.json()
          setFilterOptions(data)
        }
      } catch (error) {
        console.error('Failed to load filters:', error)
      } finally {
        setLoadingFilters(false)
      }
    }
    loadFilters()
  }, [])

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
      setMainImageUrl(editingProduct.img ?? '')
    } else {
      setGalleryUrls([])
      setMainImageUrl('')
    }
  }, [editingProduct, reset])

  const [galleryUrls, setGalleryUrls] = useState<string[]>([])
  const [mainImageUrl, setMainImageUrl] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  const [uploadFolder] = useState(() => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    return `tmp/${id}`
  })

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mainImageInputRef = useRef<HTMLInputElement | null>(null)
  const uploadInProgressRef = useRef(false)

  // Drag & Drop state
  const [isDraggingMain, setIsDraggingMain] = useState(false)
  const [isDraggingGallery, setIsDraggingGallery] = useState(false)

  // Crop modal state
  const [cropModalData, setCropModalData] = useState<{
    imageSrc: string
    originalFile: File
    type: 'main' | 'gallery'
  } | null>(null)

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

  // Обработчик выбора главного изображения
  const onPickMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      const imageSrc = await readFile(file)
      setCropModalData({ imageSrc, originalFile: file, type: 'main' })
    } catch (err) {
      toast.error('Ошибка при чтении файла: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Обработчик выбора изображения для галереи
  const onPickGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadInProgressRef.current) {
      console.warn('Upload already in progress, ignoring click')
      return
    }

    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (freeSlots <= 0) {
      toast.warning('Достигнут лимит: максимум 4 фото')
      return
    }

    try {
      const imageSrc = await readFile(file)
      setCropModalData({ imageSrc, originalFile: file, type: 'gallery' })
    } catch (err) {
      toast.error('Ошибка при чтении файла: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Drag & Drop handlers для главного изображения
  const handleMainDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingMain(true)
  }

  const handleMainDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingMain(false)
  }

  const handleMainDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingMain(false)

    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Пожалуйста, загрузите файл изображения')
      return
    }

    try {
      const imageSrc = await readFile(file)
      setCropModalData({ imageSrc, originalFile: file, type: 'main' })
    } catch (err) {
      toast.error('Ошибка при чтении файла: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Drag & Drop handlers для галереи
  const handleGalleryDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (freeSlots > 0 && !uploadInProgressRef.current) {
      setIsDraggingGallery(true)
    }
  }

  const handleGalleryDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingGallery(false)
  }

  const handleGalleryDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingGallery(false)

    if (uploadInProgressRef.current) {
      console.warn('Upload already in progress')
      return
    }

    if (freeSlots <= 0) {
      toast.warning('Достигнут лимит: максимум 4 фото')
      return
    }

    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Пожалуйста, загрузите файл изображения')
      return
    }

    try {
      const imageSrc = await readFile(file)
      setCropModalData({ imageSrc, originalFile: file, type: 'gallery' })
    } catch (err) {
      toast.error('Ошибка при чтении файла: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Обработчик завершения обрезки
  const handleCropComplete = async (croppedFile: File) => {
    if (!cropModalData) return

    try {
      uploadInProgressRef.current = true
      setIsUploading(true)

      // Переименовываем файл с .png на .webp расширение
      const webpFile = new File([croppedFile], croppedFile.name.replace(/\.(png|jpg|jpeg)$/i, '.webp'), {
        type: 'image/webp',
      })

      const url = await uploadOne(webpFile)

      if (cropModalData.type === 'main') {
        // Для главного изображения сохраняем URL
        setMainImageUrl(url)
        toast.success('Главное фото успешно обрезано и загружено')
      } else {
        // Для галереи добавляем URL
        setGalleryUrls((prev) => [...prev, url])
        toast.success('Фото успешно обрезано и добавлено в галерею')
      }
    } catch (err) {
      toast.error('Ошибка загрузки: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      uploadInProgressRef.current = false
      setIsUploading(false)
      setCropModalData(null)
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

      // Проверяем наличие главного изображения
      if (!isEdit && !mainImageUrl) {
        toast.error('Выберите и обрежьте главную фотографию')
        return
      }

      if (galleryUrls.length > 4) {
        toast.warning('Максимум 4 фото в галерее')
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
        img: mainImageUrl,
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
      toast.success(`Товар "${saved.title}" успешно ${isEdit ? 'обновлён' : 'создан'}`)
      onSave(saved)
      reset()
      setGalleryUrls([])
    } catch (err) {
      toast.error('Ошибка при сохранении: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleCancel = async () => {
    const allUrls = mainImageUrl ? [mainImageUrl, ...galleryUrls] : galleryUrls
    await cleanupTmp(allUrls)
    reset()
    setGalleryUrls([])
    setMainImageUrl('')
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
          {loadingFilters ? (
            <p className={css.loading}>Загрузка...</p>
          ) : (
            <select {...register('engineModel')} className={css.input}>
              <option value="">Выберите модель двигателя</option>
              {filterOptions.engineModel.map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {opt.value}
                </option>
              ))}
            </select>
          )}
          <small className={css.hint}>
            Не нашли нужную модель? Добавьте её через &quot;Редактировать фильтры&quot;
          </small>
        </label>

        <label className={css.label}>
          Марка авто
          {loadingFilters ? (
            <p className={css.loading}>Загрузка...</p>
          ) : (
            <select {...register('autoMark')} className={css.input}>
              <option value="">Выберите марку автомобиля</option>
              {filterOptions.autoMark.map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {opt.value}
                </option>
              ))}
            </select>
          )}
          <small className={css.hint}>
            Не нашли нужную марку? Добавьте её через &quot;Редактировать фильтры&quot;
          </small>
        </label>

        <label className={css.label}>
          Компрессор
          {loadingFilters ? (
            <p className={css.loading}>Загрузка...</p>
          ) : (
            <select {...register('compressor')} className={css.input}>
              <option value="">Выберите тип компрессора</option>
              {filterOptions.compressor.map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {opt.value}
                </option>
              ))}
            </select>
          )}
          <small className={css.hint}>
            Не нашли нужный тип? Добавьте его через &quot;Редактировать фильтры&quot;
          </small>
        </label>

        <div className={css.label}>
          <label>Главная фотография (обязательно при создании)</label>
          <div
            className={`${css.dropZone} ${isDraggingMain ? css.dragging : ''}`}
            onDragOver={handleMainDragOver}
            onDragLeave={handleMainDragLeave}
            onDrop={handleMainDrop}
          >
            <input
              ref={mainImageInputRef}
              type="file"
              accept="image/*"
              onChange={onPickMainImage}
              className={css.input}
            />
            {isDraggingMain && <div className={css.dropHint}>Отпустите для загрузки</div>}
          </div>
          {mainImageUrl && (
            <div className={css.imagePreview}>
              <Image
                src={makeThumb(mainImageUrl)}
                alt="Главное фото"
                width={106}
                height={69}
                className={css.thumb}
                unoptimized
              />
              <button
                type="button"
                onClick={() => {
                  setMainImageUrl('')
                  if (mainImageInputRef.current) mainImageInputRef.current.value = ''
                }}
                className={css.btnGhostSmall}
              >
                Удалить
              </button>
            </div>
          )}
          <p className={css.hint}>
            После выбора изображения откроется редактор для обрезки. Рекомендуется квадратное соотношение 1:1
          </p>
        </div>

        {/* Управляемая галерея */}
        <div className={css.label}>
          <div className={css.galleryHeader}>
            <strong>Галерея (до 4 шт.)</strong>
            <div className={css.spacer} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={freeSlots <= 0 || isUploading}
              title={
                isUploading
                  ? 'Загрузка...'
                  : freeSlots <= 0
                    ? 'Лимит исчерпан'
                    : 'Добавить фото'
              }
              className={css.btn}
            >
              {isUploading ? 'Загрузка...' : '+ Фото'}
            </button>
            <small className={css.muted}>
              {isUploading ? 'Загрузка...' : `Свободно: ${freeSlots}`}
            </small>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onPickGalleryFile}
            />
          </div>

          <div
            className={`${css.imagesGrid} ${isDraggingGallery ? css.dragging : ''}`}
            onDragOver={handleGalleryDragOver}
            onDragLeave={handleGalleryDragLeave}
            onDrop={handleGalleryDrop}
          >
            {isDraggingGallery && freeSlots > 0 && (
              <div className={css.dropOverlay}>
                <div className={css.dropHint}>Отпустите для загрузки в галерею</div>
              </div>
            )}
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

      {/* Модалка для обрезки изображений */}
      {cropModalData && (
        <ImageCropModal
          imageSrc={cropModalData.imageSrc}
          originalFile={cropModalData.originalFile}
          onComplete={handleCropComplete}
          onCancel={() => setCropModalData(null)}
        />
      )}
    </form>
  )
}
