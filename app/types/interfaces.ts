export interface ProductType {
  id: number
  slug: string
  img: string
  title: string
  description: string
  price: number
  engineModel?: string | null
  autoMark?: string | null
  compressor?: string | null
  createdAt?: string
  updatedAt?: string
}
