import Image from 'next/image'
import css from './index.module.scss'

const Gallery = () => {
  return (
    <section className={css.gallery}>
      <div className="container">
        <Image
          src="/assets/images/girls.jpg"
          alt="Девочки"
          className={css.gallery__mainImage}
          width={1160}
          height={773}
        ></Image>
        <div className={css.gallery__wrapper}>
          <Image
            src="/assets/images/galleryItem.jpg"
            alt="Картинка"
            className={css.gallery__image}
            width={110}
            height={113}
          />
          <Image
            src="/assets/images/galleryItem.jpg"
            alt="Картинка"
            className={css.gallery__image}
            width={110}
            height={113}
          />
          <Image
            src="/assets/images/galleryItem.jpg"
            alt="Картинка"
            className={css.gallery__image}
            width={110}
            height={113}
          />
          <Image
            src="/assets/images/galleryItem.jpg"
            alt="Картинка"
            className={css.gallery__image}
            width={110}
            height={113}
          />
          <Image
            src="/assets/images/galleryItem.jpg"
            alt="Картинка"
            className={css.gallery__image}
            width={110}
            height={113}
          />
          <Image
            src="/assets/images/galleryItem.jpg"
            alt="Картинка"
            className={css.gallery__image}
            width={110}
            height={113}
          />
          <Image
            src="/assets/images/galleryItem.jpg"
            alt="Картинка"
            className={css.gallery__image}
            width={110}
            height={113}
          />
          <Image
            src="/assets/images/galleryItem.jpg"
            alt="Картинка"
            className={css.gallery__image}
            width={110}
            height={113}
          />
        </div>
      </div>
    </section>
  )
}

export default Gallery
