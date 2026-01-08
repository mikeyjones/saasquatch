/**
 * Knowledge Base Data Layer
 *
 * Provides data fetching and mutations for knowledge articles and playbooks.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Available categories for knowledge articles and playbooks.
 */
export type KnowledgeCategory =
	| "AUTHENTICATION"
	| "BILLING"
	| "DEVELOPER"
	| "GENERAL"
	| "ONBOARDING"
	| "AUTOMATION";

/**
 * Represents a knowledge base article.
 *
 * Articles contain help documentation, guides, and FAQs for customers
 * and support staff.
 */
export interface KnowledgeArticle {
	id: string;
	title: string;
	content: string | null;
	slug: string;
	category: string | null;
	tags: string[];
	status: "draft" | "published" | "archived";
	views: number;
	publishedAt: string | null;
	createdAt: string;
	updatedAt: string;
	timeAgo: string;
	createdBy: string | null;
	updatedBy: string | null;
}

/**
 * Represents a support playbook with steps, triggers, and actions.
 *
 * Playbooks guide support staff through common scenarios and can be
 * manual (step-by-step guide) or automated (triggers actions).
 */
export interface Playbook {
	id: string;
	name: string;
	description: string | null;
	type: "manual" | "automated";
	steps: PlaybookStep[];
	triggers: PlaybookTrigger[];
	actions: PlaybookAction[];
	category: string | null;
	tags: string[];
	status: "draft" | "active" | "inactive";
	createdAt: string;
	updatedAt: string;
	timeAgo: string;
	createdBy: string | null;
	updatedBy: string | null;
}

/**
 * A single step in a playbook workflow.
 */
export interface PlaybookStep {
	order: number;
	title: string;
	description: string;
	action?: string;
}

/**
 * Trigger condition for an automated playbook.
 */
export interface PlaybookTrigger {
	type: string;
	condition: string;
}

/**
 * Action to execute in an automated playbook.
 */
export interface PlaybookAction {
	type: string;
	config: Record<string, unknown>;
}

/**
 * Search result from knowledge base search.
 *
 * Can be either an article or a playbook, with relevance score.
 */
export interface SearchResult {
	id: string;
	type: "article" | "playbook";
	title: string;
	description: string | null;
	category: string | null;
	status: string;
	tags: string[];
	score: number;
	createdAt: string;
	updatedAt: string;
}

// ============================================================================
// Article API
// ============================================================================

/**
 * Fetch all knowledge articles for a tenant organization.
 *
 * @param tenantSlug - The tenant organization slug
 * @param filters - Optional filters for article status and category
 * @returns Promise resolving to an array of knowledge articles
 */
export async function fetchArticles(
	tenantSlug: string,
	filters?: { status?: string; category?: string },
): Promise<KnowledgeArticle[]> {
	try {
		const url = new URL(
			`/api/tenant/${tenantSlug}/knowledge/articles`,
			window.location.origin,
		);

		if (filters?.status) url.searchParams.set("status", filters.status);
		if (filters?.category) url.searchParams.set("category", filters.category);

		const response = await fetch(url.toString(), {
			credentials: "include",
		});

		if (!response.ok) {
			console.error("Failed to fetch articles:", response.statusText);
			return [];
		}

		const data = await response.json();
		return data.articles || [];
	} catch (error) {
		console.error("Error fetching articles:", error);
		return [];
	}
}

/**
 * Input data for creating a new knowledge article.
 */
export interface CreateArticleInput {
	title: string;
	content?: string;
	category?: string;
	tags?: string[];
	status?: "draft" | "published" | "archived";
}

/**
 * Create a new knowledge article.
 *
 * @param tenantSlug - The tenant organization slug
 * @param input - The article data to create
 * @returns Promise resolving to a result object with success status and optional article or error
 */
export async function createArticle(
	tenantSlug: string,
	input: CreateArticleInput,
): Promise<{ success: boolean; article?: KnowledgeArticle; error?: string }> {
	try {
		const response = await fetch(
			`/api/tenant/${tenantSlug}/knowledge/articles`,
			{
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			},
		);

		const data = await response.json();

		if (!response.ok) {
			return {
				success: false,
				error: data.error || "Failed to create article",
			};
		}

		return { success: true, article: data.article };
	} catch (error) {
		console.error("Error creating article:", error);
		return { success: false, error: "Network error" };
	}
}

