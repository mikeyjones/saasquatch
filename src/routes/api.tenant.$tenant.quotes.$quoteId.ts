/**
 * Single Quote API Routes
 *
 * Provides REST endpoints for managing individual quotes:
 * - GET /api/tenant/:tenant/quotes/:quoteId - Get quote details
 * - PUT /api/tenant/:tenant/quotes/:quoteId - Update a draft quote
 * - DELETE /api/tenant/:tenant/quotes/:quoteId - Delete a draft quote
 *
 * All endpoints require authentication and organization membership.
 * Only draft quotes can be modified or deleted.
 *
 * @module api/quotes/quoteId
 */

import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import {
	quote,
	tenantOrganization,
	deal,
	productPlan,
	organization,
	invoice,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { QuoteLineItem } from "@/data/quotes";

/**
 * Validates a line item to ensure all required fields are present and values are valid.
 *
 * Checks:
 * - Description is a non-empty string
 * - Quantity is a positive number (> 0)
 * - Unit price is a non-negative number (>= 0)
 * - Total is a non-negative number (>= 0)
 * - Total matches quantity × unitPrice (within 1 cent tolerance)
 *
 * @param item - The line item to validate
 * @returns Error message if validation fails, null if valid
 */
export function validateLineItem(item: QuoteLineItem): string | null {
	// Check required fields exist
	if (
		!item.description ||
		typeof item.description !== "string" ||
		item.description.trim().length === 0
	) {
		return "Line item description is required and must be a non-empty string";
	}

	if (typeof item.quantity !== "number" || isNaN(item.quantity)) {
		return "Line item quantity must be a valid number";
	}

	if (typeof item.unitPrice !== "number" || isNaN(item.unitPrice)) {
		return "Line item unit price must be a valid number";
	}

	if (typeof item.total !== "number" || isNaN(item.total)) {
		return "Line item total must be a valid number";
	}

	// Validate quantity is positive
	if (item.quantity <= 0) {
		return "Line item quantity must be greater than 0";
	}

	// Validate unit price is non-negative
	if (item.unitPrice < 0) {
		return "Line item unit price must be non-negative";
	}

	// Validate total is non-negative
	if (item.total < 0) {
		return "Line item total must be non-negative";
	}

	// Validate total matches quantity * unitPrice (with small tolerance for floating point)
	const expectedTotal = item.quantity * item.unitPrice;
	const tolerance = 0.01; // Allow 1 cent tolerance for rounding
	if (Math.abs(item.total - expectedTotal) > tolerance) {
		return `Line item total (${item.total}) does not match quantity × unit price (${item.quantity} × ${item.unitPrice} = ${expectedTotal})`;
	}

	return null;
}

export const Route = createFileRoute("/api/tenant/$tenant/quotes/$quoteId")({
	server: {
		handlers: {
			/**
			 * GET /api/tenant/:tenant/quotes/:quoteId
			 * Get a single quote by ID
			 */
			GET: async ({ request, params }) => {
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

					// Fetch quote with related data
					const quoteData = await db
						.select({
							id: quote.id,
							quoteNumber: quote.quoteNumber,
							status: quote.status,
							version: quote.version,
							parentQuoteId: quote.parentQuoteId,
							subtotal: quote.subtotal,
							tax: quote.tax,
							total: quote.total,
							currency: quote.currency,
							validUntil: quote.validUntil,
							lineItems: quote.lineItems,
							pdfPath: quote.pdfPath,
							billingName: quote.billingName,
							billingEmail: quote.billingEmail,
							billingAddress: quote.billingAddress,
							notes: quote.notes,
							sentAt: quote.sentAt,
							acceptedAt: quote.acceptedAt,
							rejectedAt: quote.rejectedAt,
							createdAt: quote.createdAt,
							updatedAt: quote.updatedAt,
							// Tenant organization info
							tenantOrgId: tenantOrganization.id,
							tenantOrgName: tenantOrganization.name,
							// Deal info (nullable)
							dealId: deal.id,
							dealName: deal.name,
							// Product plan info (nullable)
							planId: productPlan.id,
							planName: productPlan.name,
							// Converted invoice info (nullable)
							invoiceId: invoice.id,
							invoiceNumber: invoice.invoiceNumber,
						})
						.from(quote)
						.innerJoin(
							tenantOrganization,
							eq(quote.tenantOrganizationId, tenantOrganization.id),
						)
						.leftJoin(deal, eq(quote.dealId, deal.id))
						.leftJoin(productPlan, eq(quote.productPlanId, productPlan.id))
						.leftJoin(invoice, eq(quote.convertedToInvoiceId, invoice.id))
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

					// Parse line items with error handling for malformed JSON
					let parsedLineItems: QuoteLineItem[];
					try {
						parsedLineItems = JSON.parse(q.lineItems) as QuoteLineItem[];
					} catch (parseError) {
						console.error(
							`Invalid lineItems JSON for quote ${q.id}:`,
							parseError,
						);
						// Return empty array as fallback for corrupted data
						parsedLineItems = [];
					}

					return new Response(
						JSON.stringify({
							quote: {
								id: q.id,
								quoteNumber: q.quoteNumber,
								status: q.status,
								version: q.version,
								parentQuoteId: q.parentQuoteId,
								subtotal: q.subtotal,
								tax: q.tax,
								total: q.total,
								currency: q.currency,
								validUntil: q.validUntil?.toISOString() || null,
								lineItems: parsedLineItems,
								pdfPath: q.pdfPath,
								billingName: q.billingName,
								billingEmail: q.billingEmail,
								billingAddress: q.billingAddress,
								notes: q.notes,
								sentAt: q.sentAt?.toISOString() || null,
								acceptedAt: q.acceptedAt?.toISOString() || null,
								rejectedAt: q.rejectedAt?.toISOString() || null,
								tenantOrganization: {
									id: q.tenantOrgId,
									name: q.tenantOrgName,
								},
								deal: q.dealId
									? {
											id: q.dealId,
											name: q.dealName,
										}
									: null,
								productPlan: q.planId
									? {
											id: q.planId,
											name: q.planName,
										}
									: null,
								convertedInvoice: q.invoiceId
									? {
											id: q.invoiceId,
											invoiceNumber: q.invoiceNumber,
										}
									: null,
								createdAt: q.createdAt.toISOString(),
								updatedAt: q.updatedAt.toISOString(),
							},
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Error fetching quote:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * PUT /api/tenant/:tenant/quotes/:quoteId
			 * Update a quote
			 */
			PUT: async ({ request, params }) => {
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

					// Verify quote exists and belongs to organization
					const existingQuote = await db
						.select({
							id: quote.id,
							status: quote.status,
							subtotal: quote.subtotal,
						})
						.from(quote)
						.where(
							and(
								eq(quote.id, params.quoteId),
								eq(quote.organizationId, orgId),
							),
						)
						.limit(1);

					if (existingQuote.length === 0) {
						return new Response(JSON.stringify({ error: "Quote not found" }), {
							status: 404,
							headers: { "Content-Type": "application/json" },
						});
					}

					// Only allow editing draft quotes (per documented behavior)
					if (existingQuote[0].status !== "draft") {
						return new Response(
							JSON.stringify({ error: "Only draft quotes can be updated" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Parse request body
					const body = await request.json();
					const { lineItems, dealId, productPlanId, validUntil, tax, notes } =
						body as {
							lineItems?: QuoteLineItem[];
							dealId?: string | null;
							productPlanId?: string | null;
							validUntil?: string | null;
							tax?: number;
							notes?: string | null;
						};

					// Build update object
					const updates: Partial<typeof quote.$inferInsert> = {
						updatedAt: new Date(),
					};

					if (lineItems !== undefined) {
						// Validate line items
						if (!Array.isArray(lineItems) || lineItems.length === 0) {
							return new Response(
								JSON.stringify({ error: "At least one line item is required" }),
								{
									status: 400,
									headers: { "Content-Type": "application/json" },
								},
							);
						}

						// Validate each line item
						for (let i = 0; i < lineItems.length; i++) {
							const item = lineItems[i];
							const validationError = validateLineItem(item);
							if (validationError) {
								return new Response(
									JSON.stringify({
										error: `Line item ${i + 1}: ${validationError}`,
									}),
									{
										status: 400,
										headers: { "Content-Type": "application/json" },
									},
								);
							}
						}

						// Recalculate totals server-side (don't trust client-provided totals)
						// Recalculate each line item total from quantity × unitPrice
						const recalculatedLineItems = lineItems.map((item) => ({
							...item,
							total: item.quantity * item.unitPrice,
						}));

						// Calculate subtotal from recalculated line items
						const subtotal = recalculatedLineItems.reduce(
							(sum, item) => sum + item.total,
							0,
						);
						// Use provided tax or default to 0 (if tax not provided, assume 0 for recalculation)
						const taxAmount = tax ?? 0;
						const total = subtotal + taxAmount;

						updates.lineItems = JSON.stringify(recalculatedLineItems);
						updates.subtotal = subtotal;
						updates.tax = taxAmount;
						updates.total = total;
					} else if (tax !== undefined) {
						// Update tax only
						const currentQuote = await db
							.select({ subtotal: quote.subtotal })
							.from(quote)
							.where(eq(quote.id, params.quoteId))
							.limit(1);
						const total = (currentQuote[0]?.subtotal || 0) + tax;
						updates.tax = tax;
						updates.total = total;
					}

					if (dealId !== undefined) {
						if (dealId) {
							// Validate deal exists
							const dealExists = await db
								.select({ id: deal.id })
								.from(deal)
								.where(and(eq(deal.id, dealId), eq(deal.organizationId, orgId)))
								.limit(1);

							if (dealExists.length === 0) {
								return new Response(
									JSON.stringify({ error: "Deal not found" }),
									{
										status: 404,
										headers: { "Content-Type": "application/json" },
									},
								);
							}
						}
						updates.dealId = dealId || null;
					}

					if (productPlanId !== undefined) {
						if (productPlanId) {
							// Validate product plan exists
							const planExists = await db
								.select({ id: productPlan.id })
								.from(productPlan)
								.where(
									and(
										eq(productPlan.id, productPlanId),
										eq(productPlan.organizationId, orgId),
									),
								)
								.limit(1);

							if (planExists.length === 0) {
								return new Response(
									JSON.stringify({ error: "Product plan not found" }),
									{
										status: 404,
										headers: { "Content-Type": "application/json" },
									},
								);
							}
						}
						updates.productPlanId = productPlanId || null;
					}

					if (validUntil !== undefined) {
						updates.validUntil = validUntil ? new Date(validUntil) : null;
					}

					if (notes !== undefined) {
						updates.notes = notes || null;
					}

					// Update quote
					await db
						.update(quote)
						.set(updates)
						.where(eq(quote.id, params.quoteId));

					return new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error updating quote:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * DELETE /api/tenant/:tenant/quotes/:quoteId
			 * Delete a quote (only if draft or rejected)
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

					// Verify quote exists and belongs to organization
					const existingQuote = await db
						.select({ id: quote.id, status: quote.status })
						.from(quote)
						.where(
							and(
								eq(quote.id, params.quoteId),
								eq(quote.organizationId, orgId),
							),
						)
						.limit(1);

					if (existingQuote.length === 0) {
						return new Response(JSON.stringify({ error: "Quote not found" }), {
							status: 404,
							headers: { "Content-Type": "application/json" },
						});
					}

					// Only allow deletion of draft or rejected quotes
					if (
						existingQuote[0].status !== "draft" &&
						existingQuote[0].status !== "rejected"
					) {
						return new Response(
							JSON.stringify({
								error: "Can only delete draft or rejected quotes",
							}),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Delete quote
					await db.delete(quote).where(eq(quote.id, params.quoteId));

					return new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error deleting quote:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
