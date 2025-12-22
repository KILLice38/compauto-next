'use client'

import { useEffect, useState } from 'react'

/**
 * Безопасный хук для медиа-запросов, работает только на клиенте
 * @param query - медиа-запрос, например "(max-width: 768px)"
 * @returns boolean - соответствует ли текущий viewport запросу
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Проверяем, что window доступен
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Используем addEventListener для современных браузеров
    mediaQuery.addEventListener('change', handler)

    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [query])

  // Возвращаем false до монтирования компонента
  return mounted ? matches : false
}