/**
 * Input data for updating an existing knowledge article.
 *
 * All fields are optional except id. Only provided fields will be updated.
 */
export interface UpdateArticleInput {
	id: string;
	title?: string;
	content?: string;
	category?: string;
	tags?: string[];
	status?: "draft" | "published" | "archived";
}

/**
 * Update an existing knowledge article.
 *
 * @param tenantSlug - The tenant organization slug
 * @param input - The article data to update (must include article id)
 * @returns Promise resolving to a result object with success status and optional error
 */
export async function updateArticle(
	tenantSlug: string,
	input: UpdateArticleInput,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(
			`/api/tenant/${tenantSlug}/knowledge/articles`,
			{
				method: "PUT",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			},
		);

		const data = await response.json();

		if (!response.ok) {
			return {
				success: false,
				error: data.error || "Failed to update article",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Error updating article:", error);
		return { success: false, error: "Network error" };
	}
}

/**
 * Delete a knowledge article.
 *
 * @param tenantSlug - The tenant organization slug
 * @param articleId - The ID of the article to delete
 * @returns Promise resolving to a result object with success status and optional error
 */
export async function deleteArticle(
	tenantSlug: string,
	articleId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(
			`/api/tenant/${tenantSlug}/knowledge/articles?id=${articleId}`,
			{
				method: "DELETE",
				credentials: "include",
			},
		);

		const data = await response.json();

		if (!response.ok) {
			return {
				success: false,
				error: data.error || "Failed to delete article",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Error deleting article:", error);
		return { success: false, error: "Network error" };
	}
}

// ============================================================================
// Playbook API
// ============================================================================

/**
 * Fetch all playbooks for a tenant organization.
 *
 * @param tenantSlug - The tenant organization slug
 * @param filters - Optional filters for playbook type, status, and category
 * @returns Promise resolving to an array of playbooks
 */
export async function fetchPlaybooks(
	tenantSlug: string,
	filters?: { type?: string; status?: string; category?: string },
): Promise<Playbook[]> {
	try {
		const url = new URL(
			`/api/tenant/${tenantSlug}/knowledge/playbooks`,
			window.location.origin,
		);

		if (filters?.type) url.searchParams.set("type", filters.type);
		if (filters?.status) url.searchParams.set("status", filters.status);
		if (filters?.category) url.searchParams.set("category", filters.category);

		const response = await fetch(url.toString(), {
			credentials: "include",
		});

		if (!response.ok) {
			console.error("Failed to fetch playbooks:", response.statusText);
			return [];
		}

		const data = await response.json();
		return data.playbooks || [];
	} catch (error) {
		console.error("Error fetching playbooks:", error);
		return [];
	}
}

/**
 * Input data for creating a new playbook.
 */
export interface CreatePlaybookInput {
	name: string;
	description?: string;
	type?: "manual" | "automated";
	steps?: PlaybookStep[];
	triggers?: PlaybookTrigger[];
	actions?: PlaybookAction[];
	category?: string;
	tags?: string[];
	status?: "draft" | "active" | "inactive";
}

/**
 * Create a new playbook.
 *
 * @param tenantSlug - The tenant organization slug
 * @param input - The playbook data to create
 * @returns Promise resolving to a result object with success status and optional playbook or error
 */
export async function createPlaybook(
	tenantSlug: string,
	input: CreatePlaybookInput,
): Promise<{ success: boolean; playbook?: Playbook; error?: string }> {
	try {
		const response = await fetch(
			`/api/tenant/${tenantSlug}/knowledge/playbooks`,
			{
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			},
		);

		const data = await response.json();

		if (!response.ok) {
			return {
				success: false,
				error: data.error || "Failed to create playbook",
			};
		}

		return { success: true, playbook: data.playbook };
	} catch (error) {
		console.error("Error creating playbook:", error);
		return { success: false, error: "Network error" };
	}
}

/**
 * Input data for updating an existing playbook.
 *
 * All fields are optional except id. Only provided fields will be updated.
 */
export interface UpdatePlaybookInput {
	id: string;
	name?: string;
	description?: string;
	type?: "manual" | "automated";
	steps?: PlaybookStep[];
	triggers?: PlaybookTrigger[];
	actions?: PlaybookAction[];
	category?: string;
	tags?: string[];
	status?: "draft" | "active" | "inactive";
}

/**
 * Update an existing playbook.
 *
 * @param tenantSlug - The tenant organization slug
 * @param input - The playbook data to update (must include playbook id)
 * @returns Promise resolving to a result object with success status and optional error
 */
export async function updatePlaybook(
	tenantSlug: string,
	input: UpdatePlaybookInput,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(
			`/api/tenant/${tenantSlug}/knowledge/playbooks`,
			{
				method: "PUT",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input),
			},
		);

		const data = await response.json();

		if (!response.ok) {
			return {
				success: false,
				error: data.error || "Failed to update playbook",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Error updating playbook:", error);
		return { success: false, error: "Network error" };
	}
}

/**
 * Delete a playbook.
 *
 * @param tenantSlug - The tenant organization slug
 * @param playbookId - The ID of the playbook to delete
 * @returns Promise resolving to a result object with success status and optional error
 */
export async function deletePlaybook(
	tenantSlug: string,
	playbookId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(
			`/api/tenant/${tenantSlug}/knowledge/playbooks?id=${playbookId}`,
			{
				method: "DELETE",
				credentials: "include",
			},
		);

		const data = await response.json();

		if (!response.ok) {
			return {
				success: false,
				error: data.error || "Failed to delete playbook",
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Error deleting playbook:", error);
		return { success: false, error: "Network error" };
	}
}

// ============================================================================
// Search API
// ============================================================================

/**
 * Search the knowledge base for articles and playbooks.
 *
 * Performs a full-text search across articles and playbooks with optional
 * filtering by type, status, and category.
 *
 * @param tenantSlug - The tenant organization slug
 * @param query - The search query string
 * @param options - Optional search options
 * @param options.type - Filter by content type ('article', 'playbook', or 'all')
 * @param options.status - Filter by status
 * @param options.category - Filter by category
 * @param options.limit - Maximum number of results to return
 * @returns Promise resolving to an array of search results with relevance scores
 */
export async function searchKnowledge(
	tenantSlug: string,
	query: string,
	options?: {
		type?: "article" | "playbook" | "all";
		status?: string;
		category?: string;
		limit?: number;
	},
): Promise<SearchResult[]> {
	try {
		const url = new URL(
			`/api/tenant/${tenantSlug}/knowledge/search`,
			window.location.origin,
		);

		url.searchParams.set("q", query);
		if (options?.type) url.searchParams.set("type", options.type);
		if (options?.status) url.searchParams.set("status", options.status);
		if (options?.category) url.searchParams.set("category", options.category);
		if (options?.limit) url.searchParams.set("limit", String(options.limit));

		const response = await fetch(url.toString(), {
			credentials: "include",
		});

		if (!response.ok) {
			console.error("Failed to search knowledge:", response.statusText);
			return [];
		}

		const data = await response.json();
		return data.results || [];
	} catch (error) {
		console.error("Error searching knowledge:", error);
		return [];
	}
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Available knowledge categories.
 */
export const categories: KnowledgeCategory[] = [
	"AUTHENTICATION",
	"BILLING",
	"DEVELOPER",
	"GENERAL",
	"ONBOARDING",
	"AUTOMATION",
];

/**
 * Category options formatted for UI dropdowns.
 */
export const categoryOptions = categories.map((cat) => ({
	label: cat.charAt(0) + cat.slice(1).toLowerCase(),
	value: cat,
}));

/**
 * Article status options for UI dropdowns.
 */
export const articleStatusOptions = [
	{ label: "Draft", value: "draft" },
	{ label: "Published", value: "published" },
	{ label: "Archived", value: "archived" },
];

/**
 * Playbook status options for UI dropdowns.
 */
export const playbookStatusOptions = [
	{ label: "Draft", value: "draft" },
	{ label: "Active", value: "active" },
	{ label: "Inactive", value: "inactive" },
];

/**
 * Playbook type options for UI dropdowns.
 */
export const playbookTypeOptions = [
	{ label: "Manual", value: "manual" },
	{ label: "Automated", value: "automated" },
];
