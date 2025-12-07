import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema.ts'

// Get the project root directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '../..')

// Load .env.local first, then .env as fallback (using absolute paths)
config({ path: resolve(projectRoot, '.env.local') })
config({ path: resolve(projectRoot, '.env') })

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required')
}

const pool = new Pool({
  connectionString: databaseUrl,
})
export const db = drizzle(pool, { schema })
