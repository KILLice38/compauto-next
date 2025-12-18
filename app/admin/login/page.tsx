'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (process.env.NODE_ENV === 'development') {
      console.log('[LOGIN] Attempting login')
    }

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('[LOGIN] Response:', res?.ok ? 'success' : 'error')
    }

    if (res?.error) {
      setError('Неверный логин или пароль')
    } else if (res?.ok) {
      router.push('/admin')
      router.refresh()
    }
  }

  const hasError = Boolean(error)

  return (
    <div style={{ maxWidth: 400, margin: 'auto', paddingTop: 50 }}>
      <h1>Вход в админку</h1>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }} noValidate>
        <div style={{ display: 'grid', gap: 6 }}>
          <label htmlFor="email" style={{ fontWeight: 500 }}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
            aria-required="true"
            aria-invalid={hasError}
            aria-describedby={hasError ? 'login-error' : undefined}
            style={{ padding: '8px 12px', fontSize: 16 }}
          />
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <label htmlFor="password" style={{ fontWeight: 500 }}>
            Пароль
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Введите пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            aria-required="true"
            aria-invalid={hasError}
            aria-describedby={hasError ? 'login-error' : undefined}
            style={{ padding: '8px 12px', fontSize: 16 }}
          />
        </div>

        {error && (
          <p
            id="login-error"
            role="alert"
            aria-live="assertive"
            style={{
              color: '#dc2626',
              backgroundColor: '#fee2e2',
              padding: '12px',
              borderRadius: 4,
              margin: 0,
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          style={{
            padding: '10px 20px',
            fontSize: 16,
            fontWeight: 500,
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          Войти
        </button>
      </form>
    </div>
  )
}
