// app/utils/cropImage.ts
import type { Area } from 'react-easy-crop'

/**
 * Создает обрезанное изображение из исходного на основе области crop
 * @param imageSrc - URL исходного изображения
 * @param pixelCrop - Область обрезки в пикселях
 * @param rotation - Угол поворота (опционально)
 * @returns Promise с Blob обрезанного изображения
 */
export async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  const maxSize = Math.max(image.width, image.height)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

  // Устанавливаем размер canvas для безопасного поворота
  canvas.width = safeArea
  canvas.height = safeArea

  // Переносим в центр перед поворотом
  ctx.translate(safeArea / 2, safeArea / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-safeArea / 2, -safeArea / 2)

  // Рисуем повернутое изображение
  ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5)

  const data = ctx.getImageData(0, 0, safeArea, safeArea)

  // Устанавливаем размер canvas для обрезанного изображения
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // Вставляем обрезанную часть
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  )

  // Возвращаем Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'))
        return
      }
      resolve(blob)
    }, 'image/png')
  })
}

/**
 * Создает HTMLImageElement из URL
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

/**
 * Получает данные файла из Blob
 */
export function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type })
}

/**
 * Читает файл как Data URL
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result as string))
    reader.readAsDataURL(file)
  })
}
