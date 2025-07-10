import Link from 'next/link'
import Button from './components/button'
import css from './not-found.module.scss'
import ClientLayout from './clientLayout'
import Image from 'next/image'

const NotFoundPage = () => {
  return (
    <ClientLayout>
      <div className={css.notFound}>
        <div className={`container ${css.notFound__container}`}>
          <div className={css.notFound__content}>
            <h1 className={css.notFound__title}>Страница не найдена</h1>
            <p className={css.notFound__description}>Запчасти на складе есть, а вот этой страницы — нет. </p>
            <p className={css.notFound__error}>404</p>
            <Link href="/">
              <Button type="link">О как, вернуться на главную</Button>
            </Link>
          </div>
          <Image
            src="/assets/images/girls-error.jpg"
            alt="Девочки"
            className={css.notFound__image}
            width={560}
            height={567}
          />
        </div>
      </div>
    </ClientLayout>
  )
}

export default NotFoundPage
