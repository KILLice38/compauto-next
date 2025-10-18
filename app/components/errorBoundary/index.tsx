'use client'

import { Component, ReactNode } from 'react'
import styles from './errorBoundary.module.scss'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

/**
 * Error Boundary компонент для изоляции ошибок React
 * Предотвращает падение всего приложения при ошибке в отдельном компоненте
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Обновляем state чтобы показать fallback UI
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Логируем ошибку для мониторинга
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error)
      console.error('[ErrorBoundary] Error info:', errorInfo)
    }

    // Вызываем callback если передан
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // В production здесь можно отправить в error tracking сервис
    // Example: Sentry.captureException(error, { extra: errorInfo })

    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Если передан custom fallback, используем его
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Дефолтный fallback UI
      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorContent}>
            <div className={styles.errorIcon}>⚠️</div>
            <h2 className={styles.errorTitle}>Что-то пошло не так</h2>
            <p className={styles.errorMessage}>
              Произошла ошибка при отображении этой части страницы.
              <br />
              Попробуйте обновить страницу или вернуться позже.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className={styles.errorDetails}>
                <summary>Детали ошибки (только для разработки)</summary>
                <pre className={styles.errorStack}>
                  <code>{this.state.error.toString()}</code>
                  {this.state.errorInfo && (
                    <code>{this.state.errorInfo.componentStack}</code>
                  )}
                </pre>
              </details>
            )}

            <div className={styles.errorActions}>
              <button onClick={this.handleReset} className={styles.buttonSecondary}>
                Попробовать снова
              </button>
              <button onClick={this.handleReload} className={styles.buttonPrimary}>
                Обновить страницу
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
