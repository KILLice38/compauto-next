import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '../../../lib/products'
import ProductGallery from '../../../components/product-gallery'
import css from './page.module.scss'

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

  const images = [product.img, ...(product.gallery ?? [])]

  const detailParas = (product.details ?? []).map<string>((p) => (p ?? '').trim()).filter((s: string) => s.length > 0)
  const hasDetails = detailParas.length > 0
  const hasShort = !!product.description?.trim()

  return (
    <section className={css.page}>
      <div className="container">
        <div className={css.content}>
          <div className={css.mainInfo}>
            <ProductGallery images={images} minSlides={3} maxSlides={5} />
            <div className={css.mainText}>
              <h1 className={css.title}>{product.title}</h1>
              <div className={css.description}>
                {hasDetails ? (
                  detailParas.map((p: string, i: number) => <p key={i}>{p}</p>)
                ) : hasShort ? (
                  <p>{product.description}</p>
                ) : (
                  <p className={css.paragraph}>Описания ещё нет.</p>
                )}
              </div>
            </div>
          </div>

          <div className={css.characteristics}>
            <h2 className={css.subtitle}>Технические характеристики</h2>
            <ul className={css.list}>
              {product.autoMark && (
                <li className={css.item}>
                  <div className={css.itemWrapper}>
                    <p className={css.itemName}>Марка авто</p>
                    <div className={css.underline}></div>
                  </div>
                  <p className={css.itemValue}>{product.autoMark}</p>
                </li>
              )}
              {product.engineModel && (
                <li className={css.item}>
                  <div className={css.itemWrapper}>
                    <p className={css.itemName}>Модель двигателя</p>
                    <div className={css.underline}></div>
                  </div>
                  <p className={css.itemValue}>{product.engineModel}</p>
                </li>
              )}
              {product.compressor && (
                <li className={css.item}>
                  <div className={css.itemWrapper}>
                    <p className={css.itemName}>Тип компрессора</p>
                    <div className={css.underline}></div>
                  </div>
                  <div className={css.itemValue}>{product.compressor}</div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
