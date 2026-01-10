import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { organization, apiKey } from "better-auth/plugins";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [
		organization(),
		apiKey({
			defaultPrefix: "sk_live_",
			defaultKeyLength: 32,
			enableMetadata: true,
			keyExpiration: {
				defaultExpiresIn: null, // Never expires by default
			},
		}),
	],
	baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
	secret: process.env.BETTER_AUTH_SECRET || "change-me-in-production",
});
