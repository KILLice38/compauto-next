import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const prisma = new PrismaClient({
  adapter: new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL })),
})

async function main() {
  const email = process.argv[2]

  if (!email) {
    console.error('Укажи email: ts-node scripts/deleteUser.ts user@example.com')
    process.exit(1)
  }

  const deleted = await prisma.user.deleteMany({ where: { email } })

  if (deleted.count > 0) {
    console.log(`Удален пользователь: ${email}`)
  } else {
    console.log(`Пользователь с email ${email} не найден.`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
