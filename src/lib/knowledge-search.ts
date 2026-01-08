/**
 * Knowledge Base Search Utility
 *
 * Provides server-side fuzzy search using PostgreSQL's pg_trgm extension.
 * Searches across knowledge articles and playbooks with similarity scoring.
 *
 * IMPORTANT: Requires pg_trgm extension to be enabled in PostgreSQL:
 * CREATE EXTENSION IF NOT EXISTS pg_trgm;
 */

import { db } from "@/db";
import { knowledgeArticle, playbook } from "@/db/schema";
import { sql, eq, and, or, desc } from "drizzle-orm";

/**
 * Type of search result (article or playbook).
 */
export type SearchResultType = "article" | "playbook";

/**
 * Search result from knowledge base search.
 */
export interface SearchResult {
	id: string;
	type: SearchResultType;
	title: string; // article.title or playbook.name
	description: string | null; // article.content or playbook.description (truncated)
	category: string | null;
	status: string;
	tags: string[] | null;
	score: number; // similarity score (0-1)
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Options for knowledge base search.
 */
export interface SearchOptions {
	organizationId: string;
	query: string;
	type?: "article" | "playbook" | "all";
	status?: string;
	category?: string;
	limit?: number;
}

/**
 * Parse JSON tags from database text field.
 *
 * @param tagsJson - JSON string or null
 * @returns Parsed tags array or null if invalid
 */
function parseTags(tagsJson: string | null): string[] | null {
	if (!tagsJson) return null;
	try {
		return JSON.parse(tagsJson);
	} catch {
		return null;
	}
}

/**
 * Truncate content for search result preview.
 *
 * @param content - Content to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated content with ellipsis or null
 */
function truncateContent(
	content: string | null,
	maxLength = 200,
): string | null {
	if (!content) return null;
	if (content.length <= maxLength) return content;
	return `${content.substring(0, maxLength)}...`;
}

/**
 * Search knowledge articles and playbooks using fuzzy matching.
 *
 * Uses PostgreSQL's pg_trgm extension for similarity scoring.
 * Searches across title/name, content/description, category, and tags.
 * Returns results sorted by relevance score.
 *
 * @param options - Search options
 * @returns Promise resolving to an array of search results
 */
export async function searchKnowledge(
	options: SearchOptions,
): Promise<SearchResult[]> {
	const {
		organizationId,
		query,
		type = "all",
		status,
		category,
		limit = 20,
	} = options;

	// Handle empty query - return recent items
	if (!query || query.trim() === "") {
		return getRecentKnowledge({
			organizationId,
			type,
			status,
			category,
			limit,
		});
	}

	const searchQuery = query.trim().toLowerCase();
	const results: SearchResult[] = [];

	// Search articles if type includes them
	if (type === "all" || type === "article") {
		const articleResults = await searchArticles(
			organizationId,
			searchQuery,
			status,
			category,
			limit,
		);
		results.push(...articleResults);
	}

	// Search playbooks if type includes them
	if (type === "all" || type === "playbook") {
		const playbookResults = await searchPlaybooks(
			organizationId,
			searchQuery,
			status,
			category,
			limit,
		);
		results.push(...playbookResults);
	}

	// Sort by score descending and limit results
	results.sort((a, b) => b.score - a.score);
	return results.slice(0, limit);
}

/**
 * Search knowledge articles using pg_trgm similarity.
 *
 * @param organizationId - Organization ID to scope search
 * @param query - Search query string
 * @param status - Optional status filter
 * @param category - Optional category filter
 * @param limit - Maximum number of results
 * @returns Promise resolving to an array of article search results
 */
async function searchArticles(
	organizationId: string,
	query: string,
	status?: string,
	category?: string,
	limit = 20,
): Promise<SearchResult[]> {
	// Build conditions
	const conditions = [eq(knowledgeArticle.organizationId, organizationId)];

	if (status) {
		conditions.push(eq(knowledgeArticle.status, status));
	}
	if (category) {
		conditions.push(eq(knowledgeArticle.category, category));
	}

	// Use pg_trgm similarity function to search and score
	// We use GREATEST to find the best match across multiple columns
	const rows = await db
		.select({
			id: knowledgeArticle.id,
			title: knowledgeArticle.title,
			content: knowledgeArticle.content,
			category: knowledgeArticle.category,
			status: knowledgeArticle.status,
			tags: knowledgeArticle.tags,
			createdAt: knowledgeArticle.createdAt,
			updatedAt: knowledgeArticle.updatedAt,
			titleScore: sql<number>`similarity(${knowledgeArticle.title}, ${query})`,
			contentScore: sql<number>`similarity(COALESCE(${knowledgeArticle.content}, ''), ${query})`,
			categoryScore: sql<number>`similarity(COALESCE(${knowledgeArticle.category}, ''), ${query})`,
			tagsScore: sql<number>`similarity(COALESCE(${knowledgeArticle.tags}, ''), ${query})`,
		})
		.from(knowledgeArticle)
		.where(
			and(
				...conditions,
				// Filter to results that have some similarity
				or(
					sql`${knowledgeArticle.title} % ${query}`,
					sql`${knowledgeArticle.content} % ${query}`,
					sql`${knowledgeArticle.category} % ${query}`,
					sql`${knowledgeArticle.tags} % ${query}`,
					// Also include exact substring matches
					sql`LOWER(${knowledgeArticle.title}) LIKE ${`%${query}%`}`,
					sql`LOWER(COALESCE(${knowledgeArticle.content}, '')) LIKE ${`%${query}%`}`,
				),
			),
		)
		.orderBy(
			desc(
				sql`GREATEST(
          similarity(${knowledgeArticle.title}, ${query}),
          similarity(COALESCE(${knowledgeArticle.content}, ''), ${query}),
          similarity(COALESCE(${knowledgeArticle.category}, ''), ${query}),
          similarity(COALESCE(${knowledgeArticle.tags}, ''), ${query})
        )`,
			),
		)
		.limit(limit);

	return rows.map((row) => ({
		id: row.id,
		type: "article" as const,
		title: row.title,
		description: truncateContent(row.content),
		category: row.category,
		status: row.status,
		tags: parseTags(row.tags),
		score: Math.max(
			row.titleScore ?? 0,
			row.contentScore ?? 0,
			row.categoryScore ?? 0,
			row.tagsScore ?? 0,
		),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	}));
}

/**
 * Search playbooks using pg_trgm similarity.
 *
 * @param organizationId - Organization ID to scope search
 * @param query - Search query string
 * @param status - Optional status filter
 * @param category - Optional category filter
 * @param limit - Maximum number of results
 * @returns Promise resolving to an array of playbook search results
 */
async function searchPlaybooks(
	organizationId: string,
	query: string,
	status?: string,
	category?: string,
	limit = 20,
): Promise<SearchResult[]> {
	// Build conditions
	const conditions = [eq(playbook.organizationId, organizationId)];

	if (status) {
		conditions.push(eq(playbook.status, status));
	}
	if (category) {
		conditions.push(eq(playbook.category, category));
	}

	// Use pg_trgm similarity function to search and score
	const rows = await db
		.select({
			id: playbook.id,
			name: playbook.name,
			description: playbook.description,
			category: playbook.category,
			status: playbook.status,
			tags: playbook.tags,
			playbookType: playbook.type,
			createdAt: playbook.createdAt,
			updatedAt: playbook.updatedAt,
			nameScore: sql<number>`similarity(${playbook.name}, ${query})`,
			descriptionScore: sql<number>`similarity(COALESCE(${playbook.description}, ''), ${query})`,
			categoryScore: sql<number>`similarity(COALESCE(${playbook.category}, ''), ${query})`,
			tagsScore: sql<number>`similarity(COALESCE(${playbook.tags}, ''), ${query})`,
		})
		.from(playbook)
		.where(
			and(
				...conditions,
				// Filter to results that have some similarity
				or(
					sql`${playbook.name} % ${query}`,
					sql`${playbook.description} % ${query}`,
					sql`${playbook.category} % ${query}`,
					sql`${playbook.tags} % ${query}`,
					// Also include exact substring matches
					sql`LOWER(${playbook.name}) LIKE ${`%${query}%`}`,
					sql`LOWER(COALESCE(${playbook.description}, '')) LIKE ${`%${query}%`}`,
				),
			),
		)
		.orderBy(
			desc(
				sql`GREATEST(
          similarity(${playbook.name}, ${query}),
          similarity(COALESCE(${playbook.description}, ''), ${query}),
          similarity(COALESCE(${playbook.category}, ''), ${query}),
          similarity(COALESCE(${playbook.tags}, ''), ${query})
        )`,
			),
		)
		.limit(limit);

	return rows.map((row) => ({
		id: row.id,
		type: "playbook" as const,
		title: row.name,
		description: truncateContent(row.description),
		category: row.category,
		status: row.status,
		tags: parseTags(row.tags),
		score: Math.max(
			row.nameScore ?? 0,
			row.descriptionScore ?? 0,
			row.categoryScore ?? 0,
			row.tagsScore ?? 0,
		),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	}));
}

/**
 * Get recent knowledge items when no search query is provided.
 *
 * @param options - Options for fetching recent items
 * @param options.organizationId - Organization ID to scope results
 * @param options.type - Type filter ('article', 'playbook', or 'all')
 * @param options.status - Optional status filter
 * @param options.category - Optional category filter
 * @param options.limit - Maximum number of results
 * @returns Promise resolving to an array of recent knowledge items
 */
async function getRecentKnowledge(options: {
	organizationId: string;
	type?: "article" | "playbook" | "all";
	status?: string;
	category?: string;
	limit?: number;
}): Promise<SearchResult[]> {
	const {
		organizationId,
		type = "all",
		status,
		category,
		limit = 20,
	} = options;
	const results: SearchResult[] = [];

	// Fetch recent articles
	if (type === "all" || type === "article") {
		const articleConditions = [
			eq(knowledgeArticle.organizationId, organizationId),
		];
		if (status) articleConditions.push(eq(knowledgeArticle.status, status));
		if (category)
			articleConditions.push(eq(knowledgeArticle.category, category));

		const articles = await db
			.select()
			.from(knowledgeArticle)
			.where(and(...articleConditions))
			.orderBy(desc(knowledgeArticle.updatedAt))
			.limit(limit);

		results.push(
			...articles.map((article) => ({
				id: article.id,
				type: "article" as const,
				title: article.title,
				description: truncateContent(article.content),
				category: article.category,
				status: article.status,
				tags: parseTags(article.tags),
				score: 1.0, // Full score for recent items
				createdAt: article.createdAt,
				updatedAt: article.updatedAt,
			})),
		);
	}

	// Fetch recent playbooks
	if (type === "all" || type === "playbook") {
		const playbookConditions = [eq(playbook.organizationId, organizationId)];
		if (status) playbookConditions.push(eq(playbook.status, status));
		if (category) playbookConditions.push(eq(playbook.category, category));

		const playbooks = await db
			.select()
			.from(playbook)
			.where(and(...playbookConditions))
			.orderBy(desc(playbook.updatedAt))
			.limit(limit);

		results.push(
			...playbooks.map((pb) => ({
				id: pb.id,
				type: "playbook" as const,
				title: pb.name,
				description: truncateContent(pb.description),
				category: pb.category,
				status: pb.status,
				tags: parseTags(pb.tags),
				score: 1.0, // Full score for recent items
				createdAt: pb.createdAt,
				updatedAt: pb.updatedAt,
			})),
		);
	}

	// Sort by updatedAt and limit
	results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
	return results.slice(0, limit);
}

// Re-export generateSlug for convenience
export { generateSlug } from "./slug-utils";

import { generateSlug as createSlug } from "./slug-utils";

/**
 * Generate a unique slug by checking for existing slugs.
 *
 * Creates a base slug from the title and appends a counter if the slug
 * already exists in the database.
 *
 * @param organizationId - Organization ID to scope slug uniqueness
 * @param title - Title to generate slug from
 * @returns Promise resolving to a unique slug string
 */
export async function generateUniqueSlug(
	organizationId: string,
	title: string,
): Promise<string> {
	const baseSlug = createSlug(title);
	let slug = baseSlug;
	let counter = 1;

	// Check if slug exists and increment counter until unique
	while (true) {
		const existing = await db
			.select({ id: knowledgeArticle.id })
			.from(knowledgeArticle)
			.where(
				and(
					eq(knowledgeArticle.organizationId, organizationId),
					eq(knowledgeArticle.slug, slug),
				),
			)
			.limit(1);

		if (existing.length === 0) {
			return slug;
		}

		slug = `${baseSlug}-${counter}`;
		counter++;
	}
}
