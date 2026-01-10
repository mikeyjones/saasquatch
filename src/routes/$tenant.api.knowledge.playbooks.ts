import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { playbook, organization, user } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/$tenant/api/knowledge/playbooks")(
	{
		server: {
			handlers: {
				/**
				 * GET /:tenant/api/knowledge/playbooks
				 * Fetch all playbooks for the organization
				 *
				 * Query params:
				 * - type: Filter by type (manual, automated)
				 * - status: Filter by status (draft, active, inactive)
				 * - category: Filter by category
				 */
				GET: async ({ request, params }) => {
					try {
						const session = await auth.api.getSession({
							headers: request.headers,
						});

						if (!session?.user) {
							return new Response(
								JSON.stringify({ error: "Unauthorized", playbooks: [] }),
								{
									status: 401,
									headers: { "Content-Type": "application/json" },
								},
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
									playbooks: [],
								}),
								{
									status: 404,
									headers: { "Content-Type": "application/json" },
								},
							);
						}

						const orgId = org[0].id;

						// Parse query params
						const url = new URL(request.url);
						const type = url.searchParams.get("type");
						const status = url.searchParams.get("status");
						const category = url.searchParams.get("category");

						// Build query conditions
						const conditions = [eq(playbook.organizationId, orgId)];

						if (type && type !== "all") {
							conditions.push(eq(playbook.type, type));
						}

						if (status && status !== "all") {
							conditions.push(eq(playbook.status, status));
						}

						if (category && category !== "all") {
							conditions.push(eq(playbook.category, category));
						}

						// Fetch playbooks
						const playbooks = await db
							.select({
								id: playbook.id,
								name: playbook.name,
								description: playbook.description,
								type: playbook.type,
								steps: playbook.steps,
								triggers: playbook.triggers,
								actions: playbook.actions,
								category: playbook.category,
								tags: playbook.tags,
								status: playbook.status,
								createdAt: playbook.createdAt,
								updatedAt: playbook.updatedAt,
								createdByUserId: playbook.createdByUserId,
								updatedByUserId: playbook.updatedByUserId,
							})
							.from(playbook)
							.where(and(...conditions))
							.orderBy(desc(playbook.updatedAt));

						// Get author names
						const userIds = [
							...new Set(
								playbooks
									.flatMap((p) => [p.createdByUserId, p.updatedByUserId])
									.filter(Boolean),
							),
						] as string[];

						const users =
							userIds.length > 0
								? await db
										.select({ id: user.id, name: user.name })
										.from(user)
										.where(
											userIds.length === 1
												? eq(user.id, userIds[0])
												: eq(user.id, userIds[0]),
										)
								: [];

						const userMap = new Map(users.map((u) => [u.id, u.name]));

						// Format response
						const response = playbooks.map((pb) => ({
							id: pb.id,
							name: pb.name,
							description: pb.description,
							type: pb.type,
							steps: pb.steps ? JSON.parse(pb.steps) : [],
							triggers: pb.triggers ? JSON.parse(pb.triggers) : [],
							actions: pb.actions ? JSON.parse(pb.actions) : [],
							category: pb.category,
							tags: pb.tags ? JSON.parse(pb.tags) : [],
							status: pb.status,
							createdAt: pb.createdAt,
							updatedAt: pb.updatedAt,
							timeAgo: formatTimeAgo(pb.updatedAt),
							createdBy: pb.createdByUserId
								? userMap.get(pb.createdByUserId) || "Unknown"
								: null,
							updatedBy: pb.updatedByUserId
								? userMap.get(pb.updatedByUserId) || "Unknown"
								: null,
						}));

						return new Response(JSON.stringify({ playbooks: response }), {
							status: 200,
							headers: { "Content-Type": "application/json" },
						});
					} catch (error) {
						console.error("Error fetching playbooks:", error);
						return new Response(
							JSON.stringify({ error: "Internal server error", playbooks: [] }),
							{ status: 500, headers: { "Content-Type": "application/json" } },
						);
					}
				},

				/**
				 * POST /:tenant/api/knowledge/playbooks
				 * Create a new playbook
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
								{
									status: 404,
									headers: { "Content-Type": "application/json" },
								},
							);
						}

						const orgId = org[0].id;

						// Parse request body
						const body = await request.json();
						const {
							name,
							description,
							type,
							steps,
							triggers,
							actions,
							category,
							tags,
							status,
						} = body as {
							name: string;
							description?: string;
							type?: "manual" | "automated";
							steps?: Array<{
								order: number;
								title: string;
								description: string;
								action?: string;
							}>;
							triggers?: Array<{ type: string; condition: string }>;
							actions?: Array<{ type: string; config: unknown }>;
							category?: string;
							tags?: string[];
							status?: "draft" | "active" | "inactive";
						};

						if (!name) {
							return new Response(
								JSON.stringify({ error: "Name is required" }),
								{
									status: 400,
									headers: { "Content-Type": "application/json" },
								},
							);
						}

						// Create playbook
						const playbookId = crypto
							.randomUUID()
							.replace(/-/g, "")
							.substring(0, 24);
						const now = new Date();
						const playbookType = type || "manual";
						const playbookStatus = status || "draft";

						await db.insert(playbook).values({
							id: playbookId,
							organizationId: orgId,
							name,
							description: description || null,
							type: playbookType,
							steps: steps ? JSON.stringify(steps) : null,
							triggers: triggers ? JSON.stringify(triggers) : null,
							actions: actions ? JSON.stringify(actions) : null,
							category: category || null,
							tags: tags ? JSON.stringify(tags) : null,
							status: playbookStatus,
							createdByUserId: session.user.id,
							updatedByUserId: session.user.id,
							createdAt: now,
							updatedAt: now,
						});

						return new Response(
							JSON.stringify({
								success: true,
								playbook: {
									id: playbookId,
									name,
									description,
									type: playbookType,
									steps: steps || [],
									triggers: triggers || [],
									actions: actions || [],
									category,
									tags: tags || [],
									status: playbookStatus,
									createdAt: now,
									updatedAt: now,
								},
							}),
							{ status: 201, headers: { "Content-Type": "application/json" } },
						);
					} catch (error) {
						console.error("Error creating playbook:", error);
						return new Response(
							JSON.stringify({ error: "Internal server error" }),
							{ status: 500, headers: { "Content-Type": "application/json" } },
						);
					}
				},

				/**
				 * PUT /:tenant/api/knowledge/playbooks
				 * Update an existing playbook (id in body)
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
								{
									status: 404,
									headers: { "Content-Type": "application/json" },
								},
							);
						}

						const orgId = org[0].id;

						// Parse request body
						const body = await request.json();
						const {
							id,
							name,
							description,
							type,
							steps,
							triggers,
							actions,
							category,
							tags,
							status,
						} = body as {
							id: string;
							name?: string;
							description?: string;
							type?: "manual" | "automated";
							steps?: Array<{
								order: number;
								title: string;
								description: string;
								action?: string;
							}>;
							triggers?: Array<{ type: string; condition: string }>;
							actions?: Array<{ type: string; config: unknown }>;
							category?: string;
							tags?: string[];
							status?: "draft" | "active" | "inactive";
						};

						if (!id) {
							return new Response(
								JSON.stringify({ error: "Playbook ID is required" }),
								{
									status: 400,
									headers: { "Content-Type": "application/json" },
								},
							);
						}

						// Check playbook exists and belongs to org
						const existing = await db
							.select()
							.from(playbook)
							.where(
								and(eq(playbook.id, id), eq(playbook.organizationId, orgId)),
							)
							.limit(1);

						if (existing.length === 0) {
							return new Response(
								JSON.stringify({ error: "Playbook not found" }),
								{
									status: 404,
									headers: { "Content-Type": "application/json" },
								},
							);
						}

						const now = new Date();
						const updateData: Record<string, unknown> = {
							updatedAt: now,
							updatedByUserId: session.user.id,
						};

						if (name !== undefined) updateData.name = name;
						if (description !== undefined) updateData.description = description;
						if (type !== undefined) updateData.type = type;
						if (steps !== undefined) updateData.steps = JSON.stringify(steps);
						if (triggers !== undefined)
							updateData.triggers = JSON.stringify(triggers);
						if (actions !== undefined)
							updateData.actions = JSON.stringify(actions);
						if (category !== undefined) updateData.category = category;
						if (tags !== undefined) updateData.tags = JSON.stringify(tags);
						if (status !== undefined) updateData.status = status;

						await db
							.update(playbook)
							.set(updateData)
							.where(eq(playbook.id, id));

						return new Response(JSON.stringify({ success: true, id }), {
							status: 200,
							headers: { "Content-Type": "application/json" },
						});
					} catch (error) {
						console.error("Error updating playbook:", error);
						return new Response(
							JSON.stringify({ error: "Internal server error" }),
							{ status: 500, headers: { "Content-Type": "application/json" } },
						);
					}
				},

				/**
				 * DELETE /:tenant/api/knowledge/playbooks
				 * Delete a playbook (id in query param)
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
								{
									status: 404,
									headers: { "Content-Type": "application/json" },
								},
							);
						}

						const orgId = org[0].id;

						// Get playbook ID from query params
						const url = new URL(request.url);
						const id = url.searchParams.get("id");

						if (!id) {
							return new Response(
								JSON.stringify({ error: "Playbook ID is required" }),
								{
									status: 400,
									headers: { "Content-Type": "application/json" },
								},
							);
						}

						// Check playbook exists and belongs to org
						const existing = await db
							.select({ id: playbook.id })
							.from(playbook)
							.where(
								and(eq(playbook.id, id), eq(playbook.organizationId, orgId)),
							)
							.limit(1);

						if (existing.length === 0) {
							return new Response(
								JSON.stringify({ error: "Playbook not found" }),
								{
									status: 404,
									headers: { "Content-Type": "application/json" },
								},
							);
						}

						// Delete the playbook
						await db.delete(playbook).where(eq(playbook.id, id));

						return new Response(JSON.stringify({ success: true, id }), {
							status: 200,
							headers: { "Content-Type": "application/json" },
						});
					} catch (error) {
						console.error("Error deleting playbook:", error);
						return new Response(
							JSON.stringify({ error: "Internal server error" }),
							{ status: 500, headers: { "Content-Type": "application/json" } },
						);
					}
				},
			},
		},
	},
);

function formatTimeAgo(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	if (diffDays < 30)
		return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? "s" : ""} ago`;
	return date.toLocaleDateString();
}
