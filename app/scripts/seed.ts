import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

const users = [
  {
    name: 'Admin',
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!,
  },
  {
    name: 'Manager',
    email: 'manager@example.com',
    password: 'manager123',
  },
]

async function seed() {
  for (const user of users) {
    const existingUser = await prisma.user.findUnique({ where: { email: user.email } })

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(user.password, 10)
      await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          hashedPassword,
        },
      })
      console.log(`✅ Created user: ${user.email}`)
    } else {
      console.log(`ℹ️ User already exists: ${user.email}`)
    }
  }

  await prisma.$disconnect()
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
