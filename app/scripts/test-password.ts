import 'dotenv/config'
import bcrypt from 'bcrypt'
import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

const prisma = new PrismaClient({
  adapter: new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL })),
})

async function testPassword() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL!
  const password = process.argv[3] || process.env.ADMIN_PASSWORD!

  console.log(`\n🔍 Testing password for: ${email}`)
  console.log(`📝 Password to test: ${password}`)

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    console.log('❌ User not found in database')
    await prisma.$disconnect()
    process.exit(1)
  }

  console.log('✅ User found in database')
  console.log(`🔑 Stored hash: ${user.hashedPassword.substring(0, 20)}...`)

  const isValid = await bcrypt.compare(password, user.hashedPassword)

  if (isValid) {
    console.log('✅ Password matches! Authentication should work.')
  } else {
    console.log('❌ Password does NOT match! This is the problem.')
    console.log('\n🔧 Regenerating hash...')
    const newHash = await bcrypt.hash(password, 10)
    await prisma.user.update({
      where: { email },
      data: { hashedPassword: newHash },
    })
    console.log('✅ Password hash updated in database. Try logging in again.')
  }

  await prisma.$disconnect()
}

testPassword().catch((e) => {
  console.error('❌ Error:', e)
  process.exit(1)
})
