// Polyfill для localStorage на сервере (SSR)
// Next.js 15 имеет баг с DevOverlay, который пытается использовать localStorage на сервере

if (typeof window === 'undefined') {
  // Создаем mock localStorage для серверной среды
  const mockStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  }

  // @ts-ignore - добавляем в глобальный объект
  global.localStorage = mockStorage
  // @ts-ignore
  global.sessionStorage = mockStorage
}

export {}
