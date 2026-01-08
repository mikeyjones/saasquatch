import { describe, it, expect } from "vitest";
import { quote } from "./schema";

/**
 * Tests for quote table schema structure
 */
describe("quote table schema", () => {
	it("should have organizationId for support staff scoping", () => {
		const columns = Object.keys(quote);
		expect(columns).toContain("organizationId");
	});

	it("should have tenantOrganizationId for customer association", () => {
		const columns = Object.keys(quote);
		expect(columns).toContain("tenantOrganizationId");
	});

	it("should have optional dealId for deal linking", () => {
		const columns = Object.keys(quote);
		expect(columns).toContain("dealId");
	});

	it("should have optional productPlanId for product plan linking", () => {
		const columns = Object.keys(quote);
		expect(columns).toContain("productPlanId");
	});

	it("should have all core quote columns", () => {
		const columns = Object.keys(quote);
		expect(columns).toContain("id");
		expect(columns).toContain("quoteNumber");
		expect(columns).toContain("status");
		expect(columns).toContain("version");
		expect(columns).toContain("subtotal");
		expect(columns).toContain("tax");
		expect(columns).toContain("total");
		expect(columns).toContain("currency");
		expect(columns).toContain("lineItems");
		expect(columns).toContain("createdAt");
		expect(columns).toContain("updatedAt");
	});

	it("should have quote lifecycle tracking columns", () => {
		const columns = Object.keys(quote);
		expect(columns).toContain("sentAt");
		expect(columns).toContain("acceptedAt");
		expect(columns).toContain("rejectedAt");
	});

	it("should have versioning support", () => {
		const columns = Object.keys(quote);
		expect(columns).toContain("version");
		expect(columns).toContain("parentQuoteId");
	});

	it("should have conversion tracking", () => {
		const columns = Object.keys(quote);
		expect(columns).toContain("convertedToInvoiceId");
	});

	it("should have validity tracking", () => {
		const columns = Object.keys(quote);
		expect(columns).toContain("validUntil");
	});

	it("should have PDF storage", () => {
		const columns = Object.keys(quote);
		expect(columns).toContain("pdfPath");
	});
});
