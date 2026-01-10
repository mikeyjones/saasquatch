import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import {
	pipeline,
	pipelineStage,
	tenantOrganization,
	organization,
} from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/$tenant/api/pipelines")({
	server: {
		handlers: {
			/**
			 * GET /:tenant/api/pipelines
			 * Fetch all pipelines for the tenant organization with their stages
			 */
			GET: async ({ request, params }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session?.user) {
						return new Response(
							JSON.stringify({ error: "Unauthorized", pipelines: [] }),
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
								pipelines: [],
							}),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const orgId = org[0].id;

					// Parse query params
					const url = new URL(request.url);
					const tenantOrgSlug = url.searchParams.get("tenantOrg");

					// Get tenant organizations for this staff org
					let tenantOrgConditions = eq(
						tenantOrganization.organizationId,
						orgId,
					);

					// Optionally filter by tenant org slug
					if (tenantOrgSlug) {
						const condition = and(
							eq(tenantOrganization.organizationId, orgId),
							eq(tenantOrganization.slug, tenantOrgSlug),
						);
						if (condition) {
							tenantOrgConditions = condition;
						}
					}

					// Get tenant orgs
					const tenantOrgs = await db
						.select({
							id: tenantOrganization.id,
							name: tenantOrganization.name,
							slug: tenantOrganization.slug,
						})
						.from(tenantOrganization)
						.where(tenantOrgConditions);

					if (tenantOrgs.length === 0) {
						return new Response(JSON.stringify({ pipelines: [] }), {
							status: 200,
							headers: { "Content-Type": "application/json" },
						});
					}

					const tenantOrgIds = tenantOrgs.map((t) => t.id);

					// Get all pipelines for these tenant orgs
					const pipelines = await db
						.select({
							id: pipeline.id,
							tenantOrganizationId: pipeline.tenantOrganizationId,
							name: pipeline.name,
							description: pipeline.description,
							isDefault: pipeline.isDefault,
							createdAt: pipeline.createdAt,
						})
						.from(pipeline)
						.where(
							tenantOrgIds.length === 1
								? eq(pipeline.tenantOrganizationId, tenantOrgIds[0])
								: undefined,
						);

					// Get stages for each pipeline
					const pipelineIds = pipelines.map((p) => p.id);
					const stages =
						pipelineIds.length > 0
							? await db
									.select({
										id: pipelineStage.id,
										pipelineId: pipelineStage.pipelineId,
										name: pipelineStage.name,
										order: pipelineStage.order,
										color: pipelineStage.color,
									})
									.from(pipelineStage)
									.orderBy(asc(pipelineStage.order))
							: [];

					// Build response with stages grouped by pipeline
					const response = pipelines.map((p) => {
						const tenantOrg = tenantOrgs.find(
							(t) => t.id === p.tenantOrganizationId,
						);
						const pipelineStages = stages
							.filter((s) => s.pipelineId === p.id)
							.sort((a, b) => a.order - b.order);

						return {
							id: p.id,
							name: p.name,
							description: p.description,
							isDefault: p.isDefault,
							tenantOrganization: tenantOrg
								? {
										id: tenantOrg.id,
										name: tenantOrg.name,
										slug: tenantOrg.slug,
									}
								: null,
							stages: pipelineStages.map((s) => ({
								id: s.id,
								name: s.name,
								order: s.order,
								color: s.color,
							})),
							createdAt: p.createdAt,
						};
					});

					return new Response(JSON.stringify({ pipelines: response }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error fetching pipelines:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error", pipelines: [] }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
