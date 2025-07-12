import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const users = [{ id: '1', name: 'Admin', email: 'admin@example.com', password: 'admin123' }]
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const user = users.find((u) => u.email === credentials?.email && u.password === credentials?.password)
        if (user) return { id: user.id, name: user.name, email: user.email }
        return null
      },
    }),
  ],
  session: { strategy: 'jwt' },
  jwt: { secret: process.env.NEXTAUTH_SECRET },
  pages: { signIn: '/admin/login' },
}
