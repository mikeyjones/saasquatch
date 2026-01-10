import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { organization, organizationApiKey, user } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

/**
 * Generate a unique ID for database records.
 *
 * @returns A 24-character unique identifier
 */
function generateId(): string {
	return crypto.randomUUID().replace(/-/g, "").substring(0, 24);
}

/**
 * API route for managing organization API keys.
 *
 * Provides endpoints for listing, creating, and deleting API keys
 * that enable server-to-server authentication with role-based permissions.
 */
export const Route = createFileRoute("/$tenant/api/settings/api-keys")({
	server: {
		handlers: {
			/**
			 * GET /:tenant/api/settings/api-keys
			 * List all API keys for the organization.
			 *
			 * Returns keys with masked values (only prefix shown).
			 */
			GET: async ({ request, params }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session?.user) {
						return new Response(
							JSON.stringify({ error: "Unauthorized", keys: [] }),
							{ status: 401, headers: { "Content-Type": "application/json" } },
						);
					}

					// Get the organization by slug
					const org = await db
						.select({ id: organization.id })
						.from(organization)
						.where(eq(organization.slug, params.tenant))
						.limit(1);

					if (org.length === 0) {
						return new Response(
							JSON.stringify({
								error: "Organization not found",
								keys: [],
							}),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const orgId = org[0].id;

					// Fetch organization API keys with creator info
					const orgApiKeys = await db
						.select({
							id: organizationApiKey.id,
							apiKeyId: organizationApiKey.apiKeyId,
							role: organizationApiKey.role,
							createdByUserId: organizationApiKey.createdByUserId,
							createdAt: organizationApiKey.createdAt,
							createdByName: user.name,
						})
						.from(organizationApiKey)
						.leftJoin(user, eq(organizationApiKey.createdByUserId, user.id))
						.where(eq(organizationApiKey.organizationId, orgId))
						.orderBy(desc(organizationApiKey.createdAt));

					// For each org API key, fetch the Better Auth API key details
					const keysWithDetails = await Promise.all(
						orgApiKeys.map(async (orgKey) => {
							try {
								// Get API key details from Better Auth
								const apiKeyDetails = await auth.api.getApiKey({
									query: { id: orgKey.apiKeyId },
									headers: request.headers,
								});

								return {
									id: orgKey.id,
									apiKeyId: orgKey.apiKeyId,
									name: apiKeyDetails?.name || "Unnamed Key",
									start: apiKeyDetails?.start || "sk_live_...",
									role: orgKey.role,
									enabled: apiKeyDetails?.enabled ?? true,
									createdAt: orgKey.createdAt?.toISOString() || null,
									createdByName: orgKey.createdByName || "Unknown",
								};
							} catch {
								// If we can't fetch the Better Auth key, return with limited info
								return {
									id: orgKey.id,
									apiKeyId: orgKey.apiKeyId,
									name: "Unknown",
									start: "sk_live_...",
									role: orgKey.role,
									enabled: false,
									createdAt: orgKey.createdAt?.toISOString() || null,
									createdByName: orgKey.createdByName || "Unknown",
								};
							}
						}),
					);

					return new Response(JSON.stringify({ keys: keysWithDetails }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error fetching API keys:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error", keys: [] }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * POST /:tenant/api/settings/api-keys
			 * Create a new API key for the organization.
			 *
			 * Request body:
			 * - name: string (required) - Friendly name for the key
			 * - role: "read-only" | "full-access" (required) - Permission level
			 *
			 * Returns the full key value (only shown once at creation).
			 */
			POST: async ({ request, params }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session?.user) {
						return new Response(JSON.stringify({ error: "Unauthorized" }), {
							status: 401,
							headers: { "Content-Type": "application/json" },
						});
					}

					// Get the organization by slug
					const org = await db
						.select({ id: organization.id })
						.from(organization)
						.where(eq(organization.slug, params.tenant))
						.limit(1);

					if (org.length === 0) {
						return new Response(
							JSON.stringify({ error: "Organization not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const orgId = org[0].id;

					// Parse request body
					const body = await request.json();
					const { name, role } = body;

					// Validate required fields
					if (!name || typeof name !== "string" || name.trim() === "") {
						return new Response(JSON.stringify({ error: "Name is required" }), {
							status: 400,
							headers: { "Content-Type": "application/json" },
						});
					}

					if (!role || !["read-only", "full-access"].includes(role)) {
						return new Response(
							JSON.stringify({
								error:
									"Role is required and must be 'read-only' or 'full-access'",
							}),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Create the API key via Better Auth
					const apiKeyResult = await auth.api.createApiKey({
						body: {
							name: name.trim(),
							userId: session.user.id,
							prefix: "sk_live_",
						},
					});

					if (!apiKeyResult?.id || !apiKeyResult?.key) {
						return new Response(
							JSON.stringify({ error: "Failed to create API key" }),
							{ status: 500, headers: { "Content-Type": "application/json" } },
						);
					}

					// Create the organization API key link
					const orgApiKeyId = generateId();
					await db.insert(organizationApiKey).values({
						id: orgApiKeyId,
						organizationId: orgId,
						apiKeyId: apiKeyResult.id,
						role: role,
						createdByUserId: session.user.id,
					});

					// Return the full key (only time it's shown)
					return new Response(
						JSON.stringify({
							id: orgApiKeyId,
							apiKeyId: apiKeyResult.id,
							name: apiKeyResult.name,
							key: apiKeyResult.key, // Full key - shown only once!
							prefix: "sk_live_",
							start:
								apiKeyResult.start ||
								`sk_live_${apiKeyResult.key.substring(8, 14)}...`,
							role: role,
							enabled: true,
							createdAt: new Date().toISOString(),
						}),
						{ status: 201, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Error creating API key:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * DELETE /:tenant/api/settings/api-keys
			 * Revoke (delete) an API key.
			 *
			 * Request body:
			 * - keyId: string (required) - The organization API key ID to delete
			 *
			 * The key is immediately revoked and cannot be used again.
			 */
			DELETE: async ({ request, params }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session?.user) {
						return new Response(JSON.stringify({ error: "Unauthorized" }), {
							status: 401,
							headers: { "Content-Type": "application/json" },
						});
					}

					// Get the organization by slug
					const org = await db
						.select({ id: organization.id })
						.from(organization)
						.where(eq(organization.slug, params.tenant))
						.limit(1);

					if (org.length === 0) {
						return new Response(
							JSON.stringify({ error: "Organization not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const orgId = org[0].id;

					// Parse request body
					const body = await request.json();
					const { keyId } = body;

					if (!keyId || typeof keyId !== "string") {
						return new Response(
							JSON.stringify({ error: "keyId is required" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Find the organization API key (scoped to this org)
					const existingKey = await db
						.select({
							id: organizationApiKey.id,
							apiKeyId: organizationApiKey.apiKeyId,
						})
						.from(organizationApiKey)
						.where(
							and(
								eq(organizationApiKey.id, keyId),
								eq(organizationApiKey.organizationId, orgId),
							),
						)
						.limit(1);

					if (existingKey.length === 0) {
						return new Response(
							JSON.stringify({ error: "API key not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const apiKeyId = existingKey[0].apiKeyId;

					// Delete from Better Auth
					try {
						await auth.api.deleteApiKey({
							body: { keyId: apiKeyId },
							headers: request.headers,
						});
					} catch (deleteError) {
						// Log but continue - the org link should still be deleted
						console.error("Error deleting from Better Auth:", deleteError);
					}

					// Delete the organization API key link
					await db
						.delete(organizationApiKey)
						.where(eq(organizationApiKey.id, keyId));

					return new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error deleting API key:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
