import * as router from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizationInvoiceHistory } from "./OrganizationInvoiceHistory";

vi.mock("@tanstack/react-router", () => ({
	useParams: vi.fn(() => ({ tenant: "acme" })),
}));

// Mock InvoiceDetailDialog
vi.mock("./InvoiceDetailDialog", () => ({
	InvoiceDetailDialog: ({
		open,
		invoice,
	}: {
		open: boolean;
		invoice: { invoiceNumber: string } | null;
	}) =>
		open ? (
			<div data-testid="invoice-detail-dialog">
				Invoice Detail: {invoice?.invoiceNumber}
			</div>
		) : null,
}));

const mockUseParams = router.useParams as ReturnType<typeof vi.fn>;

const mockInvoices = [
	{
		id: "inv-1",
		invoiceNumber: "INV-001",
		status: "paid",
		subtotal: 10000, // cents
		tax: 1000,
		total: 11000,
		currency: "USD",
		issueDate: "2024-01-15",
		dueDate: "2024-02-15",
		paidAt: "2024-01-20",
		subscriptionId: "sub-1",
		createdAt: "2024-01-15",
		pdfPath: "/invoices/inv-1.pdf",
	},
	{
		id: "inv-2",
		invoiceNumber: "INV-002",
		status: "draft",
		subtotal: 5000,
		tax: 500,
		total: 5500,
		currency: "USD",
		issueDate: "2024-02-01",
		dueDate: "2024-03-01",
		paidAt: null,
		subscriptionId: "sub-1",
		createdAt: "2024-02-01",
	},
	{
		id: "inv-3",
		invoiceNumber: "INV-003",
		status: "overdue",
		subtotal: 20000,
		tax: 2000,
		total: 22000,
		currency: "USD",
		issueDate: "2024-01-01",
		dueDate: "2024-01-31",
		paidAt: null,
		subscriptionId: "sub-2",
		createdAt: "2024-01-01",
	},
	{
		id: "inv-4",
		invoiceNumber: "INV-004",
		status: "final",
		subtotal: 15000,
		tax: 1500,
		total: 16500,
		currency: "USD",
		issueDate: "2024-02-10",
		dueDate: "2024-03-10",
		paidAt: null,
		subscriptionId: "sub-1",
		createdAt: "2024-02-10",
	},
];

