import css from './index.module.scss'

const SvgIcon = ({
  icon = 'logo',
  type = 'default',
  widthIcon = '20px',
  heightIcon = '20px',
  actionFunction,
}: {
  icon: string
  type?: 'default' | 'social' | 'arrow'
  widthIcon?: string
  heightIcon?: string
  actionFunction?: () => void
}) => {
  return (
    <div className={`${css.round} ${css[type]}`} onClick={actionFunction}>
      <svg className={css.svgIcon} width={widthIcon} height={heightIcon}>
        <use href={`/assets/icons/sprites.svg#${icon}`} />
      </svg>
    </div>
  )
}

export default SvgIcon
