'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import ConfirmModal from '../components/confirmModal'
import { ToastContainer, ToastType } from '../components/toast'

// Types
interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

interface ToastData {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface UIContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  toast: {
    success: (message: string, duration?: number) => void
    error: (message: string, duration?: number) => void
    warning: (message: string, duration?: number) => void
    info: (message: string, duration?: number) => void
  }
}

// Context
const UIContext = createContext<UIContextType | null>(null)

// Provider
export function UIProvider({ children }: { children: ReactNode }) {
  // Confirm Modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    options: ConfirmOptions
    resolve: ((value: boolean) => void) | null
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    resolve: null,
  })
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)

  // Toasts state
  const [toasts, setToasts] = useState<ToastData[]>([])

  // Confirm function
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setIsConfirmLoading(true)
    // Small delay to show loading state
    setTimeout(() => {
      confirmState.resolve?.(true)
      setConfirmState({ isOpen: false, options: { title: '', message: '' }, resolve: null })
      setIsConfirmLoading(false)
    }, 150)
  }, [confirmState])

  const handleCancel = useCallback(() => {
    confirmState.resolve?.(false)
    setConfirmState({ isOpen: false, options: { title: '', message: '' }, resolve: null })
  }, [confirmState])

  // Toast functions
  const addToast = useCallback((message: string, type: ToastType, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = {
    success: (message: string, duration?: number) => addToast(message, 'success', duration),
    error: (message: string, duration?: number) => addToast(message, 'error', duration ?? 7000),
    warning: (message: string, duration?: number) => addToast(message, 'warning', duration),
    info: (message: string, duration?: number) => addToast(message, 'info', duration),
  }

  return (
    <UIContext.Provider value={{ confirm, toast }}>
      {children}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.options.title}
        message={confirmState.options.message}
        confirmText={confirmState.options.confirmText}
        cancelText={confirmState.options.cancelText}
        variant={confirmState.options.variant}
        isLoading={isConfirmLoading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </UIContext.Provider>
  )
}

// Hook
export function useUI() {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}
