'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import ErrorBoundary from '../../components/errorBoundary'

interface Props {
  children: ReactNode
}

/**
 * Error Boundary для админ панели
 * Изолирует ошибки в админке от основного приложения
 */
export default function AdminErrorBoundary({ children }: Props) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Логирование ошибок админки
    console.error('[Admin Panel Error]:', error)
    console.error('[Error Info]:', errorInfo)

    // В production можно отправить в error tracking с тегом 'admin'
    // Sentry.captureException(error, { tags: { area: 'admin' }, extra: errorInfo })
  }

  // Custom fallback для админки
  const adminFallback = (
    <div
      style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#fee2e2',
        borderRadius: '8px',
        margin: '20px',
      }}
    >
      <h2 style={{ color: '#991b1b', marginBottom: '16px' }}>Ошибка в админ панели</h2>
      <p style={{ color: '#7f1d1d', marginBottom: '24px' }}>
        Произошла ошибка при загрузке админ панели.
        <br />
        Попробуйте обновить страницу или вернуться на главную страницу.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <Link
          href="/admin"
          style={{
            padding: '10px 20px',
            backgroundColor: 'white',
            color: '#991b1b',
            border: '2px solid #dc2626',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Вернуться в админку
        </Link>
        <Link
          href="/"
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          На главную
        </Link>
      </div>
    </div>
  )

  return (
    <ErrorBoundary onError={handleError} fallback={adminFallback}>
      {children}
    </ErrorBoundary>
  )
}
