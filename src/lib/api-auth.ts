/**
 * Shared API authentication utilities.
 *
 * Provides unified authentication that works with both:
 * - Session-based auth (browser cookies via Better Auth)
 * - API key auth (x-api-key header for server-to-server)
 */

import { auth } from "./auth";
import { db } from "@/db";
import { organization, organizationApiKey } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Authentication result from authenticateRequest.
 */
export interface AuthResult {
	/** Whether the request is authenticated */
	authenticated: boolean;
	/** The organization ID the request is scoped to */
	organizationId?: string;
	/** The user ID (for session auth) or undefined (for API key auth) */
	userId?: string;
	/** The permission role: 'read-only', 'full-access', or 'session' for session auth */
	role?: "read-only" | "full-access" | "session";
	/** Error message if authentication failed */
	error?: string;
}

/**
 * HTTP methods that require write permissions.
 * Used by hasPermission to determine if a method needs write access.
 */
export const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;

/**
 * Authenticate an API request via session OR API key.
 *
 * Checks for session auth first, then falls back to x-api-key header.
 * Returns organization context and permission level.
 *
 * @param request - The incoming HTTP request
 * @param tenantSlug - The tenant slug from the route params
 * @returns Authentication result with org context and permissions
 */
export async function authenticateRequest(
	request: Request,
	tenantSlug: string,
): Promise<AuthResult> {
	// First, try session-based authentication
	try {
		const session = await auth.api.getSession({
			headers: request.headers,
		});

		if (session?.user) {
			// Session auth successful - get org by slug
			const org = await db
				.select({ id: organization.id })
				.from(organization)
				.where(eq(organization.slug, tenantSlug))
				.limit(1);

			if (org.length === 0) {
				return {
					authenticated: false,
					error: "Organization not found",
				};
			}

			return {
				authenticated: true,
				organizationId: org[0].id,
				userId: session.user.id,
				role: "session", // Session auth has full access
			};
		}
	} catch {
		// Session auth failed, continue to API key auth
	}

	// Try API key authentication
	const apiKey = request.headers.get("x-api-key");
	if (!apiKey) {
		return {
			authenticated: false,
			error: "Unauthorized",
		};
	}

	try {
		// Verify the API key with Better Auth
		const verifyResult = await auth.api.verifyApiKey({
			body: { key: apiKey },
		});

		if (!verifyResult?.valid || !verifyResult?.key) {
			return {
				authenticated: false,
				error: "Invalid API key",
			};
		}

		// Look up the organization from our junction table
		const orgApiKey = await db
			.select({
				organizationId: organizationApiKey.organizationId,
				role: organizationApiKey.role,
			})
			.from(organizationApiKey)
			.where(eq(organizationApiKey.apiKeyId, verifyResult.key.id))
			.limit(1);

		if (orgApiKey.length === 0) {
			return {
				authenticated: false,
				error: "API key not associated with an organization",
			};
		}

		// Verify the tenant slug matches the API key's organization
		const org = await db
			.select({ id: organization.id, slug: organization.slug })
			.from(organization)
			.where(
				and(
					eq(organization.id, orgApiKey[0].organizationId),
					eq(organization.slug, tenantSlug),
				),
			)
			.limit(1);

		if (org.length === 0) {
			return {
				authenticated: false,
				error: "API key does not belong to this organization",
			};
		}

		return {
			authenticated: true,
			organizationId: orgApiKey[0].organizationId,
			role: orgApiKey[0].role as "read-only" | "full-access",
		};
	} catch (error) {
		console.error("API key verification error:", error);
		return {
			authenticated: false,
			error: "API key verification failed",
		};
	}
}

/**
 * Check if the authenticated context has permission for an action.
 *
 * @param role - The role from the auth result
 * @param method - The HTTP method being used
 * @returns True if the role has permission for the method
 */
export function hasPermission(
	role: "read-only" | "full-access" | "session" | undefined,
	method: string,
): boolean {
	if (!role) return false;

	// Session auth and full-access have full permissions
	if (role === "session" || role === "full-access") {
		return true;
	}

	// Read-only can only do GET requests
	if (role === "read-only") {
		return method.toUpperCase() === "GET";
	}

	return false;
}

/**
 * Create an unauthorized response.
 *
 * @param error - The error message
 * @returns A 401 Unauthorized Response
 */
export function unauthorizedResponse(error: string = "Unauthorized"): Response {
	return new Response(JSON.stringify({ error }), {
		status: 401,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * Create a forbidden response.
 *
 * @param error - The error message
 * @returns A 403 Forbidden Response
 */
export function forbiddenResponse(
	error: string = "Insufficient permissions",
): Response {
	return new Response(JSON.stringify({ error }), {
		status: 403,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * Create a not found response.
 *
 * @param error - The error message
 * @returns A 404 Not Found Response
 */
export function notFoundResponse(
	error: string = "Organization not found",
): Response {
	return new Response(JSON.stringify({ error }), {
		status: 404,
		headers: { "Content-Type": "application/json" },
	});
}

/**
 * Authenticate and authorize an API request.
 *
 * This is a convenience function that combines authentication and
 * permission checking. Returns the auth result if successful, or
 * an appropriate error Response if not.
 *
 * @param request - The incoming HTTP request
 * @param tenantSlug - The tenant slug from route params
 * @returns Either the successful AuthResult or an error Response
 */
export async function authenticateAndAuthorize(
	request: Request,
	tenantSlug: string,
): Promise<AuthResult | Response> {
	const authResult = await authenticateRequest(request, tenantSlug);

	if (!authResult.authenticated) {
		if (authResult.error === "Organization not found") {
			return notFoundResponse();
		}
		return unauthorizedResponse(authResult.error);
	}

	if (!hasPermission(authResult.role, request.method)) {
		return forbiddenResponse();
	}

	return authResult;
}
