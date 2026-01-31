import { Product } from '../../../../../generated/prisma/client'
import css from './index.module.scss'

const Characteristics = ({ product }: { product: Product }) => {
  return (
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
      {product.price > 0 && <p className={css.price}>от {product.price.toLocaleString('ru-RU')} ₽</p>}
    </div>
  )
}

export default Characteristics
