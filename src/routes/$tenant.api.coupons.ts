import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { coupon, productPlan, organization } from "@/db/schema";
import { eq, and, desc, or } from "drizzle-orm";
import { auth } from "@/lib/auth";

function generateId(): string {
	return crypto.randomUUID().replace(/-/g, "").substring(0, 24);
}

/**
 * Generate a unique coupon code
 */
function generateCouponCode(): string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let code = "";
	for (let i = 0; i < 8; i++) {
		code += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return code;
}

export const Route = createFileRoute("/$tenant/api/coupons")({
	server: {
		handlers: {
			/**
			 * GET /:tenant/api/coupons
			 * Fetch all coupons for the organization
			 * Query params:
			 * - status: Filter by status (active, expired, disabled)
			 */
			GET: async ({ request, params }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session) {
						return new Response(JSON.stringify({ error: "Unauthorized" }), {
							status: 401,
							headers: { "Content-Type": "application/json" },
						});
					}

					const { tenant } = params;

					// Get organization
					const org = await db
						.select({ id: organization.id })
						.from(organization)
						.where(eq(organization.slug, tenant))
						.limit(1);

					if (org.length === 0) {
						return new Response(
							JSON.stringify({ error: "Organization not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const orgId = org[0].id;

					// Parse query params
					const url = new URL(request.url);
					const statusFilter = url.searchParams.get("status") || "";

					// Get all coupons for this organization
					const coupons = await db
						.select({
							id: coupon.id,
							code: coupon.code,
							discountType: coupon.discountType,
							discountValue: coupon.discountValue,
							applicablePlanIds: coupon.applicablePlanIds,
							maxRedemptions: coupon.maxRedemptions,
							redemptionCount: coupon.redemptionCount,
							status: coupon.status,
							expiresAt: coupon.expiresAt,
							createdAt: coupon.createdAt,
						})
						.from(coupon)
						.where(eq(coupon.organizationId, orgId))
						.orderBy(desc(coupon.createdAt));

					// Filter by status
					let filteredCoupons = coupons.map((c) => {
						// Determine actual status
						let actualStatus = c.status;
						if (
							c.status === "active" &&
							c.expiresAt &&
							new Date(c.expiresAt) < new Date()
						) {
							actualStatus = "expired";
						}
						if (
							c.status === "active" &&
							c.maxRedemptions &&
							c.redemptionCount >= c.maxRedemptions
						) {
							actualStatus = "expired";
						}

						return {
							...c,
							actualStatus,
							applicablePlanIds: c.applicablePlanIds
								? JSON.parse(c.applicablePlanIds)
								: null,
							expiresAt: c.expiresAt?.toISOString() || null,
							createdAt: c.createdAt.toISOString(),
						};
					});

					if (statusFilter) {
						filteredCoupons = filteredCoupons.filter(
							(c) => c.actualStatus === statusFilter,
						);
					}

					return new Response(JSON.stringify({ coupons: filteredCoupons }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error fetching coupons:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error", coupons: [] }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * POST /:tenant/api/coupons
			 * Create a new coupon
			 * Body:
			 * - code (optional) - Auto-generated if not provided
			 * - discountType (required) - percentage, fixed_amount, free_months, trial_extension
			 * - discountValue (required) - Percentage (0-100), cents for fixed_amount, or months
			 * - applicablePlanIds (optional) - Array of plan IDs, null = all plans
			 * - maxRedemptions (optional) - Max number of times this can be used
			 * - expiresAt (optional) - ISO date string
			 */
			POST: async ({ request, params }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session) {
						return new Response(JSON.stringify({ error: "Unauthorized" }), {
							status: 401,
							headers: { "Content-Type": "application/json" },
						});
					}

					const { tenant } = params;

					// Get organization
					const org = await db
						.select({ id: organization.id })
						.from(organization)
						.where(eq(organization.slug, tenant))
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
					const {
						code: providedCode,
						discountType,
						discountValue,
						applicablePlanIds,
						maxRedemptions,
						expiresAt,
					} = body as {
						code?: string;
						discountType: string;
						discountValue: number;
						applicablePlanIds?: string[] | null;
						maxRedemptions?: number | null;
						expiresAt?: string | null;
					};

					// Validate required fields
					if (
						!discountType ||
						![
							"percentage",
							"fixed_amount",
							"free_months",
							"trial_extension",
						].includes(discountType)
					) {
						return new Response(
							JSON.stringify({ error: "Invalid discount type" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					if (
						discountValue === undefined ||
						discountValue === null ||
						discountValue < 0
					) {
						return new Response(
							JSON.stringify({ error: "Invalid discount value" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					if (
						discountType === "percentage" &&
						(discountValue < 0 || discountValue > 100)
					) {
						return new Response(
							JSON.stringify({
								error: "Percentage discount must be between 0 and 100",
							}),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Generate or validate coupon code
					let code = providedCode?.toUpperCase().trim();
					if (!code) {
						// Generate unique code
						let attempts = 0;
						let generatedCode: string | null = null;
						while (attempts < 10) {
							generatedCode = generateCouponCode();
							const existing = await db
								.select({ id: coupon.id })
								.from(coupon)
								.where(
									and(
										eq(coupon.organizationId, orgId),
										eq(coupon.code, generatedCode),
									),
								)
								.limit(1);

							if (existing.length === 0) {
								code = generatedCode;
								break;
							}
							attempts++;
						}
						if (!code) {
							return new Response(
								JSON.stringify({
									error: "Failed to generate unique coupon code",
								}),
								{
									status: 500,
									headers: { "Content-Type": "application/json" },
								},
							);
						}
					} else {
						// Check if code already exists
						const existing = await db
							.select({ id: coupon.id })
							.from(coupon)
							.where(
								and(eq(coupon.organizationId, orgId), eq(coupon.code, code)),
							)
							.limit(1);

						if (existing.length > 0) {
							return new Response(
								JSON.stringify({ error: "Coupon code already exists" }),
								{
									status: 400,
									headers: { "Content-Type": "application/json" },
								},
							);
						}
					}

					// Validate plan IDs if provided
					if (applicablePlanIds && applicablePlanIds.length > 0) {
						const plans = await db
							.select({ id: productPlan.id })
							.from(productPlan)
							.where(
								and(
									eq(productPlan.organizationId, orgId),
									or(...applicablePlanIds.map((id) => eq(productPlan.id, id))),
								),
							);

						if (plans.length !== applicablePlanIds.length) {
							return new Response(
								JSON.stringify({ error: "One or more plan IDs are invalid" }),
								{
									status: 400,
									headers: { "Content-Type": "application/json" },
								},
							);
						}
					}

					const now = new Date();
					const couponId = generateId();

					// Create coupon
					await db.insert(coupon).values({
						id: couponId,
						organizationId: orgId,
						code: code,
						discountType,
						discountValue,
						applicablePlanIds:
							applicablePlanIds && applicablePlanIds.length > 0
								? JSON.stringify(applicablePlanIds)
								: null,
						maxRedemptions: maxRedemptions || null,
						redemptionCount: 0,
						status: "active",
						expiresAt: expiresAt ? new Date(expiresAt) : null,
						createdAt: now,
						updatedAt: now,
					});

					// Fetch the created coupon
					const created = await db
						.select({
							id: coupon.id,
							code: coupon.code,
							discountType: coupon.discountType,
							discountValue: coupon.discountValue,
							applicablePlanIds: coupon.applicablePlanIds,
							maxRedemptions: coupon.maxRedemptions,
							redemptionCount: coupon.redemptionCount,
							status: coupon.status,
							expiresAt: coupon.expiresAt,
							createdAt: coupon.createdAt,
						})
						.from(coupon)
						.where(eq(coupon.id, couponId))
						.limit(1);

					const result = {
						...created[0],
						applicablePlanIds: created[0].applicablePlanIds
							? JSON.parse(created[0].applicablePlanIds)
							: null,
						expiresAt: created[0].expiresAt?.toISOString() || null,
						createdAt: created[0].createdAt.toISOString(),
					};

					return new Response(JSON.stringify({ coupon: result }), {
						status: 201,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error creating coupon:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
