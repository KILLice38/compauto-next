import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '../../../lib/products'
import { generateProductSchema, generateBreadcrumbSchema } from '../../../lib/structuredData'
import css from './page.module.scss'
import ProductContent from './components/productContent'

export const runtime = 'nodejs'
export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Товар не найден' }
  const title = `${product.title} — Каталог`
  const description = product.description?.slice(0, 160) || ''
  return {
    title,
    description,
    openGraph: { title, description, images: product.img ? [{ url: product.img }] : [] },
    alternates: { canonical: `/catalog/${product.slug}` },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const images = [product.img, ...(product.gallery ?? [])].filter(Boolean)

  const detailParas = (product.details ?? [])
    .map<string>((p: string) => (p ?? '').trim())
    .filter((s: string) => s.length > 0)
  const hasDetails = detailParas.length > 0
  const hasShort = !!product.description?.trim()

  // Генерируем Schema.org разметку для SEO
  const productSchema = generateProductSchema(product)
  const breadcrumbSchema = generateBreadcrumbSchema(product)

  return (
    <>
      {/* Schema.org JSON-LD разметка для Google Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <section className={css.page}>
        <div className="container">
          <ProductContent
            images={images}
            product={product}
            detailParams={detailParas}
            hasDetails={hasDetails}
            hasShort={hasShort}
          />
        </div>
      </section>
    </>
  )
}
