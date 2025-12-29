import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationTicketHistory } from "./OrganizationTicketHistory";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		params,
	}: {
		children: React.ReactNode;
		to: string;
		params?: Record<string, string>;
	}) => {
		// Resolve params in the route template
		let href = to;
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				href = href.replace(`$${key}`, value);
			}
		}
		return <a href={href}>{children}</a>;
	},
}));

const mockTickets = [
	{
		id: "ticket-1",
		ticketNumber: "TKT-001",
		title: "Login issues",
		status: "open",
		priority: "urgent",
		channel: "email",
		tenantUserId: "user-1",
		customerName: "John Doe",
		customerEmail: "john@example.com",
		assignedToUserId: "agent-1",
		createdAt: "2024-01-15T10:00:00Z",
		updatedAt: "2024-01-16T14:00:00Z",
		resolvedAt: null,
	},
	{
		id: "ticket-2",
		ticketNumber: "TKT-002",
		title: "Billing question",
		status: "pending",
		priority: "high",
		channel: "chat",
		tenantUserId: "user-2",
		customerName: "Jane Smith",
		customerEmail: "jane@example.com",
		assignedToUserId: null,
		createdAt: "2024-01-14T09:00:00Z",
		updatedAt: null,
		resolvedAt: null,
	},
	{
		id: "ticket-3",
		ticketNumber: "TKT-003",
		title: "Feature request",
		status: "closed",
		priority: "normal",
		channel: "web",
		tenantUserId: "user-1",
		customerName: "John Doe",
		customerEmail: "john@example.com",
		assignedToUserId: "agent-2",
		createdAt: "2024-01-10T08:00:00Z",
		updatedAt: "2024-01-12T16:00:00Z",
		resolvedAt: "2024-01-12T16:00:00Z",
	},
	{
		id: "ticket-4",
		ticketNumber: "TKT-004",
		title: "General inquiry",
		status: "open",
		priority: "low",
		channel: "email",
		tenantUserId: "user-3",
		customerName: "Bob Wilson",
		customerEmail: "bob@example.com",
		assignedToUserId: "agent-1",
		createdAt: "2024-01-13T11:00:00Z",
		updatedAt: "2024-01-13T12:00:00Z",
		resolvedAt: null,
	},
];

