import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import {
	productFamily,
	productPlan,
	productPricing,
	productFeature,
	organization,
} from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const Route = createFileRoute(
	"/$tenant/api/product-catalog/products",
)({
	server: {
		handlers: {
			/**
			 * GET /:tenant/api/product-catalog/products
			 * Fetch all products for the organization with their plans
			 *
			 * Query params:
			 * - status: Filter by status (active, draft, archived)
			 */
			GET: async ({ request, params }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session?.user) {
						return new Response(
							JSON.stringify({ error: "Unauthorized", products: [] }),
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
							JSON.stringify({ error: "Organization not found", products: [] }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const orgId = org[0].id;

					// Parse query params
					const url = new URL(request.url);
					const status = url.searchParams.get("status");

					// Build query conditions for products
					const conditions = [eq(productFamily.organizationId, orgId)];

					if (status && status !== "all") {
						conditions.push(eq(productFamily.status, status));
					}

					// Fetch products (productFamily table)
					const products = await db
						.select({
							id: productFamily.id,
							name: productFamily.name,
							description: productFamily.description,
							status: productFamily.status,
							createdAt: productFamily.createdAt,
							updatedAt: productFamily.updatedAt,
						})
						.from(productFamily)
						.where(and(...conditions))
						.orderBy(desc(productFamily.createdAt));

					// Fetch plans for all products
					const productIds = products.map((p) => p.id);
					type PlanResult = {
						id: string;
						productFamilyId: string | null;
						name: string;
						description: string | null;
						status: string;
						pricingModel: string;
						createdAt: Date;
						updatedAt: Date;
					};
					let allPlans: PlanResult[] = [];

					if (productIds.length > 0) {
						const planPromises = productIds.map((productId) =>
							db
								.select({
									id: productPlan.id,
									productFamilyId: productPlan.productFamilyId,
									name: productPlan.name,
									description: productPlan.description,
									status: productPlan.status,
									pricingModel: productPlan.pricingModel,
									createdAt: productPlan.createdAt,
									updatedAt: productPlan.updatedAt,
								})
								.from(productPlan)
								.where(eq(productPlan.productFamilyId, productId))
								.orderBy(asc(productPlan.name)),
						);
						const planResults = await Promise.all(planPromises);
						allPlans = planResults.flat();
					}

					// Fetch pricing for all plans
					const planIds = allPlans.map((p) => p.id);
					type PricingResult = {
						id: string;
						productPlanId: string;
						pricingType: string;
						region: string | null;
						currency: string;
						amount: number;
						interval: string | null;
						perSeatAmount: number | null;
					};
					let allPricing: PricingResult[] = [];

					if (planIds.length > 0) {
						const pricingPromises = planIds.map((planId) =>
							db
								.select({
									id: productPricing.id,
									productPlanId: productPricing.productPlanId,
									pricingType: productPricing.pricingType,
									region: productPricing.region,
									currency: productPricing.currency,
									amount: productPricing.amount,
									interval: productPricing.interval,
									perSeatAmount: productPricing.perSeatAmount,
								})
								.from(productPricing)
								.where(eq(productPricing.productPlanId, planId)),
						);
						const pricingResults = await Promise.all(pricingPromises);
						allPricing = pricingResults.flat();
					}

					// Fetch features for all plans
					type FeatureResult = {
						id: string;
						productPlanId: string;
						name: string;
						order: number;
					};
					let allFeatures: FeatureResult[] = [];

					if (planIds.length > 0) {
						const featurePromises = planIds.map((planId) =>
							db
								.select({
									id: productFeature.id,
									productPlanId: productFeature.productPlanId,
									name: productFeature.name,
									order: productFeature.order,
								})
								.from(productFeature)
								.where(eq(productFeature.productPlanId, planId))
								.orderBy(asc(productFeature.order)),
						);
						const featureResults = await Promise.all(featurePromises);
						allFeatures = featureResults.flat();
					}

					// Group plans, pricing, features by product
					const plansByProduct = new Map<string, typeof allPlans>();
					const pricingByPlan = new Map<string, typeof allPricing>();
					const featuresByPlan = new Map<string, typeof allFeatures>();

					for (const plan of allPlans) {
						if (plan.productFamilyId) {
							const existing = plansByProduct.get(plan.productFamilyId) || [];
							existing.push(plan);
							plansByProduct.set(plan.productFamilyId, existing);
						}
					}

					for (const pricing of allPricing) {
						const existing = pricingByPlan.get(pricing.productPlanId) || [];
						existing.push(pricing);
						pricingByPlan.set(pricing.productPlanId, existing);
					}

					for (const feature of allFeatures) {
						const existing = featuresByPlan.get(feature.productPlanId) || [];
						existing.push(feature);
						featuresByPlan.set(feature.productPlanId, existing);
					}

					// Format response
					const response = products.map((product) => {
						const productPlans = plansByProduct.get(product.id) || [];

						const formattedPlans = productPlans.map((plan) => {
							const planPricing = pricingByPlan.get(plan.id) || [];
							const planFeatures = featuresByPlan.get(plan.id) || [];

							// Find base pricing
							const basePricing =
								planPricing.find(
									(p) => p.pricingType === "base" && p.interval === "monthly",
								) ||
								planPricing.find((p) => p.pricingType === "base") ||
								planPricing[0];

							// Get regional pricing
							const regionalPricing = planPricing
								.filter((p) => p.pricingType === "regional" && p.region)
								.map((p) => ({
									region: p.region ?? "",
									currency: p.currency,
									amount: p.amount / 100,
								}));

							return {
								id: plan.id,
								name: plan.name,
								description: plan.description || "",
								status: plan.status,
								pricingModel: plan.pricingModel,
								basePrice: basePricing
									? {
											amount: basePricing.amount / 100,
											currency: basePricing.currency,
											interval:
												(basePricing.interval as "monthly" | "yearly") ||
												"monthly",
											perSeatAmount: basePricing.perSeatAmount
												? basePricing.perSeatAmount / 100
												: undefined,
										}
									: {
											amount: 0,
											currency: "USD",
											interval: "monthly" as const,
										},
								regionalPricing,
								features: planFeatures.map((f) => f.name),
								createdAt: plan.createdAt,
								updatedAt: plan.updatedAt,
							};
						});

						return {
							id: product.id,
							name: product.name,
							description: product.description || "",
							status: product.status,
							plans: formattedPlans,
							createdAt: product.createdAt,
							updatedAt: product.updatedAt,
						};
					});

					return new Response(JSON.stringify({ products: response }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error fetching products:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error", products: [] }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * POST /:tenant/api/product-catalog/products
			 * Create a new product
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
					const { name, description, status } = body as {
						name: string;
						description?: string;
						status?: "active" | "draft" | "archived";
					};

					if (!name) {
						return new Response(JSON.stringify({ error: "Name is required" }), {
							status: 400,
							headers: { "Content-Type": "application/json" },
						});
					}

					const now = new Date();
					const productId = crypto
						.randomUUID()
						.replace(/-/g, "")
						.substring(0, 24);

					// Create product (in productFamily table)
					await db.insert(productFamily).values({
						id: productId,
						organizationId: orgId,
						name,
						description: description || null,
						status: status || "draft",
						createdAt: now,
						updatedAt: now,
					});

					return new Response(
						JSON.stringify({
							success: true,
							product: {
								id: productId,
								name,
								description: description || "",
								status: status || "draft",
								plans: [],
								createdAt: now,
								updatedAt: now,
							},
						}),
						{ status: 201, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Error creating product:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * PUT /:tenant/api/product-catalog/products
			 * Update an existing product (id in body)
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

					// Parse request body
					const body = await request.json();
					const { id, name, description, status } = body as {
						id: string;
						name?: string;
						description?: string;
						status?: "active" | "draft" | "archived";
					};

					if (!id) {
						return new Response(
							JSON.stringify({ error: "Product ID is required" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Check product exists and belongs to org
					const existing = await db
						.select()
						.from(productFamily)
						.where(
							and(
								eq(productFamily.id, id),
								eq(productFamily.organizationId, orgId),
							),
						)
						.limit(1);

					if (existing.length === 0) {
						return new Response(
							JSON.stringify({ error: "Product not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const now = new Date();

					// Update product fields
					const updateData: Record<string, unknown> = {
						updatedAt: now,
					};

					if (name !== undefined) updateData.name = name;
					if (description !== undefined) updateData.description = description;
					if (status !== undefined) updateData.status = status;

					await db
						.update(productFamily)
						.set(updateData)
						.where(eq(productFamily.id, id));

					return new Response(JSON.stringify({ success: true, id }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error updating product:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * DELETE /:tenant/api/product-catalog/products
			 * Delete a product (id in query param)
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

					// Get product ID from query params
					const url = new URL(request.url);
					const id = url.searchParams.get("id");

					if (!id) {
						return new Response(
							JSON.stringify({ error: "Product ID is required" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Check product exists and belongs to org
					const existing = await db
						.select({ id: productFamily.id })
						.from(productFamily)
						.where(
							and(
								eq(productFamily.id, id),
								eq(productFamily.organizationId, orgId),
							),
						)
						.limit(1);

					if (existing.length === 0) {
						return new Response(
							JSON.stringify({ error: "Product not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					// Delete the product (plans will have productFamilyId set to null due to onDelete: 'set null')
					await db.delete(productFamily).where(eq(productFamily.id, id));

					return new Response(JSON.stringify({ success: true, id }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error deleting product:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
