import 'dotenv/config'
import bcrypt from 'bcrypt'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

const prisma = new PrismaClient({
  adapter: new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL })),
})

const users = [
  {
    name: 'Admin',
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!,
  },
  {
    name: process.env.DEVELOPER_NAME!,
    email: process.env.DEVELOPER_EMAIL!,
    password: process.env.DEVELOPER_PASSWORD!,
  },
]

async function seed() {
  for (const user of users) {
    if (!user.email || !user.password) {
      console.warn(`Skipping user with missing email or password`)
      continue
    }

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
      console.log(`Created user: ${user.email}`)
    } else {
      console.log(`User already exists: ${user.email}`)
    }
  }

  await prisma.$disconnect()
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
