/**
 * Database seed script for multi-tenant testing
 * Creates 2 test tenants with 2 users each
 *
 * Run with: bun run db:seed
 */

import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq } from 'drizzle-orm'
import * as schema from './schema'
import { hashPassword } from 'better-auth/crypto'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
})
const db = drizzle(pool, { schema })

// Generate a simple ID (compatible with Better Auth format)
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

interface TenantSeedData {
  name: string
  slug: string
  users: { name: string; email: string; role: 'owner' | 'admin' | 'member' }[]
}

const seedData: TenantSeedData[] = [
  {
    name: 'Acme Corporation',
    slug: 'acme',
    users: [
      { name: 'Alice Admin', email: 'alice@acme.test', role: 'owner' },
      { name: 'Bob Builder', email: 'bob@acme.test', role: 'member' },
    ],
  },
  {
    name: 'Globex Industries',
    slug: 'globex',
    users: [
      { name: 'Charlie CEO', email: 'charlie@globex.test', role: 'owner' },
      { name: 'Diana Dev', email: 'diana@globex.test', role: 'member' },
    ],
  },
]

async function seed() {
  console.log('🌱 Starting database seed...\n')

  try {
    for (const tenant of seedData) {
      console.log(`📦 Creating tenant: ${tenant.name} (${tenant.slug})`)

      // Check if organization already exists
      const existingOrg = await db.query.organization.findFirst({
        where: eq(schema.organization.slug, tenant.slug),
      })

      let orgId: string
      if (existingOrg) {
        orgId = existingOrg.id
        console.log(`   ℹ Organization already exists: ${tenant.slug}`)
      } else {
        orgId = generateId()
        await db.insert(schema.organization).values({
          id: orgId,
          name: tenant.name,
          slug: tenant.slug,
          logo: null,
        })
        console.log(`   ✓ Organization created: ${tenant.slug}`)
      }

      // Create users and memberships
      for (const userData of tenant.users) {
        // Check if user already exists
        const existingUser = await db.query.user.findFirst({
          where: eq(schema.user.email, userData.email),
        })

        let userId: string
        if (existingUser) {
          userId = existingUser.id
          console.log(`   ℹ User already exists: ${userData.email}`)
          
          // Update password using Better Auth's hashPassword function
          const existingAccount = await db.query.account.findFirst({
            where: (account, { and, eq }) =>
              and(
                eq(account.userId, userId),
                eq(account.providerId, 'credential')
              ),
          })
          
          if (existingAccount) {
            // Use Better Auth's password hashing function
            const hashedPassword = await hashPassword('password123')
            await db.update(schema.account)
              .set({ password: hashedPassword })
              .where(eq(schema.account.id, existingAccount.id))
            console.log(`   ✓ Password updated for: ${userData.email}`)
          }
        } else {
          userId = generateId()
          // Use Better Auth's password hashing function
          const hashedPassword = await hashPassword('password123')

          // Create user
          await db.insert(schema.user).values({
            id: userId,
            name: userData.name,
            email: userData.email,
            emailVerified: true,
          })

          // Create account (for email/password login)
          await db.insert(schema.account).values({
            id: generateId(),
            accountId: userId,
            providerId: 'credential',
            userId: userId,
            password: hashedPassword,
          })

          console.log(`   ✓ User created: ${userData.email} (${userData.role})`)
        }

        // Check if membership already exists
        const existingMember = await db.query.member.findFirst({
          where: (member, { and }) =>
            and(
              eq(member.organizationId, orgId),
              eq(member.userId, userId)
            ),
        })

        if (!existingMember) {
          await db.insert(schema.member).values({
            organizationId: orgId,
            userId: userId,
            role: userData.role,
          })
          console.log(`   ✓ Membership created: ${userData.email} -> ${tenant.slug}`)
        }
      }

      // Check if we need to create sample todos
      const existingTodos = await db.query.todos.findFirst({
        where: eq(schema.todos.organizationId, orgId),
      })

      if (!existingTodos) {
        const sampleTodos = [
          `Review Q4 reports for ${tenant.name}`,
          `Schedule team meeting - ${tenant.slug}`,
          `Update documentation`,
        ]

        for (const title of sampleTodos) {
          await db.insert(schema.todos).values({
            title,
            organizationId: orgId,
          })
        }
        console.log(`   ✓ Created ${sampleTodos.length} sample todos`)
      } else {
        console.log(`   ℹ Sample todos already exist`)
      }

      console.log('')
    }

    console.log('✅ Seed completed successfully!\n')
    console.log('📋 Test Credentials (password for all: password123):')
    console.log('─'.repeat(50))
    for (const tenant of seedData) {
      console.log(`\n🏢 ${tenant.name} (/${tenant.slug}/app/support)`)
      for (const user of tenant.users) {
        console.log(`   • ${user.email} (${user.role})`)
      }
    }
    console.log('\n')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

seed()
