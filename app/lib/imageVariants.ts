// lib/imageVariants.ts
// ОБРАТНАЯ СОВМЕСТИМОСТЬ:
// Эта библиотека работает как со старыми изображениями (с белым фоном),
// так и с новыми (с прозрачным фоном после обрезки).
// Варианты изображений всегда создаются автоматически при загрузке.

export type Variant = 'card' | 'detail' | 'thumb'

function splitQuery(u: string): [string, string] {
  const i = u.indexOf('?')
  return i >= 0 ? [u.slice(0, i), u.slice(i)] : [u, '']
}

function stripExt(u: string) {
  const i = u.lastIndexOf('.')
  return i >= 0 ? u.slice(0, i) : u
}

function baseNoVariantNoExt(u: string) {
  const [url] = splitQuery(u)
  const noExt = stripExt(url)
  return noExt.replace(/__(source|card|detail|thumb)$/i, '')
}

export function sourceUrl(originalUrl: string) {
  if (!originalUrl) return ''
  const [, qs] = splitQuery(originalUrl)
  const base = baseNoVariantNoExt(originalUrl)
  return `${base}__source.webp${qs}`
}

export function variantUrl(originalUrl: string, variant: Variant) {
  if (!originalUrl) return ''
  const [, qs] = splitQuery(originalUrl)
  const base = baseNoVariantNoExt(originalUrl)
  return `${base}__${variant}.webp${qs}`
}
