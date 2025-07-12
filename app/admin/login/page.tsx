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

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })

    if (res?.error) {
      setError('Неверный логин или пароль')
    } else {
      router.push('/admin')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: 'auto', paddingTop: 50 }}>
      <h2>Вход в админку</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Войти</button>
      </form>
    </div>
  )
}
