import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationSupportHeader } from "./OrganizationSupportHeader";

const mockOrganization = {
	id: "org-1",
	name: "Acme Corp",
	logo: null,
	industry: "Technology",
	website: "https://acme.com",
	subscriptionPlan: "Pro",
	subscriptionStatus: "active",
	tags: ["enterprise", "priority"],
};

describe("OrganizationSupportHeader", () => {
	const mockOnCreateTicket = vi.fn();
	const mockOnContactCustomer = vi.fn();
	const mockOnAddNote = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Render Behavior", () => {
		it("should render organization name", () => {
			render(<OrganizationSupportHeader organization={mockOrganization} />);

			expect(screen.getByText("Acme Corp")).toBeInTheDocument();
		});

		it("should render industry", () => {
			render(<OrganizationSupportHeader organization={mockOrganization} />);

			expect(screen.getByText("Technology")).toBeInTheDocument();
		});

		it("should render website link", () => {
			render(<OrganizationSupportHeader organization={mockOrganization} />);

			const websiteLink = screen.getByText("https://acme.com");
			expect(websiteLink).toHaveAttribute("href", "https://acme.com");
			expect(websiteLink).toHaveAttribute("target", "_blank");
		});

		it("should render subscription plan", () => {
			render(<OrganizationSupportHeader organization={mockOrganization} />);

			expect(screen.getByText("Pro")).toBeInTheDocument();
		});

		it("should render Building2 icon when no logo", () => {
			render(<OrganizationSupportHeader organization={mockOrganization} />);

			expect(
				screen.getByRole("heading", { name: "Acme Corp" }),
			).toBeInTheDocument();
		});

		it("should render logo when provided", () => {
			const orgWithLogo = {
				...mockOrganization,
				logo: "https://example.com/logo.png",
			};

			render(<OrganizationSupportHeader organization={orgWithLogo} />);

			const logo = screen.getByAltText("Acme Corp");
			expect(logo).toHaveAttribute("src", "https://example.com/logo.png");
		});

		it("should not render industry when null", () => {
			const orgNoIndustry = { ...mockOrganization, industry: null };

			render(<OrganizationSupportHeader organization={orgNoIndustry} />);

			expect(screen.queryByText("Technology")).not.toBeInTheDocument();
		});

		it("should not render website when null", () => {
			const orgNoWebsite = { ...mockOrganization, website: null };

			render(<OrganizationSupportHeader organization={orgNoWebsite} />);

			expect(screen.queryByText("https://acme.com")).not.toBeInTheDocument();
		});
	});

	describe("Status Badge", () => {
		it("should render active status badge", () => {
			render(<OrganizationSupportHeader organization={mockOrganization} />);

			expect(screen.getByText("active")).toBeInTheDocument();
		});

		it("should render trialing status badge", () => {
			const trialingOrg = {
				...mockOrganization,
				subscriptionStatus: "trialing",
			};

			render(<OrganizationSupportHeader organization={trialingOrg} />);

			expect(screen.getByText("trialing")).toBeInTheDocument();
		});

		it("should render canceled status badge", () => {
			const canceledOrg = {
				...mockOrganization,
				subscriptionStatus: "canceled",
			};

			render(<OrganizationSupportHeader organization={canceledOrg} />);

			expect(screen.getByText("canceled")).toBeInTheDocument();
		});

		it("should render past_due status badge with space", () => {
			const pastDueOrg = {
				...mockOrganization,
				subscriptionStatus: "past_due",
			};

			render(<OrganizationSupportHeader organization={pastDueOrg} />);

			expect(screen.getByText("past due")).toBeInTheDocument();
		});

		it("should not render status badge when null", () => {
			const orgNoStatus = { ...mockOrganization, subscriptionStatus: null };

			render(<OrganizationSupportHeader organization={orgNoStatus} />);

			expect(screen.queryByText("active")).not.toBeInTheDocument();
		});
	});

	describe("Tags", () => {
		it("should render tags", () => {
			render(<OrganizationSupportHeader organization={mockOrganization} />);

			expect(screen.getByText("enterprise")).toBeInTheDocument();
			expect(screen.getByText("priority")).toBeInTheDocument();
		});

		it("should not render tags section when empty", () => {
			const orgNoTags = { ...mockOrganization, tags: [] };

			render(<OrganizationSupportHeader organization={orgNoTags} />);

			expect(screen.queryByText("enterprise")).not.toBeInTheDocument();
		});
	});

	describe("Action Buttons", () => {
		it("should render Create Ticket button when callback provided", () => {
			render(
				<OrganizationSupportHeader
					organization={mockOrganization}
					onCreateTicket={mockOnCreateTicket}
				/>,
			);

			expect(
				screen.getByRole("button", { name: /create ticket/i }),
			).toBeInTheDocument();
		});

		it("should not render Create Ticket button when callback not provided", () => {
			render(<OrganizationSupportHeader organization={mockOrganization} />);

			expect(
				screen.queryByRole("button", { name: /create ticket/i }),
			).not.toBeInTheDocument();
		});

		it("should call onCreateTicket when Create Ticket is clicked", async () => {
			const user = userEvent.setup();
			render(
				<OrganizationSupportHeader
					organization={mockOrganization}
					onCreateTicket={mockOnCreateTicket}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /create ticket/i }));

			expect(mockOnCreateTicket).toHaveBeenCalled();
		});

		it("should render Contact Customer button when callback provided", () => {
			render(
				<OrganizationSupportHeader
					organization={mockOrganization}
					onContactCustomer={mockOnContactCustomer}
				/>,
			);

			expect(
				screen.getByRole("button", { name: /contact customer/i }),
			).toBeInTheDocument();
		});

		it("should call onContactCustomer when Contact Customer is clicked", async () => {
			const user = userEvent.setup();
			render(
				<OrganizationSupportHeader
					organization={mockOrganization}
					onContactCustomer={mockOnContactCustomer}
				/>,
			);

			await user.click(
				screen.getByRole("button", { name: /contact customer/i }),
			);

			expect(mockOnContactCustomer).toHaveBeenCalled();
		});

		it("should render Add Note button when callback provided", () => {
			render(
				<OrganizationSupportHeader
					organization={mockOrganization}
					onAddNote={mockOnAddNote}
				/>,
			);

			expect(
				screen.getByRole("button", { name: /add note/i }),
			).toBeInTheDocument();
		});

		it("should call onAddNote when Add Note is clicked", async () => {
			const user = userEvent.setup();
			render(
				<OrganizationSupportHeader
					organization={mockOrganization}
					onAddNote={mockOnAddNote}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /add note/i }));

			expect(mockOnAddNote).toHaveBeenCalled();
		});
	});
});
