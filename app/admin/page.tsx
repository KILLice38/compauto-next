import '../globals.scss'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/authOptions'
import AdminPageClient from './adminPageClient'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return (
      <div style={{ textAlign: 'center', marginTop: 100 }}>
        <h2>Доступ запрещён</h2>
        <p>
          Пожалуйста, <a href="/admin/login">войдите</a>.
        </p>
      </div>
    )
  }

  return <AdminPageClient />
}