describe("OrganizationInvoiceHistory", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseParams.mockReturnValue({ tenant: "acme" });
		global.fetch = vi.fn();
	});

	describe("Render Behavior", () => {
		it("should render invoice table with invoices", () => {
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			expect(screen.getByText("INV-001")).toBeInTheDocument();
			expect(screen.getByText("INV-002")).toBeInTheDocument();
			expect(screen.getByText("INV-003")).toBeInTheDocument();
		});

		it("should render table headers", () => {
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			expect(screen.getByText("Invoice")).toBeInTheDocument();
			expect(screen.getByText("Status")).toBeInTheDocument();
			expect(screen.getByText("Issue Date")).toBeInTheDocument();
			expect(screen.getByText("Due Date")).toBeInTheDocument();
			expect(screen.getByText("Amount")).toBeInTheDocument();
			expect(screen.getByText("Actions")).toBeInTheDocument();
		});

		it("should render empty state when no invoices", () => {
			render(<OrganizationInvoiceHistory invoices={[]} />);

			expect(screen.getByText(/no invoices found/i)).toBeInTheDocument();
		});

		it("should display status badges with correct colors", () => {
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			expect(screen.getByText("paid")).toBeInTheDocument();
			expect(screen.getByText("draft")).toBeInTheDocument();
			expect(screen.getByText("overdue")).toBeInTheDocument();
		});

		it("should format currency amounts correctly", () => {
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			// $110.00 for INV-001 (11000 cents)
			expect(screen.getByText("$110.00")).toBeInTheDocument();
			// $55.00 for INV-002
			expect(screen.getByText("$55.00")).toBeInTheDocument();
			// $220.00 for INV-003
			expect(screen.getByText("$220.00")).toBeInTheDocument();
		});

		it("should display dates correctly", () => {
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			// Check for issue dates (format depends on locale)
			expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();
		});
	});

	describe("Filter Tabs", () => {
		it("should render filter tabs with counts", () => {
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			expect(screen.getByText(/All \(4\)/)).toBeInTheDocument();
			expect(screen.getByText(/Paid \(1\)/)).toBeInTheDocument();
			expect(screen.getByText(/Draft \(1\)/)).toBeInTheDocument();
			expect(screen.getByText(/Final \(1\)/)).toBeInTheDocument();
			expect(screen.getByText(/Overdue \(1\)/)).toBeInTheDocument();
		});

		it("should filter invoices by status when tab is clicked", async () => {
			const user = userEvent.setup();
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			// Click on Paid tab
			await user.click(screen.getByText(/Paid \(1\)/));

			// Should only show INV-001
			expect(screen.getByText("INV-001")).toBeInTheDocument();
			expect(screen.queryByText("INV-002")).not.toBeInTheDocument();
			expect(screen.queryByText("INV-003")).not.toBeInTheDocument();
		});

		it("should filter to draft invoices", async () => {
			const user = userEvent.setup();
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			await user.click(screen.getByText(/Draft \(1\)/));

			expect(screen.queryByText("INV-001")).not.toBeInTheDocument();
			expect(screen.getByText("INV-002")).toBeInTheDocument();
			expect(screen.queryByText("INV-003")).not.toBeInTheDocument();
		});

		it("should filter to overdue invoices", async () => {
			const user = userEvent.setup();
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			await user.click(screen.getByText(/Overdue \(1\)/));

			expect(screen.queryByText("INV-001")).not.toBeInTheDocument();
			expect(screen.queryByText("INV-002")).not.toBeInTheDocument();
			expect(screen.getByText("INV-003")).toBeInTheDocument();
		});

		it("should filter to final invoices", async () => {
			const user = userEvent.setup();
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			await user.click(screen.getByText(/Final \(1\)/));

			expect(screen.queryByText("INV-001")).not.toBeInTheDocument();
			expect(screen.queryByText("INV-002")).not.toBeInTheDocument();
			expect(screen.queryByText("INV-003")).not.toBeInTheDocument();
			expect(screen.getByText("INV-004")).toBeInTheDocument();
		});

		it("should show all invoices when All tab is clicked", async () => {
			const user = userEvent.setup();
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			// First filter to Paid
			await user.click(screen.getByText(/Paid \(1\)/));
			// Then back to All
			await user.click(screen.getByText(/All \(4\)/));

			expect(screen.getByText("INV-001")).toBeInTheDocument();
			expect(screen.getByText("INV-002")).toBeInTheDocument();
			expect(screen.getByText("INV-003")).toBeInTheDocument();
			expect(screen.getByText("INV-004")).toBeInTheDocument();
		});
	});

	describe("Summary Section", () => {
		it("should display invoice count summary", () => {
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			expect(screen.getByText(/Showing 4 of 4 invoices/i)).toBeInTheDocument();
		});

		it("should display total amount", () => {
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			// Total: 11000 + 5500 + 22000 + 16500 = 55000 cents = $550.00
			expect(screen.getByText(/Total:.*\$550\.00/)).toBeInTheDocument();
		});

		it("should update summary when filter changes", async () => {
			const user = userEvent.setup();
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			await user.click(screen.getByText(/Paid \(1\)/));

			expect(screen.getByText(/Showing 1 of 4 invoices/i)).toBeInTheDocument();
			expect(screen.getByText(/Total:.*\$110\.00/)).toBeInTheDocument();
		});

		it("should not show summary when no invoices match filter", async () => {
			const user = userEvent.setup();
			const invoicesNoDraft = mockInvoices.filter(
				(inv) => inv.status !== "draft",
			);
			render(<OrganizationInvoiceHistory invoices={invoicesNoDraft} />);

			await user.click(screen.getByText(/Draft \(0\)/));

			// Summary should not be shown when no invoices
			expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
		});
	});

	describe("View Invoice Action", () => {
		it("should open invoice detail dialog when view button is clicked", async () => {
			const user = userEvent.setup();
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			// Find and click the view button (Eye icon)
			const viewButtons = screen.getAllByTitle(/view invoice details/i);
			await user.click(viewButtons[0]);

			expect(screen.getByTestId("invoice-detail-dialog")).toBeInTheDocument();
			expect(screen.getByText(/Invoice Detail: INV-001/)).toBeInTheDocument();
		});
	});

	describe("Download PDF Action", () => {
		it("should call PDF API when download button is clicked", async () => {
			const user = userEvent.setup();
			const mockBlob = new Blob(["pdf content"], { type: "application/pdf" });
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				blob: () => Promise.resolve(mockBlob),
			});

			// Mock URL methods
			const originalCreateObjectURL = URL.createObjectURL;
			const originalRevokeObjectURL = URL.revokeObjectURL;
			URL.createObjectURL = vi.fn(() => "blob:http://localhost/test");
			URL.revokeObjectURL = vi.fn();

			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			const downloadButtons = screen.getAllByTitle(/download pdf/i);
			await user.click(downloadButtons[0]);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					"/api/tenant/acme/invoices/inv-1/pdf",
				);
			});

			// Cleanup
			URL.createObjectURL = originalCreateObjectURL;
			URL.revokeObjectURL = originalRevokeObjectURL;
		});

		it("should show alert when PDF download fails", async () => {
			const user = userEvent.setup();
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: false,
				status: 404,
			});

			const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			const downloadButtons = screen.getAllByTitle(/download pdf/i);
			await user.click(downloadButtons[0]);

			await waitFor(() => {
				expect(alertSpy).toHaveBeenCalledWith(
					"PDF not available for this invoice",
				);
			});

			alertSpy.mockRestore();
		});
	});

	describe("Status Icons", () => {
		it("should render CheckCircle icon for paid status", () => {
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			// The paid invoice row should contain a check icon
			const paidRow = screen.getByText("INV-001").closest("tr");
			expect(paidRow).toBeInTheDocument();
		});

		it("should render Clock icon for draft status", () => {
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			const draftRow = screen.getByText("INV-002").closest("tr");
			expect(draftRow).toBeInTheDocument();
		});

		it("should render AlertCircle icon for overdue status", () => {
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			const overdueRow = screen.getByText("INV-003").closest("tr");
			expect(overdueRow).toBeInTheDocument();
		});

		it("should render FileCheck icon for final status", () => {
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			const finalRow = screen.getByText("INV-004").closest("tr");
			expect(finalRow).toBeInTheDocument();
			expect(screen.getByText("final")).toBeInTheDocument();
		});
	});

	describe("Finalize Invoice Action", () => {
		it("should show Finalize button only for draft invoices", () => {
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			// Draft invoice should have Finalize button
			const draftRow = screen.getByText("INV-002").closest("tr");
			expect(draftRow).toBeInTheDocument();
			expect(screen.getByText("Finalize")).toBeInTheDocument();

			// Paid invoice should not have Finalize button
			expect(screen.queryAllByText("Finalize")).toHaveLength(1);
		});

		it("should call finalize API when Finalize button is clicked", async () => {
			const user = userEvent.setup();
			const onInvoiceUpdated = vi.fn();
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				headers: new Headers({ 'content-type': 'application/json' }),
				json: async () => ({ success: true, invoice: { id: "inv-2", status: "final" } }),
			});

			render(<OrganizationInvoiceHistory invoices={mockInvoices} onInvoiceUpdated={onInvoiceUpdated} />);

			const finalizeButton = screen.getByText("Finalize");
			await user.click(finalizeButton);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					"/api/tenant/acme/invoices/inv-2/finalize",
					{ method: "POST" },
				);
			});

			await waitFor(() => {
				expect(onInvoiceUpdated).toHaveBeenCalled();
			});
		});

		it("should show loading state while finalizing", async () => {
			const user = userEvent.setup();
			(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
				() => new Promise((resolve) => setTimeout(() => resolve({
					ok: true,
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ success: true }),
				}), 100)),
			);

			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			const finalizeButton = screen.getByText("Finalize");
			await user.click(finalizeButton);

			expect(screen.getByText("Finalizing...")).toBeInTheDocument();
		});

		it("should show error alert when finalize fails", async () => {
			const user = userEvent.setup();
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: false,
				headers: new Headers({ 'content-type': 'application/json' }),
				json: async () => ({ error: "Invoice not found" }),
			});

			const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			const finalizeButton = screen.getByText("Finalize");
			await user.click(finalizeButton);

			await waitFor(() => {
				expect(alertSpy).toHaveBeenCalled();
			});

			alertSpy.mockRestore();
		});
	});

	describe("Mark as Paid Action", () => {
		it("should show Mark as Paid button only for final invoices", () => {
			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			// Final invoice should have Mark as Paid button
			expect(screen.getByText("Mark as Paid")).toBeInTheDocument();

			// Draft invoice should not have Mark as Paid button
			expect(screen.queryAllByText("Mark as Paid")).toHaveLength(1);
		});

		it("should call pay API when Mark as Paid button is clicked", async () => {
			const user = userEvent.setup();
			const onInvoiceUpdated = vi.fn();
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				headers: new Headers({ 'content-type': 'application/json' }),
				json: async () => ({ success: true, invoice: { id: "inv-4", status: "paid" } }),
			});

			render(<OrganizationInvoiceHistory invoices={mockInvoices} onInvoiceUpdated={onInvoiceUpdated} />);

			const markAsPaidButton = screen.getByText("Mark as Paid");
			await user.click(markAsPaidButton);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					"/api/tenant/acme/invoices/inv-4/pay",
					{ method: "POST" },
				);
			});

			await waitFor(() => {
				expect(onInvoiceUpdated).toHaveBeenCalled();
			});
		});

		it("should show loading state while marking as paid", async () => {
			const user = userEvent.setup();
			(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
				() => new Promise((resolve) => setTimeout(() => resolve({
					ok: true,
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ success: true }),
				}), 100)),
			);

			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			const markAsPaidButton = screen.getByText("Mark as Paid");
			await user.click(markAsPaidButton);

			expect(screen.getByText("Marking...")).toBeInTheDocument();
		});

		it("should show error alert when mark as paid fails", async () => {
			const user = userEvent.setup();
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: false,
				headers: new Headers({ 'content-type': 'application/json' }),
				json: async () => ({ error: "Invoice not found" }),
			});

			const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

			render(<OrganizationInvoiceHistory invoices={mockInvoices} />);

			const markAsPaidButton = screen.getByText("Mark as Paid");
			await user.click(markAsPaidButton);

			await waitFor(() => {
				expect(alertSpy).toHaveBeenCalled();
			});

			alertSpy.mockRestore();
		});
	});
});
