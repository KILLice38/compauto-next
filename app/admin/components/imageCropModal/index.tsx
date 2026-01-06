'use client'

import { useState, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { getCroppedImg, blobToFile } from '../../../utils/cropImage'
import css from './index.module.scss'

interface ImageCropModalProps {
  imageSrc: string
  originalFile: File
  onComplete: (croppedFile: File) => void
  onCancel: () => void
}

type AspectRatio = { label: string; value: number | undefined }

const ASPECT_RATIOS: AspectRatio[] = [
  { label: 'Квадрат 1:1', value: 1 },
  { label: 'Альбом 3:2', value: 3 / 2 },
  { label: 'Портрет 2:3', value: 2 / 3 },
  { label: 'Широкий 16:9', value: 16 / 9 },
  { label: 'Свободно', value: undefined },
]

export default function ImageCropModal({
  imageSrc,
  originalFile,
  onComplete,
  onCancel,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [aspect, setAspect] = useState<number | undefined>(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  // Генерация preview при изменении области обрезки
  useEffect(() => {
    if (!croppedAreaPixels) return

    let cancelled = false
    const generatePreview = async () => {
      try {
        const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
        if (!cancelled) {
          const url = URL.createObjectURL(blob)
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
        }
      } catch (error) {
        console.error('Preview generation error:', error)
      }
    }

    generatePreview()

    return () => {
      cancelled = true
    }
  }, [croppedAreaPixels, imageSrc, rotation])

  // Cleanup preview URL при размонтировании
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleCrop = useCallback(async () => {
    if (!croppedAreaPixels) return

    try {
      setIsProcessing(true)
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
      const croppedFile = blobToFile(
        croppedBlob,
        originalFile.name.replace(/\.[^/.]+$/, '') + '-cropped.webp'
      )
      onComplete(croppedFile)
    } catch (error) {
      console.error('Ошибка при обрезке:', error)
      alert('Не удалось обрезать изображение')
    } finally {
      setIsProcessing(false)
    }
  }, [croppedAreaPixels, imageSrc, rotation, originalFile, onComplete])

  // Keyboard shortcuts (ESC для закрытия, Enter для применения)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onCancel()
      } else if (e.key === 'Enter' && !isProcessing) {
        handleCrop()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isProcessing, onCancel, handleCrop])

  return (
    <div className={css.overlay} onClick={onCancel}>
      <div className={css.modal} onClick={(e) => e.stopPropagation()}>
        <div className={css.header}>
          <h2>Обрезка изображения</h2>
        </div>

        <div className={css.cropContainer}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
          />
        </div>

        <div className={css.controls}>
          <div className={css.controlGroup}>
            <label>Пропорции:</label>
            <div className={css.aspectButtons}>
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.label}
                  type="button"
                  className={`${css.aspectButton} ${aspect === ratio.value ? css.active : ''}`}
                  onClick={() => setAspect(ratio.value)}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
            <p className={css.hint}>
              Рекомендуется: Квадрат 1:1 для карточек товаров
            </p>
          </div>

          <div className={css.controlGroup}>
            <label>Масштаб: {zoom.toFixed(1)}x</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </div>

          <div className={css.controlGroup}>
            <label>Поворот: {rotation}°</label>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
            />
          </div>

          {previewUrl && (
            <div className={css.controlGroup}>
              <label>Предпросмотр результата:</label>
              <div className={css.previewContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className={css.previewImage} />
              </div>
              <p className={css.hint}>Так будет выглядеть обрезанное изображение</p>
            </div>
          )}
        </div>

        <div className={css.actions}>
          <button
            type="button"
            className={`${css.button} ${css.secondary}`}
            onClick={onCancel}
            disabled={isProcessing}
          >
            Отмена
          </button>
          <button
            type="button"
            className={`${css.button} ${css.primary}`}
            onClick={handleCrop}
            disabled={isProcessing}
          >
            {isProcessing ? 'Обработка...' : 'Применить'}
          </button>
        </div>
      </div>
    </div>
  )
}
