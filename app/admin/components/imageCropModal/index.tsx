'use client'

import { useState, useCallback } from 'react'
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

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCrop = useCallback(async () => {
    if (!croppedAreaPixels) return

    try {
      setIsProcessing(true)
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
      const croppedFile = blobToFile(
        croppedBlob,
        originalFile.name.replace(/\.[^/.]+$/, '') + '-cropped.png'
      )
      onComplete(croppedFile)
    } catch (error) {
      console.error('Ошибка при обрезке:', error)
      alert('Не удалось обрезать изображение')
    } finally {
      setIsProcessing(false)
    }
  }, [croppedAreaPixels, imageSrc, rotation, originalFile, onComplete])

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
