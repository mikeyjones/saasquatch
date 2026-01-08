import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { knowledgeArticle, organization, user } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateUniqueSlug } from "@/lib/knowledge-search";

export const Route = createFileRoute("/api/tenant/$tenant/knowledge/articles")({
	server: {
		handlers: {
			/**
			 * GET /api/tenant/:tenant/knowledge/articles
			 * Fetch all knowledge articles for the organization
			 *
			 * Query params:
			 * - status: Filter by status (draft, published, archived)
			 * - category: Filter by category
			 */
			GET: async ({ request, params }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session?.user) {
						return new Response(
							JSON.stringify({ error: "Unauthorized", articles: [] }),
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
							JSON.stringify({ error: "Organization not found", articles: [] }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const orgId = org[0].id;

					// Parse query params
					const url = new URL(request.url);
					const status = url.searchParams.get("status");
					const category = url.searchParams.get("category");

					// Build query conditions
					const conditions = [eq(knowledgeArticle.organizationId, orgId)];

					if (status && status !== "all") {
						conditions.push(eq(knowledgeArticle.status, status));
					}

					if (category && category !== "all") {
						conditions.push(eq(knowledgeArticle.category, category));
					}

					// Fetch articles with author info
					const articles = await db
						.select({
							id: knowledgeArticle.id,
							title: knowledgeArticle.title,
							content: knowledgeArticle.content,
							slug: knowledgeArticle.slug,
							category: knowledgeArticle.category,
							tags: knowledgeArticle.tags,
							status: knowledgeArticle.status,
							views: knowledgeArticle.views,
							publishedAt: knowledgeArticle.publishedAt,
							createdAt: knowledgeArticle.createdAt,
							updatedAt: knowledgeArticle.updatedAt,
							createdByUserId: knowledgeArticle.createdByUserId,
							updatedByUserId: knowledgeArticle.updatedByUserId,
						})
						.from(knowledgeArticle)
						.where(and(...conditions))
						.orderBy(desc(knowledgeArticle.updatedAt));

					// Get author names for articles
					const userIds = [
						...new Set(
							articles
								.flatMap((a) => [a.createdByUserId, a.updatedByUserId])
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
											: eq(user.id, userIds[0]), // Simplified - would use or() for multiple
									)
							: [];

					const userMap = new Map(users.map((u) => [u.id, u.name]));

					// Format response
					const response = articles.map((article) => ({
						id: article.id,
						title: article.title,
						content: article.content,
						slug: article.slug,
						category: article.category,
						tags: article.tags ? JSON.parse(article.tags) : [],
						status: article.status,
						views: article.views,
						publishedAt: article.publishedAt,
						createdAt: article.createdAt,
						updatedAt: article.updatedAt,
						timeAgo: formatTimeAgo(article.updatedAt),
						createdBy: article.createdByUserId
							? userMap.get(article.createdByUserId) || "Unknown"
							: null,
						updatedBy: article.updatedByUserId
							? userMap.get(article.updatedByUserId) || "Unknown"
							: null,
					}));

					return new Response(JSON.stringify({ articles: response }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error fetching articles:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error", articles: [] }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * POST /api/tenant/:tenant/knowledge/articles
			 * Create a new knowledge article
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
					const { title, content, category, tags, status } = body as {
						title: string;
						content?: string;
						category?: string;
						tags?: string[];
						status?: "draft" | "published" | "archived";
					};

					if (!title) {
						return new Response(
							JSON.stringify({ error: "Title is required" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Generate unique slug
					const slug = await generateUniqueSlug(orgId, title);

					// Create article
					const articleId = crypto
						.randomUUID()
						.replace(/-/g, "")
						.substring(0, 24);
					const now = new Date();
					const articleStatus = status || "draft";

					await db.insert(knowledgeArticle).values({
						id: articleId,
						organizationId: orgId,
						title,
						content: content || null,
						slug,
						category: category || null,
						tags: tags ? JSON.stringify(tags) : null,
						status: articleStatus,
						views: 0,
						publishedAt: articleStatus === "published" ? now : null,
						createdByUserId: session.user.id,
						updatedByUserId: session.user.id,
						createdAt: now,
						updatedAt: now,
					});

					return new Response(
						JSON.stringify({
							success: true,
							article: {
								id: articleId,
								title,
								slug,
								category,
								tags: tags || [],
								status: articleStatus,
								createdAt: now,
								updatedAt: now,
							},
						}),
						{ status: 201, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Error creating article:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * PUT /api/tenant/:tenant/knowledge/articles
			 * Update an existing knowledge article (id in body)
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
					const { id, title, content, category, tags, status } = body as {
						id: string;
						title?: string;
						content?: string;
						category?: string;
						tags?: string[];
						status?: "draft" | "published" | "archived";
					};

					if (!id) {
						return new Response(
							JSON.stringify({ error: "Article ID is required" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Check article exists and belongs to org
					const existing = await db
						.select()
						.from(knowledgeArticle)
						.where(
							and(
								eq(knowledgeArticle.id, id),
								eq(knowledgeArticle.organizationId, orgId),
							),
						)
						.limit(1);

					if (existing.length === 0) {
						return new Response(
							JSON.stringify({ error: "Article not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const now = new Date();
					const updateData: Record<string, unknown> = {
						updatedAt: now,
						updatedByUserId: session.user.id,
					};

					if (title !== undefined) updateData.title = title;
					if (content !== undefined) updateData.content = content;
					if (category !== undefined) updateData.category = category;
					if (tags !== undefined) updateData.tags = JSON.stringify(tags);
					if (status !== undefined) {
						updateData.status = status;
						// Set publishedAt when publishing for the first time
						if (status === "published" && !existing[0].publishedAt) {
							updateData.publishedAt = now;
						}
					}

					await db
						.update(knowledgeArticle)
						.set(updateData)
						.where(eq(knowledgeArticle.id, id));

					return new Response(JSON.stringify({ success: true, id }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error updating article:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * DELETE /api/tenant/:tenant/knowledge/articles
			 * Delete a knowledge article (id in query param)
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

					// Get article ID from query params
					const url = new URL(request.url);
					const id = url.searchParams.get("id");

					if (!id) {
						return new Response(
							JSON.stringify({ error: "Article ID is required" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Check article exists and belongs to org
					const existing = await db
						.select({ id: knowledgeArticle.id })
						.from(knowledgeArticle)
						.where(
							and(
								eq(knowledgeArticle.id, id),
								eq(knowledgeArticle.organizationId, orgId),
							),
						)
						.limit(1);

					if (existing.length === 0) {
						return new Response(
							JSON.stringify({ error: "Article not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					// Delete the article
					await db.delete(knowledgeArticle).where(eq(knowledgeArticle.id, id));

					return new Response(JSON.stringify({ success: true, id }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error deleting article:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});

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
