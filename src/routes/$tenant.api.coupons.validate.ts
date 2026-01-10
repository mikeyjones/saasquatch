import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { coupon, organization } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/$tenant/api/coupons/validate")({
	server: {
		handlers: {
			/**
			 * POST /:tenant/api/coupons/validate
			 * Validate a coupon code for use
			 * Body:
			 * - code (required) - The coupon code to validate
			 * - planId (optional) - The plan ID to check if coupon applies
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
					const { code, planId } = body as {
						code: string;
						planId?: string;
					};

					if (!code || !code.trim()) {
						return new Response(
							JSON.stringify({
								valid: false,
								error: "Coupon code is required",
							}),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Find coupon by code
					const result = await db
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
						})
						.from(coupon)
						.where(
							and(
								eq(coupon.organizationId, orgId),
								eq(coupon.code, code.toUpperCase().trim()),
							),
						)
						.limit(1);

					if (result.length === 0) {
						return new Response(
							JSON.stringify({
								valid: false,
								error: "Coupon code not found",
							}),
							{ status: 200, headers: { "Content-Type": "application/json" } },
						);
					}

					const c = result[0];

					// Check if coupon is disabled
					if (c.status === "disabled") {
						return new Response(
							JSON.stringify({
								valid: false,
								error: "This coupon is no longer active",
							}),
							{ status: 200, headers: { "Content-Type": "application/json" } },
						);
					}

					// Check if coupon is expired by date
					if (c.expiresAt && new Date(c.expiresAt) < new Date()) {
						return new Response(
							JSON.stringify({
								valid: false,
								error: "This coupon has expired",
							}),
							{ status: 200, headers: { "Content-Type": "application/json" } },
						);
					}

					// Check if max redemptions reached
					if (c.maxRedemptions && c.redemptionCount >= c.maxRedemptions) {
						return new Response(
							JSON.stringify({
								valid: false,
								error:
									"This coupon has reached its maximum number of redemptions",
							}),
							{ status: 200, headers: { "Content-Type": "application/json" } },
						);
					}

					// Check if coupon applies to the specified plan
					if (planId && c.applicablePlanIds) {
						const planIds: string[] = JSON.parse(c.applicablePlanIds);
						if (!planIds.includes(planId)) {
							return new Response(
								JSON.stringify({
									valid: false,
									error: "This coupon does not apply to the selected plan",
								}),
								{
									status: 200,
									headers: { "Content-Type": "application/json" },
								},
							);
						}
					}

					// Coupon is valid!
					return new Response(
						JSON.stringify({
							valid: true,
							coupon: {
								id: c.id,
								code: c.code,
								discountType: c.discountType,
								discountValue: c.discountValue,
								applicablePlanIds: c.applicablePlanIds
									? JSON.parse(c.applicablePlanIds)
									: null,
							},
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Error validating coupon:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
