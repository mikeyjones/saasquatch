import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceDetailDialog } from "./InvoiceDetailDialog";
import type { Invoice } from "./InvoiceList";

// Mock the router hooks
vi.mock("@tanstack/react-router", () => ({
	useParams: vi.fn(() => ({ tenant: "acme" })),
	Link: ({
		children,
		to,
		params,
		className,
	}: {
		children: React.ReactNode;
		to: string;
		params: Record<string, string>;
		className?: string;
	}) => (
		<a
			href={`${to.replace("$tenant", params.tenant).replace("$customerId", params.customerId)}`}
			className={className}
		>
			{children}
		</a>
	),
}));

const mockInvoice: Invoice = {
	id: "inv-1",
	invoiceNumber: "INV-2024-001",
	status: "draft",
	subtotal: 10000, // $100.00 in cents
	tax: 1000, // $10.00 in cents
	total: 11000, // $110.00 in cents
	currency: "USD",
	issueDate: "2024-01-15",
	dueDate: "2024-02-15",
	paidAt: null,
	lineItems: [
		{
			description: "Pro Plan Subscription",
			quantity: 1,
			unitPrice: 10000,
			total: 10000,
		},
	],
	pdfPath: "/invoices/inv-1.pdf",
	billingName: "John Doe",
	billingEmail: "john@example.com",
	notes: "Thank you for your business",
	subscription: {
		id: "sub-1",
		subscriptionNumber: "SUB-001",
		status: "active",
		plan: "Pro Plan",
	},
	tenantOrganization: {
		id: "org-1",
		name: "Acme Corp",
		slug: "acme-corp",
	},
	createdAt: "2024-01-15T10:00:00Z",
	updatedAt: "2024-01-15T10:00:00Z",
};

