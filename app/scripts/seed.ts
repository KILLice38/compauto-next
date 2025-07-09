import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const password = 'admin123'
  const hashedPassword = await bcrypt.hash(password, 10)

  const existingUser = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  })

  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: 'admin3@example.com',
        name: 'Admin',
        hashedPassword,
      },
    })
    console.log('✅ Админ создан')
  } else {
    console.log('ℹ️ Админ уже существует')
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
