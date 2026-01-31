'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { getCroppedImg, blobToFile } from '../../../utils/cropImage'
import css from './index.module.scss'

interface ImageCropModalProps {
  imageSrc: string
  originalFile: File
  onComplete: (croppedFile: File) => void
  onCancel: () => void
  onError?: (message: string) => void
}

type AspectRatio = { label: string; value: number | undefined }

const ASPECT_RATIOS: AspectRatio[] = [
  { label: 'Альбом 3:2 (рекомендуется)', value: 3 / 2 },
  { label: 'Квадрат 1:1', value: 1 },
  { label: 'Широкий 16:9', value: 16 / 9 },
  { label: 'Портрет 2:3', value: 2 / 3 },
  { label: 'Свободно', value: undefined },
]

export default function ImageCropModal({
  imageSrc,
  originalFile,
  onComplete,
  onCancel,
  onError,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [aspect, setAspect] = useState<number | undefined>(3 / 2)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [squarePreviewUrl, setSquarePreviewUrl] = useState<string | null>(null)
  const isProcessingRef = useRef(false) // Для немедленной проверки без ожидания ререндера

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

          // Генерируем квадратное превью (центральная часть)
          const img = new Image()
          img.src = url
          await new Promise((resolve) => {
            img.onload = resolve
          })

          const canvas = document.createElement('canvas')
          const size = Math.min(img.width, img.height)
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          if (ctx) {
            // Вырезаем центральную квадратную часть
            const offsetX = (img.width - size) / 2
            const offsetY = (img.height - size) / 2
            ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size)

            canvas.toBlob((squareBlob) => {
              if (squareBlob && !cancelled) {
                const squareUrl = URL.createObjectURL(squareBlob)
                setSquarePreviewUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev)
                  return squareUrl
                })
              }
            }, 'image/webp')
          }
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

  // Cleanup preview URLs при размонтировании
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      if (squarePreviewUrl) {
        URL.revokeObjectURL(squarePreviewUrl)
      }
    }
  }, [previewUrl, squarePreviewUrl])

  const handleCrop = useCallback(async () => {
    // Используем ref для немедленной проверки без ожидания ререндера
    if (!croppedAreaPixels || isProcessingRef.current) return

    try {
      isProcessingRef.current = true
      setIsProcessing(true)

      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
      const croppedFile = blobToFile(
        croppedBlob,
        originalFile.name.replace(/\.[^/.]+$/, '') + '-cropped.webp'
      )

      // НЕ сбрасываем isProcessing - пусть модалка остается заблокированной
      // до тех пор, пока родитель не закроет её после завершения загрузки
      onComplete(croppedFile)
    } catch (error) {
      console.error('Ошибка при обрезке:', error)
      if (onError) {
        onError('Не удалось обрезать изображение')
      }
      isProcessingRef.current = false
      setIsProcessing(false)
    }
  }, [croppedAreaPixels, imageSrc, rotation, originalFile, onComplete, onError])

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
    <div className={css.overlay} onClick={isProcessing ? undefined : onCancel} role="presentation">
      <div
        className={css.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-modal-title"
      >
        <div className={css.header}>
          <h2 id="crop-modal-title">Обрезка изображения</h2>
        </div>

        <div className={css.cropContainer}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={isProcessing ? () => {} : setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={isProcessing ? () => {} : setZoom}
            onRotationChange={isProcessing ? () => {} : setRotation}
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
                  disabled={isProcessing}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
            <p className={css.hint}>
              Рекомендуется 3:2 — полностью видно на странице товара, в карточках обрезается до квадрата
            </p>
          </div>

          <div className={css.controlGroup}>
            <label id="zoom-label">Масштаб: {zoom.toFixed(1)}x</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              disabled={isProcessing}
              aria-labelledby="zoom-label"
            />
          </div>

          <div className={css.controlGroup}>
            <label id="rotation-label">Поворот: {rotation}°</label>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              disabled={isProcessing}
              aria-labelledby="rotation-label"
            />
          </div>

          {previewUrl && (
            <div className={css.controlGroup}>
              <label>Предпросмотр:</label>
              <div className={css.previewRow}>
                <div className={css.previewItem}>
                  <div className={css.previewContainer}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Preview" className={css.previewImage} />
                  </div>
                  <span className={css.previewLabel}>Страница товара</span>
                </div>
                {squarePreviewUrl && (
                  <div className={css.previewItem}>
                    <div className={css.previewContainerSquare}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={squarePreviewUrl} alt="Square preview" className={css.previewImageSquare} />
                    </div>
                    <span className={css.previewLabel}>Карточка каталога</span>
                  </div>
                )}
              </div>
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

        {isProcessing && (
          <div className={css.loadingOverlay}>
            <div className={css.spinner}></div>
            <p>Обработка изображения...</p>
          </div>
        )}
      </div>
    </div>
  )
}
