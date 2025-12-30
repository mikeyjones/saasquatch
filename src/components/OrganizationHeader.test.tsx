import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationHeader } from "./OrganizationHeader";

const mockCustomer = {
	id: "cust-1",
	name: "Acme Corp",
	slug: "acme-corp",
	logo: null,
	industry: "Technology",
	website: "https://www.acme.com",
	billingEmail: "billing@acme.com",
	subscriptionStatus: "active",
	importance: "high",
	tags: ["enterprise", "priority"],
};

const mockSubscription = {
	id: "sub-1",
	subscriptionNumber: "SUB-001",
	planName: "Enterprise Plan",
	productId: "prod-1",
	productName: "Acme CRM Platform",
	productStatus: "active",
	status: "active",
	billingCycle: "monthly",
	mrr: 49900, // $499.00 in cents
	currentPeriodStart: new Date().toISOString(),
	currentPeriodEnd: new Date().toISOString(),
	createdAt: new Date().toISOString(),
};

describe("OrganizationHeader", () => {
	const mockOnEdit = vi.fn();
	const mockOnAddContact = vi.fn();
	const mockOnCreateInvoice = vi.fn();

	const defaultProps = {
		customer: mockCustomer,
		subscriptions: [mockSubscription],
		onEdit: mockOnEdit,
		onAddContact: mockOnAddContact,
		onCreateInvoice: mockOnCreateInvoice,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Render Behavior", () => {
		it("should render customer name", () => {
			render(<OrganizationHeader {...defaultProps} />);

			expect(screen.getByText("Acme Corp")).toBeInTheDocument();
		});

		it("should render Building2 icon when no logo", () => {
			render(<OrganizationHeader {...defaultProps} />);

			// Should render the placeholder icon (Building2)
			expect(
				screen.getByRole("heading", { name: "Acme Corp" }),
			).toBeInTheDocument();
		});

		it("should render logo when provided", () => {
			const customerWithLogo = {
				...mockCustomer,
				logo: "https://example.com/logo.png",
			};

			render(
				<OrganizationHeader {...defaultProps} customer={customerWithLogo} />,
			);

			const logo = screen.getByAltText("Acme Corp");
			expect(logo).toHaveAttribute("src", "https://example.com/logo.png");
		});

		it("should render industry", () => {
			render(<OrganizationHeader {...defaultProps} />);

			expect(screen.getByText("Technology")).toBeInTheDocument();
		});

		it("should render website hostname as link", () => {
			render(<OrganizationHeader {...defaultProps} />);

			const websiteLink = screen.getByText("www.acme.com");
			expect(websiteLink).toBeInTheDocument();
			expect(websiteLink.closest("a")).toHaveAttribute(
				"href",
				"https://www.acme.com",
			);
			expect(websiteLink.closest("a")).toHaveAttribute("target", "_blank");
		});

		it("should render billing email as mailto link", () => {
			render(<OrganizationHeader {...defaultProps} />);

			const emailLink = screen.getByText("billing@acme.com");
			expect(emailLink).toBeInTheDocument();
			expect(emailLink.closest("a")).toHaveAttribute(
				"href",
				"mailto:billing@acme.com",
			);
		});

		it("should not render industry when null", () => {
			const customerNoIndustry = { ...mockCustomer, industry: null };

			render(
				<OrganizationHeader {...defaultProps} customer={customerNoIndustry} />,
			);

			expect(screen.queryByText("Technology")).not.toBeInTheDocument();
		});

		it("should not render website when null", () => {
			const customerNoWebsite = { ...mockCustomer, website: null };

			render(
				<OrganizationHeader {...defaultProps} customer={customerNoWebsite} />,
			);

			expect(screen.queryByText("www.acme.com")).not.toBeInTheDocument();
		});

		it("should not render billing email when null", () => {
			const customerNoEmail = { ...mockCustomer, billingEmail: null };

			render(
				<OrganizationHeader {...defaultProps} customer={customerNoEmail} />,
			);

			expect(screen.queryByText("billing@acme.com")).not.toBeInTheDocument();
		});
	});

	describe("Status Badge", () => {
		it("should render subscription status badge", () => {
			render(<OrganizationHeader {...defaultProps} />);

			expect(screen.getByText("active")).toBeInTheDocument();
		});

		it("should not render status badge when status is null", () => {
			const customerNoStatus = { ...mockCustomer, subscriptionStatus: null };

			render(
				<OrganizationHeader {...defaultProps} customer={customerNoStatus} />,
			);

			// Should not have the status badge (but might have the importance badge)
			const badges = screen
				.getAllByRole("generic")
				.filter((el) => el.classList.contains("rounded-full"));
			expect(badges.some((b) => b.textContent === "active")).toBe(false);
		});

		it("should render trialing status", () => {
			const trialingCustomer = {
				...mockCustomer,
				subscriptionStatus: "trialing",
			};

			render(
				<OrganizationHeader {...defaultProps} customer={trialingCustomer} />,
			);

			expect(screen.getByText("trialing")).toBeInTheDocument();
		});

		it("should render past_due status", () => {
			const pastDueCustomer = {
				...mockCustomer,
				subscriptionStatus: "past_due",
			};

			render(
				<OrganizationHeader {...defaultProps} customer={pastDueCustomer} />,
			);

			expect(screen.getByText("past_due")).toBeInTheDocument();
		});

		it("should render canceled status", () => {
			const canceledCustomer = {
				...mockCustomer,
				subscriptionStatus: "canceled",
			};

			render(
				<OrganizationHeader {...defaultProps} customer={canceledCustomer} />,
			);

			expect(screen.getByText("canceled")).toBeInTheDocument();
		});
	});

	describe("Importance Badge", () => {
		it("should render high importance badge", () => {
			render(<OrganizationHeader {...defaultProps} />);

			expect(screen.getByText("high")).toBeInTheDocument();
		});

		it("should render normal importance when null", () => {
			const customerNullImportance = { ...mockCustomer, importance: null };

			render(
				<OrganizationHeader
					{...defaultProps}
					customer={customerNullImportance}
				/>,
			);

			expect(screen.getByText("normal")).toBeInTheDocument();
		});

		it("should render vip importance", () => {
			const vipCustomer = { ...mockCustomer, importance: "vip" };

			render(<OrganizationHeader {...defaultProps} customer={vipCustomer} />);

			expect(screen.getByText("vip")).toBeInTheDocument();
		});

		it("should render low importance", () => {
			const lowImportanceCustomer = { ...mockCustomer, importance: "low" };

			render(
				<OrganizationHeader
					{...defaultProps}
					customer={lowImportanceCustomer}
				/>,
			);

			expect(screen.getByText("low")).toBeInTheDocument();
		});
	});

	describe("Tags", () => {
		it("should render tags", () => {
			render(<OrganizationHeader {...defaultProps} />);

			expect(screen.getByText("enterprise")).toBeInTheDocument();
			expect(screen.getByText("priority")).toBeInTheDocument();
		});

		it("should not render tags section when no tags", () => {
			const customerNoTags = { ...mockCustomer, tags: [] };

			render(
				<OrganizationHeader {...defaultProps} customer={customerNoTags} />,
			);

			expect(screen.queryByText("enterprise")).not.toBeInTheDocument();
			expect(screen.queryByText("priority")).not.toBeInTheDocument();
		});
	});

	describe("Subscription Info", () => {
		it("should render product subscription summary", () => {
			render(<OrganizationHeader {...defaultProps} />);

			expect(screen.getByText(/Products:/i)).toBeInTheDocument();
			expect(screen.getByText(/Total MRR:/i)).toBeInTheDocument();
			expect(screen.getByText("$499.00")).toBeInTheDocument();
		});

		it("should render product name badge", () => {
			render(<OrganizationHeader {...defaultProps} />);

			expect(screen.getByText("Acme CRM Platform")).toBeInTheDocument();
		});

		it("should render active subscription count", () => {
			render(<OrganizationHeader {...defaultProps} />);

			const activeLabel = screen.getByText(/Active:/i);
			expect(activeLabel).toBeInTheDocument();
			// Check that the count appears after the Active label
			const activeSection = activeLabel.closest("div");
			expect(activeSection).toHaveTextContent("1");
		});

		it("should not render subscription section when empty array", () => {
			render(<OrganizationHeader {...defaultProps} subscriptions={[]} />);

			expect(screen.queryByText(/Products:/i)).not.toBeInTheDocument();
			expect(screen.queryByText(/Total MRR:/i)).not.toBeInTheDocument();
		});

		it("should handle subscriptions without products", () => {
			const subscriptionWithoutProduct = {
				...mockSubscription,
				productId: null,
				productName: null,
				productStatus: null,
			};

			render(
				<OrganizationHeader
					{...defaultProps}
					subscriptions={[subscriptionWithoutProduct]}
				/>,
			);

			expect(screen.getByText(/Products:/i)).toBeInTheDocument();
			expect(screen.getByText(/plan\(s\)/i)).toBeInTheDocument();
		});

		it("should show multiple products", () => {
			const subscription2 = {
				...mockSubscription,
				id: "sub-2",
				productId: "prod-2",
				productName: "Another Product",
				productStatus: "active",
			};

			render(
				<OrganizationHeader
					{...defaultProps}
					subscriptions={[mockSubscription, subscription2]}
				/>,
			);

			expect(screen.getByText("Acme CRM Platform")).toBeInTheDocument();
			expect(screen.getByText("Another Product")).toBeInTheDocument();
		});
	});

	describe("Action Buttons", () => {
		it("should render Edit button", () => {
			render(<OrganizationHeader {...defaultProps} />);

			expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
		});

		it("should call onEdit when Edit button is clicked", async () => {
			const user = userEvent.setup();
			render(<OrganizationHeader {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /edit/i }));

			expect(mockOnEdit).toHaveBeenCalled();
		});

		it("should render Add Contact button", () => {
			render(<OrganizationHeader {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /add contact/i }),
			).toBeInTheDocument();
		});

		it("should call onAddContact when Add Contact button is clicked", async () => {
			const user = userEvent.setup();
			render(<OrganizationHeader {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /add contact/i }));

			expect(mockOnAddContact).toHaveBeenCalled();
		});

		it("should render Create Invoice button", () => {
			render(<OrganizationHeader {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /create invoice/i }),
			).toBeInTheDocument();
		});

		it("should call onCreateInvoice when Create Invoice button is clicked", async () => {
			const user = userEvent.setup();
			render(<OrganizationHeader {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /create invoice/i }));

			expect(mockOnCreateInvoice).toHaveBeenCalled();
		});
	});
});
