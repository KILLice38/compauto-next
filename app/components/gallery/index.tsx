import css from './index.module.scss'

const Gallery = () => {
  return (
    <section className={css.gallery}>
      <div className="container">
        <img src="/assets/images/girls.jpg" alt="Девочки" className={css.gallery__mainImage}></img>
        <div className={css.gallery__wrapper}>
          <img src="/assets/images/galleryItem.jpg" alt="Картинка" className={css.gallery__image} />
          <img src="/assets/images/galleryItem.jpg" alt="Картинка" className={css.gallery__image} />
          <img src="/assets/images/galleryItem.jpg" alt="Картинка" className={css.gallery__image} />
          <img src="/assets/images/galleryItem.jpg" alt="Картинка" className={css.gallery__image} />
          <img src="/assets/images/galleryItem.jpg" alt="Картинка" className={css.gallery__image} />
          <img src="/assets/images/galleryItem.jpg" alt="Картинка" className={css.gallery__image} />
          <img src="/assets/images/galleryItem.jpg" alt="Картинка" className={css.gallery__image} />
          <img src="/assets/images/galleryItem.jpg" alt="Картинка" className={css.gallery__image} />
        </div>
      </div>
    </section>
  )
}

export default Gallery
