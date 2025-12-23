// scripts/create-user.ts
import 'dotenv/config'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.error('Usage: pnpm create-user <email> <password>')
    process.exit(1)
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: { hashedPassword },
    create: {
      email,
      hashedPassword,
      // name: 'Admin', // при желании можешь добавить
    },
  })

  console.log('User created/updated:', {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
