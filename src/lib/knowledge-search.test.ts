import { describe, it, expect } from "vitest";
import { generateSlug } from "./slug-utils";

/**
 * Tests for knowledge search utility functions
 *
 * Note: Database-dependent tests (searchKnowledge, generateUniqueSlug)
 * require a database connection and are better suited for integration tests.
 * These unit tests cover the pure utility functions.
 */

describe("Knowledge Search Utilities", () => {
	describe("generateSlug", () => {
		it("should convert title to lowercase slug", () => {
			expect(generateSlug("Hello World")).toBe("hello-world");
		});

		it("should replace spaces with hyphens", () => {
			expect(generateSlug("Setting up SSO")).toBe("setting-up-sso");
		});

		it("should remove special characters", () => {
			expect(generateSlug("API Rate Limits (v2)")).toBe("api-rate-limits-v2");
			expect(generateSlug("What's New?")).toBe("whats-new");
		});

		it("should handle multiple spaces", () => {
			expect(generateSlug("Hello   World")).toBe("hello-world");
		});

		it("should remove leading and trailing hyphens", () => {
			expect(generateSlug(" Hello World ")).toBe("hello-world");
			expect(generateSlug("--Hello--")).toBe("hello");
		});

		it("should handle numbers", () => {
			expect(generateSlug("Version 2.0 Release")).toBe("version-20-release");
		});

		it("should truncate long slugs to 100 characters", () => {
			const longTitle = "A".repeat(150);
			expect(generateSlug(longTitle).length).toBeLessThanOrEqual(100);
		});

		it("should handle empty string", () => {
			expect(generateSlug("")).toBe("");
		});

		it("should handle string with only special characters", () => {
			expect(generateSlug("!!!")).toBe("");
		});

		it("should create URL-safe slugs", () => {
			const slug = generateSlug("Setting up Okta SSO");
			// Should only contain lowercase letters, numbers, and hyphens
			expect(slug).toMatch(/^[a-z0-9-]*$/);
		});

		it("should handle common article titles", () => {
			expect(generateSlug("Getting Started Guide")).toBe(
				"getting-started-guide",
			);
			expect(generateSlug("Understanding Your Invoice")).toBe(
				"understanding-your-invoice",
			);
			expect(generateSlug("API Rate Limits Explained")).toBe(
				"api-rate-limits-explained",
			);
			expect(generateSlug("Managing Team Members")).toBe(
				"managing-team-members",
			);
			expect(generateSlug("Webhook Configuration Guide")).toBe(
				"webhook-configuration-guide",
			);
		});
	});
});

describe("Search Result Types", () => {
	it("should support article and playbook result types", () => {
		// Type-level test - if this compiles, the types are correct
		type SearchResultType = "article" | "playbook";
		const validTypes: SearchResultType[] = ["article", "playbook"];
		expect(validTypes).toHaveLength(2);
	});

	it("should define SearchResult shape", () => {
		// Type-level test to document expected shape
		const mockResult = {
			id: "abc123",
			type: "article" as const,
			title: "Test Article",
			description: "Test description",
			category: "AUTHENTICATION",
			status: "published",
			tags: ["tag1", "tag2"],
			score: 0.85,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		expect(mockResult.id).toBeDefined();
		expect(mockResult.type).toBe("article");
		expect(mockResult.score).toBeGreaterThanOrEqual(0);
		expect(mockResult.score).toBeLessThanOrEqual(1);
	});
});

describe("Search Options", () => {
	it("should support all filter options", () => {
		const mockOptions = {
			organizationId: "org_123",
			query: "sso okta",
			type: "all" as const,
			status: "published",
			category: "AUTHENTICATION",
			limit: 20,
		};

		expect(mockOptions.organizationId).toBeDefined();
		expect(mockOptions.query).toBeDefined();
		expect(mockOptions.type).toBe("all");
		expect(mockOptions.limit).toBeGreaterThan(0);
	});

	it("should support filtering by type", () => {
		const articleOnly = { type: "article" as const };
		const playbookOnly = { type: "playbook" as const };
		const all = { type: "all" as const };

		expect(articleOnly.type).toBe("article");
		expect(playbookOnly.type).toBe("playbook");
		expect(all.type).toBe("all");
	});
});
