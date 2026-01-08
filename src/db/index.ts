import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.ts";

// In production, DATABASE_URL is set by the environment
// In development, it's loaded via vite's env handling or the app's entry point
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
	connectionString: databaseUrl,
});

export const db = drizzle(pool, { schema });
