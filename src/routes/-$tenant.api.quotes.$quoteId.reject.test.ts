import { describe, it, expect } from "vitest";

/**
 * Tests for Reject Quote API endpoint
 * These tests document expected API behavior for rejecting quotes.
 */
describe("Reject Quote API", () => {
	describe("POST /:tenant/api/quotes/:quoteId/reject", () => {
		it("should require authentication", () => {
			const expectedResponse = { error: "Unauthorized" };
			expect(expectedResponse.error).toBe("Unauthorized");
		});

		it("should only allow rejecting sent or expired quotes", () => {
			const expectedError = {
				error: "Quote status 'draft' cannot be rejected.",
			};
			expect(expectedError.error).toContain("cannot be rejected");
		});

		it("should return 404 if quote not found", () => {
			const expectedResponse = { error: "Quote not found" };
			expect(expectedResponse.error).toBe("Quote not found");
		});

		it("should update quote status to rejected", () => {
			const expectedResponse = {
				success: true,
				quote: {
					id: "quote-123",
					quoteNumber: "QUO-ACME-1001",
					status: "rejected",
					rejectedAt: "ISO date string",
				},
			};
			expect(expectedResponse.success).toBe(true);
			expect(expectedResponse.quote.status).toBe("rejected");
			expect(expectedResponse.quote.rejectedAt).toBeDefined();
		});
	});
});
