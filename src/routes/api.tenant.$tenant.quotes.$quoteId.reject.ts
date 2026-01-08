/**
 * Quote Reject API Route
 *
 * Provides endpoint for rejecting a quote:
 * - POST /api/tenant/:tenant/quotes/:quoteId/reject - Mark quote as rejected
 *
 * This endpoint:
 * - Validates the quote is in 'sent' status
 * - Updates status to 'rejected' with timestamp
 *
 * Requires authentication and organization membership.
 *
 * @module api/quotes/reject
 */

import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { quote, organization } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const Route = createFileRoute(
	"/api/tenant/$tenant/quotes/$quoteId/reject",
)({
	server: {
		handlers: {
			/**
			 * POST /api/tenant/:tenant/quotes/:quoteId/reject
			 * Mark a quote as rejected by the customer
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

					// Fetch the quote
					const quoteData = await db
						.select({
							id: quote.id,
							quoteNumber: quote.quoteNumber,
							status: quote.status,
						})
						.from(quote)
						.where(
							and(
								eq(quote.id, params.quoteId),
								eq(quote.organizationId, orgId),
							),
						)
						.limit(1);

					if (quoteData.length === 0) {
						return new Response(JSON.stringify({ error: "Quote not found" }), {
							status: 404,
							headers: { "Content-Type": "application/json" },
						});
					}

					const q = quoteData[0];

					// Only allow rejecting sent quotes
					if (q.status !== "sent") {
						return new Response(
							JSON.stringify({ error: "Only sent quotes can be rejected" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					const now = new Date();

					// Update quote status to rejected
					await db
						.update(quote)
						.set({
							status: "rejected",
							rejectedAt: now,
							updatedAt: now,
						})
						.where(eq(quote.id, q.id));

					return new Response(
						JSON.stringify({
							success: true,
							quote: {
								id: q.id,
								quoteNumber: q.quoteNumber,
								status: "rejected",
								rejectedAt: now.toISOString(),
							},
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Error rejecting quote:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
