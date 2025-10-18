'use client'

import { ReactNode } from 'react'
import ErrorBoundary from './errorBoundary'

interface Props {
  children: ReactNode
}

/**
 * Client-side обертка для Error Boundary
 * Используется в Server Components для изоляции ошибок
 */
export default function ClientErrorBoundary({ children }: Props) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // В production можно отправить в error tracking
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo })
      console.error('[Production Error]:', error)
    }
  }

  return <ErrorBoundary onError={handleError}>{children}</ErrorBoundary>
}
