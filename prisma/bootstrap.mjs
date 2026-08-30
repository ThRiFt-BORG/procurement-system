// One-time setup for a REAL deployment — creates the standard procurement
// categories and the first Admin account. Safe to re-run (everything is
// upserted). Unlike seed.mjs, this creates no suppliers, products, prices,
// or LPOs — the restaurant enters those themselves through the app.
//
// Usage:
//   node prisma/bootstrap.mjs "Owner Name" owner@restaurant.co.ke "a-strong-password"

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../src/lib/password.js'

const [, , adminName, adminEmail, adminPassword] = process.argv

if (!adminName || !adminEmail || !adminPassword) {
  console.error('Usage: node prisma/bootstrap.mjs "Admin Name" admin@email.com "password"')
  process.exit(1)
}
if (adminPassword.length < 8) {
  console.error('Password must be at least 8 characters.')
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

const CATEGORIES = [
  'Vegetables',
  'Alcoholic Beverages',
  'Dry Goods',
  'Cleaning Materials',
  'Packaging Materials',
  'Bakery & Pastry Ingredients',
  'Beverages',
]

async function main() {
  console.log('Creating standard categories...')
  for (const name of CATEGORIES) {
    await db.category.upsert({ where: { name }, update: {}, create: { name } })
  }

  console.log(`Creating admin account for ${adminEmail}...`)
  await db.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: { passwordHash: await hashPassword(adminPassword), role: 'ADMIN', active: true },
    create: {
      name: adminName,
      email: adminEmail.toLowerCase(),
      role: 'ADMIN',
      passwordHash: await hashPassword(adminPassword),
    },
  })

  console.log('Done. Sign in with the admin account, then add suppliers, products and users from the app.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
