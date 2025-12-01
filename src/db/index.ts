import { config } from 'dotenv'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema.ts'

// Load .env.local first, then .env as fallback
config({ path: '.env.local' })
config({ path: '.env' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
})
export const db = drizzle(pool, { schema })
