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
        console.log('🔐 Attempting authorization for:', credentials?.email)

        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials')
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          console.log('❌ User not found:', credentials.email)
          return null
        }

        console.log('✅ User found:', user.email)
        console.log('🔑 Comparing password...')

        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword)

        if (!isValid) {
          console.log('❌ Password mismatch')
          return null
        }

        console.log('✅ Password valid, authorization successful')

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
}