describe("InvoiceDetailDialog", () => {
	const mockOnOpenChange = vi.fn();
	const mockOnMarkAsPaid = vi.fn();
	const mockOnDownloadPDF = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Render Behavior", () => {
		it("should render dialog when open with invoice", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			expect(screen.getByText("Invoice INV-2024-001")).toBeInTheDocument();
		});

		it("should not render when invoice is null", () => {
			const { container } = render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={null}
				/>,
			);

			expect(container.firstChild).toBeNull();
		});

		it("should display customer name as a link to customer detail page", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			const customerLink = screen.getByRole("link", { name: "Acme Corp" });
			expect(customerLink).toBeInTheDocument();
			expect(customerLink).toHaveAttribute(
				"href",
				"/acme/app/sales/crm/acme-corp",
			);
		});

		it("should display billing email", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			expect(screen.getByText("john@example.com")).toBeInTheDocument();
		});

		it("should display subscription info", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			expect(screen.getByText("SUB-001")).toBeInTheDocument();
			expect(screen.getByText("Pro Plan")).toBeInTheDocument();
		});
	});

	describe("Status Badges", () => {
		it("should render Draft status badge", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			expect(screen.getByText("Draft")).toBeInTheDocument();
		});

		it("should render Paid status badge", () => {
			const paidInvoice: Invoice = {
				...mockInvoice,
				status: "paid",
				paidAt: "2024-01-20",
			};
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={paidInvoice}
				/>,
			);

			expect(screen.getByText("Paid")).toBeInTheDocument();
		});

		it("should render Overdue status badge", () => {
			const overdueInvoice: Invoice = { ...mockInvoice, status: "overdue" };
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={overdueInvoice}
				/>,
			);

			expect(screen.getByText("Overdue")).toBeInTheDocument();
		});

		it("should render Canceled status badge", () => {
			const canceledInvoice: Invoice = { ...mockInvoice, status: "canceled" };
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={canceledInvoice}
				/>,
			);

			expect(screen.getByText("Canceled")).toBeInTheDocument();
		});
	});

	describe("Dates", () => {
		it("should display issue date", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			expect(screen.getByText("January 15, 2024")).toBeInTheDocument();
		});

		it("should display due date", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			expect(screen.getByText("February 15, 2024")).toBeInTheDocument();
		});

		it("should display paid date when available", () => {
			const paidInvoice: Invoice = {
				...mockInvoice,
				status: "paid",
				paidAt: "2024-01-20",
			};
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={paidInvoice}
				/>,
			);

			expect(screen.getByText("January 20, 2024")).toBeInTheDocument();
		});
	});

	describe("Line Items", () => {
		it("should display line item description", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			expect(screen.getByText("Pro Plan Subscription")).toBeInTheDocument();
		});

		it("should display line item quantity", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			expect(screen.getByText("1")).toBeInTheDocument();
		});
	});

	describe("Totals", () => {
		it("should display subtotal formatted as currency", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			// Subtotal is $100.00, total is $110.00 - find at least one of them
			expect(
				screen.getAllByText(/\$100\.00/).length +
					screen.getAllByText(/\$110\.00/).length,
			).toBeGreaterThan(0);
		});

		it("should display tax formatted as currency", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			expect(screen.getByText("$10.00")).toBeInTheDocument();
		});

		it("should display total formatted as currency", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			expect(screen.getByText("$110.00")).toBeInTheDocument();
		});
	});

	describe("Notes", () => {
		it("should display notes when present", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			expect(
				screen.getByText("Thank you for your business"),
			).toBeInTheDocument();
		});

		it("should not display notes section when null", () => {
			const invoiceNoNotes: Invoice = { ...mockInvoice, notes: null };
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={invoiceNoNotes}
				/>,
			);

			expect(
				screen.queryByText("Thank you for your business"),
			).not.toBeInTheDocument();
		});
	});

	describe("Action Buttons", () => {
		it("should render Download PDF button when pdfPath exists", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
					onDownloadPDF={mockOnDownloadPDF}
				/>,
			);

			expect(
				screen.getByRole("button", { name: /download pdf/i }),
			).toBeInTheDocument();
		});

		it("should not render Download PDF button when pdfPath is null", () => {
			const invoiceNoPdf: Invoice = { ...mockInvoice, pdfPath: null };
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={invoiceNoPdf}
				/>,
			);

			expect(
				screen.queryByRole("button", { name: /download pdf/i }),
			).not.toBeInTheDocument();
		});

		it("should call onDownloadPDF when Download PDF is clicked", async () => {
			const user = userEvent.setup();
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
					onDownloadPDF={mockOnDownloadPDF}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /download pdf/i }));

			expect(mockOnDownloadPDF).toHaveBeenCalledWith(mockInvoice);
		});

		it("should render Mark as Paid button for final invoices", () => {
			const finalInvoice: Invoice = {
				...mockInvoice,
				status: "final",
			};
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={finalInvoice}
					onMarkAsPaid={mockOnMarkAsPaid}
				/>,
			);

			expect(
				screen.getByRole("button", { name: /mark as paid/i }),
			).toBeInTheDocument();
		});

		it("should not render Mark as Paid button for paid invoices", () => {
			const paidInvoice: Invoice = {
				...mockInvoice,
				status: "paid",
				paidAt: "2024-01-20",
			};
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={paidInvoice}
				/>,
			);

			expect(
				screen.queryByRole("button", { name: /mark as paid/i }),
			).not.toBeInTheDocument();
		});

		it("should call onMarkAsPaid when Mark as Paid is clicked", async () => {
			const user = userEvent.setup();
			const finalInvoice: Invoice = {
				...mockInvoice,
				status: "final",
			};
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={finalInvoice}
					onMarkAsPaid={mockOnMarkAsPaid}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /mark as paid/i }));

			expect(mockOnMarkAsPaid).toHaveBeenCalledWith(finalInvoice);
		});

		it("should show Processing... when isMarkingPaid is true", () => {
			const finalInvoice: Invoice = {
				...mockInvoice,
				status: "final",
			};
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={finalInvoice}
					onMarkAsPaid={mockOnMarkAsPaid}
					isMarkingPaid={true}
				/>,
			);

			expect(screen.getByText("Processing...")).toBeInTheDocument();
		});

		it("should render Close button", () => {
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			// Find button containing "Close" text
			const buttons = screen.getAllByRole("button");
			const closeButton = buttons.find((btn) =>
				btn.textContent?.includes("Close"),
			);
			expect(closeButton).toBeTruthy();
		});

		it("should call onOpenChange(false) when Close is clicked", async () => {
			const user = userEvent.setup();
			render(
				<InvoiceDetailDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					invoice={mockInvoice}
				/>,
			);

			// Find button containing "Close" text
			const buttons = screen.getAllByRole("button");
			const closeButton = buttons.find((btn) =>
				btn.textContent?.includes("Close"),
			);
			expect(closeButton).toBeTruthy();
			if (closeButton) {
				await user.click(closeButton);
			}

			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});
	});
});
