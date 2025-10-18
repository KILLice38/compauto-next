# Error Boundary - Руководство

## Описание

Error Boundary компоненты изолируют ошибки React, предотвращая падение всего приложения при ошибке в отдельном компоненте.

## Архитектура

### Уровни Error Boundaries в проекте

```
app/layout.tsx (Root)
  └── ClientErrorBoundary (глобальный)
      └── ToastProvider
          └── children

app/admin/layout.tsx (Admin)
  └── AdminErrorBoundary (админка)
      └── children
```

## Компоненты

### 1. ErrorBoundary (базовый класс)
**Файл:** `app/components/errorBoundary/index.tsx`

Базовый Error Boundary компонент с:
- Обработкой ошибок через `componentDidCatch`
- Fallback UI с анимацией
- Кнопками "Попробовать снова" и "Обновить страницу"
- Детали ошибки в development режиме
- Callback `onError` для кастомной обработки

**Props:**
```typescript
interface Props {
  children: ReactNode
  fallback?: ReactNode  // Кастомный fallback UI
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}
```

**Использование:**
```tsx
import ErrorBoundary from '@/components/errorBoundary'

<ErrorBoundary onError={(err, info) => console.error(err)}>
  <YourComponent />
</ErrorBoundary>
```

### 2. ClientErrorBoundary (глобальный)
**Файл:** `app/components/clientErrorBoundary.tsx`

Client-side обертка для использования в Server Components.

**Где используется:**
- `app/layout.tsx` - оборачивает все приложение

**Функции:**
- Ловит все ошибки на уровне приложения
- Логирует ошибки (в production можно интегрировать Sentry)
- Показывает fallback UI при критических ошибках

### 3. AdminErrorBoundary (админка)
**Файл:** `app/admin/components/adminErrorBoundary.tsx`

Специализированный Error Boundary для админ панели.

**Где используется:**
- `app/admin/layout.tsx` - оборачивает админ панель

**Отличия:**
- Кастомный fallback с кнопками "Вернуться в админку" и "На главную"
- Специальное логирование для админских ошибок
- Тег 'admin' для error tracking

## Примеры использования

### Базовое использование

```tsx
import ErrorBoundary from '@/components/errorBoundary'

export default function MyPage() {
  return (
    <ErrorBoundary>
      <ComplexComponent />
    </ErrorBoundary>
  )
}
```

### С кастомным fallback

```tsx
const customFallback = (
  <div>
    <h2>Упс! Что-то сломалось</h2>
    <button onClick={() => window.location.reload()}>
      Перезагрузить
    </button>
  </div>
)

<ErrorBoundary fallback={customFallback}>
  <MyComponent />
</ErrorBoundary>
```

### С обработкой ошибок

```tsx
const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
  // Отправить в Sentry
  Sentry.captureException(error, {
    tags: { component: 'ProductList' },
    extra: errorInfo
  })

  // Отправить метрику
  analytics.track('component_error', {
    error: error.message,
    component: errorInfo.componentStack
  })
}

<ErrorBoundary onError={handleError}>
  <ProductList />
</ErrorBoundary>
```

### Вложенные Error Boundaries

```tsx
export default function CatalogPage() {
  return (
    <div>
      {/* Изолируем фильтры */}
      <ErrorBoundary fallback={<div>Ошибка фильтров</div>}>
        <Filters />
      </ErrorBoundary>

      {/* Изолируем список продуктов */}
      <ErrorBoundary fallback={<div>Ошибка загрузки продуктов</div>}>
        <ProductList />
      </ErrorBoundary>
    </div>
  )
}
```

## Что ловит Error Boundary

✅ **Ловит:**
- Ошибки рендеринга в дочерних компонентах
- Ошибки в lifecycle методах
- Ошибки в constructors

❌ **НЕ ловит:**
- Ошибки в event handlers (используйте try-catch)
- Асинхронные ошибки (setTimeout, fetch)
- Server-side ошибки
- Ошибки в самом Error Boundary

## Обработка ошибок в event handlers

Error Boundary не ловит ошибки в обработчиках событий. Используйте try-catch:

```tsx
const handleClick = async () => {
  try {
    await someAsyncOperation()
  } catch (error) {
    console.error('Error in handler:', error)
    // Можно показать toast уведомление
    toast.error('Произошла ошибка')
  }
}

<button onClick={handleClick}>Click me</button>
```

## Интеграция с Sentry (опционально)

### Установка

```bash
pnpm add @sentry/nextjs
```

### Настройка

```typescript
// app/components/clientErrorBoundary.tsx
import * as Sentry from '@sentry/nextjs'

const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })
  }
}
```

## Тестирование Error Boundary

### Компонент для тестирования

```tsx
// app/components/errorTester.tsx
'use client'

import { useState } from 'react'

export default function ErrorTester() {
  const [shouldThrow, setShouldThrow] = useState(false)

  if (shouldThrow) {
    throw new Error('Test error from ErrorTester component')
  }

  return (
    <div>
      <h2>Error Boundary Tester</h2>
      <button onClick={() => setShouldThrow(true)}>
        Throw Error
      </button>
    </div>
  )
}
```

### Использование

```tsx
import ErrorBoundary from '@/components/errorBoundary'
import ErrorTester from '@/components/errorTester'

<ErrorBoundary>
  <ErrorTester />
</ErrorBoundary>
```

## Best Practices

1. **Используйте на критичных участках**
   - Списки продуктов
   - Формы
   - Сложные компоненты
   - Интеграции с внешними API

2. **Не оборачивайте всё подряд**
   - Только там, где ошибка может быть критичной
   - Лучше несколько мелких boundaries, чем один большой

3. **Предоставляйте контекст**
   - Информативные fallback сообщения
   - Действия для восстановления (кнопка reload, ссылка назад)

4. **Логируйте ошибки**
   - В development - в консоль
   - В production - в error tracking (Sentry, LogRocket)

5. **Тестируйте**
   - Убедитесь, что Error Boundary работает
   - Проверьте fallback UI
   - Протестируйте recovery механизмы

## Troubleshooting

### Error Boundary не ловит ошибку

**Проблема:** Ошибка проходит мимо Error Boundary

**Решения:**
1. Убедитесь, что компонент обернут в Error Boundary
2. Проверьте, что это не async ошибка (используйте try-catch)
3. Проверьте, что это не ошибка в event handler

### Ошибка показывается без стилей

**Проблема:** Fallback UI выглядит сломанным

**Решение:** Убедитесь, что SCSS модуль импортирован и скомпилирован

### Error Boundary сам вызывает ошибку

**Проблема:** Бесконечный цикл ошибок

**Решение:** Проверьте, что в render методе Error Boundary нет ошибок

## Мониторинг

Рекомендуется отслеживать метрики:
- Частота срабатывания Error Boundary
- Типы ошибок
- Компоненты, где происходят ошибки
- User actions перед ошибкой

## Дополнительные ресурсы

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/configuring/error-handling)
- [Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
