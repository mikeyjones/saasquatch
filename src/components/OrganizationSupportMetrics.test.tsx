import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrganizationSupportMetrics } from "./OrganizationSupportMetrics";

const mockMetrics = {
	totalTickets: 150,
	openTickets: 25,
	closedTickets: 120,
	urgentTickets: 5,
	ticketsThisMonth: 30,
	avgResponseTime: "2h 15m",
	contactCount: 8,
};

describe("OrganizationSupportMetrics", () => {
	describe("Render Behavior", () => {
		it("should render all metric cards", () => {
			render(<OrganizationSupportMetrics metrics={mockMetrics} />);

			expect(screen.getByText("Total Tickets")).toBeInTheDocument();
			expect(screen.getByText("Open Tickets")).toBeInTheDocument();
			expect(screen.getByText("Tickets This Month")).toBeInTheDocument();
			expect(screen.getByText("Urgent Tickets")).toBeInTheDocument();
			expect(screen.getByText("Team Members")).toBeInTheDocument();
		});

		it("should display total tickets count", () => {
			render(<OrganizationSupportMetrics metrics={mockMetrics} />);

			expect(screen.getByText("150")).toBeInTheDocument();
		});

		it("should display open tickets count", () => {
			render(<OrganizationSupportMetrics metrics={mockMetrics} />);

			expect(screen.getByText("25")).toBeInTheDocument();
		});

		it("should display tickets this month count", () => {
			render(<OrganizationSupportMetrics metrics={mockMetrics} />);

			expect(screen.getByText("30")).toBeInTheDocument();
		});

		it("should display urgent tickets count", () => {
			render(<OrganizationSupportMetrics metrics={mockMetrics} />);

			expect(screen.getByText("5")).toBeInTheDocument();
		});

		it("should display team members count", () => {
			render(<OrganizationSupportMetrics metrics={mockMetrics} />);

			expect(screen.getByText("8")).toBeInTheDocument();
		});
	});

	describe("Zero Values", () => {
		it("should display zero for no tickets", () => {
			const zeroMetrics = {
				...mockMetrics,
				totalTickets: 0,
				openTickets: 0,
				urgentTickets: 0,
				ticketsThisMonth: 0,
			};
			render(<OrganizationSupportMetrics metrics={zeroMetrics} />);

			// Should have multiple "0" values
			const zeros = screen.getAllByText("0");
			expect(zeros.length).toBeGreaterThanOrEqual(4);
		});
	});

	describe("Null Values", () => {
		it("should handle null avgResponseTime", () => {
			const nullResponseTime = { ...mockMetrics, avgResponseTime: null };
			render(<OrganizationSupportMetrics metrics={nullResponseTime} />);

			// Should still render all cards
			expect(screen.getByText("Total Tickets")).toBeInTheDocument();
		});
	});

	describe("Large Values", () => {
		it("should handle large ticket counts", () => {
			const largeMetrics = {
				...mockMetrics,
				totalTickets: 99999,
			};
			render(<OrganizationSupportMetrics metrics={largeMetrics} />);

			expect(screen.getByText("99999")).toBeInTheDocument();
		});
	});
});
