export const metadata = {
  title: 'Панель администратора',
  description: 'Управление контентом сайта',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header style={{ padding: '20px', background: '#222', color: '#fff' }}>
          <h1 style={{ margin: 0 }}>Админка сайта</h1>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
