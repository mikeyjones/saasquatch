import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Load .env.local first, then .env as fallback
config({ path: '.env.local' })
config({ path: '.env' })

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
