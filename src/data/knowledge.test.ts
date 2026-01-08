import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	fetchArticles,
	createArticle,
	updateArticle,
	deleteArticle,
	fetchPlaybooks,
	createPlaybook,
	updatePlaybook,
	deletePlaybook,
	searchKnowledge,
	categories,
	categoryOptions,
	articleStatusOptions,
	playbookStatusOptions,
	playbookTypeOptions,
} from "./knowledge";
import { mockFetchSuccess, mockFetchError } from "@/test/setup";

// Helper to mock fetch
function mockFetch() {
	return global.fetch as ReturnType<typeof vi.fn>;
}

describe("knowledge data functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
		// Mock window.location.origin for URL construction (needed for all tests)
		Object.defineProperty(window, "location", {
			value: { origin: "http://localhost:3000" },
			writable: true,
			configurable: true,
		});
	});

	describe("fetchArticles", () => {
		it("should make GET request to correct endpoint", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ articles: [] }));

			await fetchArticles("acme");

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/tenant/acme/knowledge/articles"),
				expect.objectContaining({
					credentials: "include",
				}),
			);
		});

		it("should include status filter in query params", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ articles: [] }));

			await fetchArticles("acme", { status: "published" });

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("status=published"),
				expect.any(Object),
			);
		});

		it("should include category filter in query params", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ articles: [] }));

			await fetchArticles("acme", { category: "BILLING" });

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("category=BILLING"),
				expect.any(Object),
			);
		});

		it("should return articles array on success", async () => {
			const mockArticles = [
				{
					id: "article-1",
					title: "Test Article",
					content: "Content",
					slug: "test-article",
					category: "BILLING",
					tags: [],
					status: "published",
					views: 0,
					publishedAt: "2024-01-01",
					createdAt: "2024-01-01",
					updatedAt: "2024-01-01",
					timeAgo: "1 day ago",
					createdBy: null,
					updatedBy: null,
				},
			];

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ articles: mockArticles }),
			);

			const result = await fetchArticles("acme");

			expect(result).toEqual(mockArticles);
		});

		it("should return empty array on error", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchError("Not found", 404));

			const result = await fetchArticles("acme");

			expect(result).toEqual([]);
		});

		it("should return empty array on network error", async () => {
			mockFetch().mockRejectedValueOnce(new Error("Network error"));

			const result = await fetchArticles("acme");

			expect(result).toEqual([]);
		});
	});

	describe("createArticle", () => {
		it("should make POST request with article data", async () => {
			const mockArticle = {
				id: "article-1",
				title: "New Article",
				content: "Content",
				slug: "new-article",
				category: "BILLING",
				tags: [],
				status: "draft" as const,
				views: 0,
				publishedAt: null,
				createdAt: "2024-01-01",
				updatedAt: "2024-01-01",
				timeAgo: "just now",
				createdBy: null,
				updatedBy: null,
			};

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ article: mockArticle }),
			);

			const result = await createArticle("acme", {
				title: "New Article",
				content: "Content",
				category: "BILLING",
			});

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/tenant/acme/knowledge/articles"),
				expect.objectContaining({
					method: "POST",
					headers: { "Content-Type": "application/json" },
				}),
			);

			expect(result.success).toBe(true);
			expect(result.article).toEqual(mockArticle);
		});

		it("should return error on API failure", async () => {
			mockFetch().mockResolvedValueOnce(
				mockFetchError("Validation failed", 400),
			);

			const result = await createArticle("acme", { title: "Test" });

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("updateArticle", () => {
		it("should make PUT request with update data", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({}));

			const result = await updateArticle("acme", {
				id: "article-1",
				title: "Updated Title",
			});

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/tenant/acme/knowledge/articles"),
				expect.objectContaining({
					method: "PUT",
				}),
			);

			expect(result.success).toBe(true);
		});
	});

	describe("deleteArticle", () => {
		it("should make DELETE request with article ID", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({}));

			const result = await deleteArticle("acme", "article-1");

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining(
					"/api/tenant/acme/knowledge/articles?id=article-1",
				),
				expect.objectContaining({
					method: "DELETE",
				}),
			);

			expect(result.success).toBe(true);
		});
	});

	describe("fetchPlaybooks", () => {
		it("should make GET request to playbooks endpoint", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ playbooks: [] }));

			await fetchPlaybooks("acme");

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/tenant/acme/knowledge/playbooks"),
				expect.any(Object),
			);
		});

		it("should include filters in query params", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ playbooks: [] }));

			await fetchPlaybooks("acme", { type: "manual", status: "active" });

			const callUrl = mockFetch().mock.calls[0][0] as string;
			expect(callUrl).toContain("type=manual");
			expect(callUrl).toContain("status=active");
		});
	});

	describe("createPlaybook", () => {
		it("should make POST request with playbook data", async () => {
			const mockPlaybook = {
				id: "playbook-1",
				name: "New Playbook",
				description: "Description",
				type: "manual" as const,
				steps: [],
				triggers: [],
				actions: [],
				category: null,
				tags: [],
				status: "draft" as const,
				createdAt: "2024-01-01",
				updatedAt: "2024-01-01",
				timeAgo: "just now",
				createdBy: null,
				updatedBy: null,
			};

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ playbook: mockPlaybook }),
			);

			const result = await createPlaybook("acme", {
				name: "New Playbook",
				type: "manual",
			});

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/tenant/acme/knowledge/playbooks"),
				expect.objectContaining({
					method: "POST",
					headers: { "Content-Type": "application/json" },
				}),
			);

			expect(result.success).toBe(true);
			expect(result.playbook).toEqual(mockPlaybook);
		});

		it("should return error on API failure", async () => {
			mockFetch().mockResolvedValueOnce(
				mockFetchError("Validation failed", 400),
			);

			const result = await createPlaybook("acme", { name: "Test" });

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("updatePlaybook", () => {
		it("should make PUT request with update data", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({}));

			const result = await updatePlaybook("acme", {
				id: "playbook-1",
				name: "Updated Name",
			});

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/tenant/acme/knowledge/playbooks"),
				expect.objectContaining({
					method: "PUT",
					headers: { "Content-Type": "application/json" },
				}),
			);

			expect(result.success).toBe(true);
		});

		it("should return error on API failure", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchError("Not found", 404));

			const result = await updatePlaybook("acme", {
				id: "playbook-1",
				name: "Updated",
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("deletePlaybook", () => {
		it("should make DELETE request with playbook ID", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({}));

			const result = await deletePlaybook("acme", "playbook-1");

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining(
					"/api/tenant/acme/knowledge/playbooks?id=playbook-1",
				),
				expect.objectContaining({
					method: "DELETE",
				}),
			);

			expect(result.success).toBe(true);
		});

		it("should return error on API failure", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchError("Not found", 404));

			const result = await deletePlaybook("acme", "playbook-1");

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("searchKnowledge", () => {
		it("should make GET request to search endpoint with query", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ results: [] }));

			await searchKnowledge("acme", "test query");

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/tenant/acme/knowledge/search"),
				expect.any(Object),
			);

			const callUrl = mockFetch().mock.calls[0][0] as string;
			// Query param might be URL encoded (test%20query or test+query)
			expect(callUrl).toMatch(/q=(test|test%20query|test\+query)/);
		});

		it("should include search options in query params", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ results: [] }));

			await searchKnowledge("acme", "test", {
				type: "article",
				status: "published",
				category: "BILLING",
				limit: 10,
			});

			const callUrl = mockFetch().mock.calls[0][0] as string;
			expect(callUrl).toContain("type=article");
			expect(callUrl).toContain("status=published");
			expect(callUrl).toContain("category=BILLING");
			expect(callUrl).toContain("limit=10");
		});
	});

	describe("Constants", () => {
		it("should export categories array", () => {
			expect(Array.isArray(categories)).toBe(true);
			expect(categories.length).toBeGreaterThan(0);
		});

		it("should export categoryOptions with label and value", () => {
			expect(categoryOptions[0]).toHaveProperty("label");
			expect(categoryOptions[0]).toHaveProperty("value");
		});

		it("should export articleStatusOptions", () => {
			expect(articleStatusOptions).toHaveLength(3);
			expect(articleStatusOptions.map((o) => o.value)).toContain("draft");
		});

		it("should export playbookStatusOptions", () => {
			expect(playbookStatusOptions).toHaveLength(3);
		});

		it("should export playbookTypeOptions", () => {
			expect(playbookTypeOptions).toHaveLength(2);
		});
	});
});
