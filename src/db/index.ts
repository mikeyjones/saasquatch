import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema.ts'

// In production, DATABASE_URL is set by the environment
// In development, it's loaded via vite's env handling or the app's entry point
const databaseUrl = process.env.DATABASE_URL

// Create a lazy pool to avoid initialization errors during client bundling
let pool: Pool | null = null

function getPool() {
  if (!pool) {
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required')
    }
    pool = new Pool({
      connectionString: databaseUrl,
    })
  }
  return pool
}

// Export a lazy db instance that only initializes when accessed on the server
export const db = drizzle(getPool, { schema })