describe("OrganizationTicketHistory", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Render Behavior", () => {
		it("should render tickets table", () => {
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			expect(screen.getByText("TKT-001")).toBeInTheDocument();
			expect(screen.getByText("TKT-002")).toBeInTheDocument();
			expect(screen.getByText("TKT-003")).toBeInTheDocument();
			expect(screen.getByText("TKT-004")).toBeInTheDocument();
		});

		it("should render table headers", () => {
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			expect(screen.getByText("Ticket #")).toBeInTheDocument();
			expect(screen.getByText("Subject")).toBeInTheDocument();
			expect(screen.getByText("Status")).toBeInTheDocument();
			expect(screen.getByText("Priority")).toBeInTheDocument();
			expect(screen.getByText("Contact")).toBeInTheDocument();
			expect(screen.getByText("Created")).toBeInTheDocument();
			expect(screen.getByText("Last Updated")).toBeInTheDocument();
		});

		it("should render empty state when no tickets", () => {
			render(<OrganizationTicketHistory tickets={[]} tenant="acme" />);

			expect(screen.getByText(/no tickets found/i)).toBeInTheDocument();
		});

		it("should display ticket count", () => {
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			expect(screen.getByText(/showing 4 of 4 tickets/i)).toBeInTheDocument();
		});

		it("should display ticket titles", () => {
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			expect(screen.getByText("Login issues")).toBeInTheDocument();
			expect(screen.getByText("Billing question")).toBeInTheDocument();
			expect(screen.getByText("Feature request")).toBeInTheDocument();
		});

		it("should display customer names", () => {
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			expect(screen.getAllByText("John Doe")).toHaveLength(2); // 2 tickets from John
			expect(screen.getByText("Jane Smith")).toBeInTheDocument();
			expect(screen.getByText("Bob Wilson")).toBeInTheDocument();
		});
	});

	describe("Status Badges", () => {
		it("should display status badges", () => {
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			expect(screen.getAllByText("open")).toHaveLength(2);
			expect(screen.getByText("pending")).toBeInTheDocument();
			expect(screen.getByText("closed")).toBeInTheDocument();
		});
	});

	describe("Priority Badges", () => {
		it("should display priority badges", () => {
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			expect(screen.getByText("urgent")).toBeInTheDocument();
			expect(screen.getByText("high")).toBeInTheDocument();
			expect(screen.getByText("normal")).toBeInTheDocument();
			expect(screen.getByText("low")).toBeInTheDocument();
		});
	});

	describe("Status Filter", () => {
		it("should render status filter dropdown", () => {
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			expect(screen.getByText(/Status: All/)).toBeInTheDocument();
		});

		it("should filter by open status", async () => {
			const user = userEvent.setup();
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			// Click the status filter button
			await user.click(screen.getByText(/Status: All/));

			// Click on Open option
			await user.click(screen.getByText("Open"));

			// Should only show open tickets
			expect(screen.getByText("TKT-001")).toBeInTheDocument();
			expect(screen.getByText("TKT-004")).toBeInTheDocument();
			expect(screen.queryByText("TKT-002")).not.toBeInTheDocument();
			expect(screen.queryByText("TKT-003")).not.toBeInTheDocument();

			// Count should update
			expect(screen.getByText(/showing 2 of 4 tickets/i)).toBeInTheDocument();
		});

		it("should filter by closed status", async () => {
			const user = userEvent.setup();
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			await user.click(screen.getByText(/Status: All/));
			await user.click(screen.getByText("Closed"));

			expect(screen.queryByText("TKT-001")).not.toBeInTheDocument();
			expect(screen.getByText("TKT-003")).toBeInTheDocument();

			expect(screen.getByText(/showing 1 of 4 tickets/i)).toBeInTheDocument();
		});

		it("should filter by pending status", async () => {
			const user = userEvent.setup();
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			await user.click(screen.getByText(/Status: All/));
			await user.click(screen.getByText("Pending"));

			expect(screen.getByText("TKT-002")).toBeInTheDocument();
			expect(screen.queryByText("TKT-001")).not.toBeInTheDocument();

			expect(screen.getByText(/showing 1 of 4 tickets/i)).toBeInTheDocument();
		});
	});

	describe("Priority Filter", () => {
		it("should render priority filter dropdown", () => {
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			expect(screen.getByText(/Priority: All/)).toBeInTheDocument();
		});

		it("should filter by urgent priority", async () => {
			const user = userEvent.setup();
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			await user.click(screen.getByText(/Priority: All/));
			await user.click(screen.getByText("Urgent"));

			expect(screen.getByText("TKT-001")).toBeInTheDocument();
			expect(screen.queryByText("TKT-002")).not.toBeInTheDocument();

			expect(screen.getByText(/showing 1 of 4 tickets/i)).toBeInTheDocument();
		});

		it("should filter by high priority", async () => {
			const user = userEvent.setup();
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			await user.click(screen.getByText(/Priority: All/));
			await user.click(screen.getByText("High"));

			expect(screen.getByText("TKT-002")).toBeInTheDocument();
			expect(screen.queryByText("TKT-001")).not.toBeInTheDocument();
		});

		it("should filter by normal priority", async () => {
			const user = userEvent.setup();
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			await user.click(screen.getByText(/Priority: All/));
			await user.click(screen.getByText("Normal"));

			expect(screen.getByText("TKT-003")).toBeInTheDocument();
			expect(screen.queryByText("TKT-001")).not.toBeInTheDocument();
		});

		it("should filter by low priority", async () => {
			const user = userEvent.setup();
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			await user.click(screen.getByText(/Priority: All/));
			await user.click(screen.getByText("Low"));

			expect(screen.getByText("TKT-004")).toBeInTheDocument();
			expect(screen.queryByText("TKT-001")).not.toBeInTheDocument();
		});
	});

	describe("Combined Filters", () => {
		it("should combine status and priority filters", async () => {
			const user = userEvent.setup();
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			// Filter by open status
			await user.click(screen.getByText(/Status: All/));
			await user.click(screen.getByText("Open"));

			// Then filter by urgent priority
			await user.click(screen.getByText(/Priority: All/));
			await user.click(screen.getByText("Urgent"));

			// Only TKT-001 is both open and urgent
			expect(screen.getByText("TKT-001")).toBeInTheDocument();
			expect(screen.queryByText("TKT-004")).not.toBeInTheDocument();

			expect(screen.getByText(/showing 1 of 4 tickets/i)).toBeInTheDocument();
		});

		it("should show empty state when filters match no tickets", async () => {
			const user = userEvent.setup();
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			// Filter by closed status
			await user.click(screen.getByText(/Status: All/));
			await user.click(screen.getByText("Closed"));

			// Then filter by urgent priority (no closed+urgent tickets exist)
			await user.click(screen.getByText(/Priority: All/));
			await user.click(screen.getByText("Urgent"));

			expect(screen.getByText(/no tickets found/i)).toBeInTheDocument();
			expect(screen.getByText(/showing 0 of 4 tickets/i)).toBeInTheDocument();
		});
	});

	describe("Links", () => {
		it("should render ticket number as link to tickets page", () => {
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			const ticketLink = screen.getByText("TKT-001").closest("a");
			expect(ticketLink).toHaveAttribute("href", "/acme/app/support/tickets");
		});

		it("should render customer name as link to member page", () => {
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			const customerLinks = screen.getAllByText("John Doe");
			const customerLink = customerLinks[0].closest("a");
			expect(customerLink).toHaveAttribute(
				"href",
				"/acme/app/support/members/user-1",
			);
		});
	});

	describe("Date Formatting", () => {
		it("should display created date", () => {
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

			expect(screen.getByText("Jan 15, 2024")).toBeInTheDocument();
		});

		it("should display dash for null updated date", () => {
			render(<OrganizationTicketHistory tickets={mockTickets} tenant="acme" />);

		// TKT-002 has null updatedAt
		screen.getAllByRole("row");
		// Find the row for TKT-002 and check it has a dash
		expect(screen.getAllByText("-")).toHaveLength(1);
		});
	});
});
