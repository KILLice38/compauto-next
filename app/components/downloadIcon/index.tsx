import { useState } from 'react'
import css from './index.module.scss'

type DownloadStatus = 'idle' | 'loading' | 'success'

const DownloadIcon = () => {
  const [isHovered, setIsHovered] = useState(false)
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle')

  const isExpanded = isHovered || downloadStatus === 'loading' || downloadStatus === 'success'

  const handleClick = async () => {
    if (downloadStatus === 'loading') {
      return
    }
    setDownloadStatus('loading')

    try {
      const response = await fetch('/test.pdf')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = 'price-list.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()

      setDownloadStatus('success')
    } catch (err) {
      console.error('Download failed: ', err)
      setDownloadStatus('idle')
    }
  }

  return (
    <button
      className={`${css.downloadIcon__button} ${isExpanded ? css.expanded : ''} ${downloadStatus === 'success' ? css.success : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className={css.downloadIcon__round}>
        <div className={css.downloadIcon__iconWrapper}>
          <svg className={css.downloadIcon__icon}>
            <use
              xlinkHref={`/assets/icons/sprites.svg#${downloadStatus === 'loading' ? 'loading' : downloadStatus === 'success' ? 'success' : 'download'}`}
            />
          </svg>
        </div>
        <div className={css.downloadIcon__labelWrapper}>
          <p className={css.downloadIcon__text}>Скачать прайс-лист</p>
          {downloadStatus !== 'idle' && (
            <svg
              className={`${css.downloadIcon__statusIcon} ${downloadStatus === 'success' ? css.success : css.loading}`}
            >
              <use xlinkHref={`/assets/icons/sprites.svg#${downloadStatus === 'loading' ? 'loading' : 'success'}`} />
            </svg>
          )}
        </div>
      </div>
    </button>
  )
}

export default DownloadIcon
