import css from './index.module.scss'

const SvgIcon = ({
  icon = 'logo',
  type = 'active',
  widthRound = '50px',
  heightRound = '50px',
  widthIcon = '20px',
  heightIcon = '20px',
  actionFunction,
}: {
  icon: string
  type?: string
  widthRound?: string
  heightRound?: string
  widthIcon?: string
  heightIcon?: string
  actionFunction?: () => void
}) => {
  return (
    <div
      className={`${css.svgIcon__round} ${type === 'active' ? css.active : ''}`}
      style={{ width: widthRound, height: heightRound }}
      onClick={actionFunction}
    >
      <svg className={css.svgIcon} width={widthIcon} height={heightIcon}>
        <use xlinkHref={`/assets/icons/sprites.svg#${icon}`} />
      </svg>
    </div>
  )
}

export default SvgIcon
