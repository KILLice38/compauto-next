import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '../../lib/prisma'
import bcrypt from 'bcrypt'

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[AUTH] Authorization attempt')
        }

        if (!credentials?.email || !credentials?.password) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[AUTH] Missing credentials')
          }
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[AUTH] User not found')
          }
          return null
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[AUTH] User found, verifying password')
        }

        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword)

        if (!isValid) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[AUTH] Invalid password')
          }
          return null
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[AUTH] Authorization successful')
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name || ''
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },
  },
  debug: process.env.NODE_ENV === 'development',
}
