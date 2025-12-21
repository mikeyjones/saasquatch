import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrganizationMetrics } from "./OrganizationMetrics";

const mockMetrics = {
	totalMRR: 49900, // $499.00 in cents
	totalDealValue: 150000, // $1,500.00 in cents
	contactCount: 25,
	dealCount: 8,
	invoiceCount: 12,
};

describe("OrganizationMetrics", () => {
	describe("Render Behavior", () => {
		it("should render all metric cards", () => {
			render(<OrganizationMetrics metrics={mockMetrics} />);

			expect(screen.getByText("Monthly Recurring Revenue")).toBeInTheDocument();
			expect(screen.getByText("Total Deal Value")).toBeInTheDocument();
			expect(screen.getByText("Contacts")).toBeInTheDocument();
			expect(screen.getByText("Deals")).toBeInTheDocument();
			expect(screen.getByText("Invoices")).toBeInTheDocument();
		});

		it("should format MRR as currency", () => {
			render(<OrganizationMetrics metrics={mockMetrics} />);

			expect(screen.getByText("$499.00")).toBeInTheDocument();
		});

		it("should format total deal value as currency", () => {
			render(<OrganizationMetrics metrics={mockMetrics} />);

			expect(screen.getByText("$1500.00")).toBeInTheDocument();
		});

		it("should display contact count as number", () => {
			render(<OrganizationMetrics metrics={mockMetrics} />);

			expect(screen.getByText("25")).toBeInTheDocument();
		});

		it("should display deal count as number", () => {
			render(<OrganizationMetrics metrics={mockMetrics} />);

			expect(screen.getByText("8")).toBeInTheDocument();
		});

		it("should display invoice count as number", () => {
			render(<OrganizationMetrics metrics={mockMetrics} />);

			expect(screen.getByText("12")).toBeInTheDocument();
		});
	});

	describe("Zero Values", () => {
		it("should display $0.00 for zero MRR", () => {
			const zeroMetrics = { ...mockMetrics, totalMRR: 0 };
			render(<OrganizationMetrics metrics={zeroMetrics} />);

			expect(screen.getByText("$0.00")).toBeInTheDocument();
		});

		it("should display 0 for zero counts", () => {
			const zeroMetrics = {
				...mockMetrics,
				contactCount: 0,
				dealCount: 0,
				invoiceCount: 0,
			};
			render(<OrganizationMetrics metrics={zeroMetrics} />);

			// Should have three "0" values
			expect(screen.getAllByText("0")).toHaveLength(3);
		});
	});

	describe("Large Values", () => {
		it("should handle large MRR values", () => {
			const largeMetrics = { ...mockMetrics, totalMRR: 99999900 }; // $999,999.00
			render(<OrganizationMetrics metrics={largeMetrics} />);

			expect(screen.getByText("$999999.00")).toBeInTheDocument();
		});

		it("should handle large counts", () => {
			const largeMetrics = { ...mockMetrics, contactCount: 9999 };
			render(<OrganizationMetrics metrics={largeMetrics} />);

			expect(screen.getByText("9999")).toBeInTheDocument();
		});
	});
});
