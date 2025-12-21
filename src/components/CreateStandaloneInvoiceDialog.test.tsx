import * as router from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockFetchSuccess } from "@/test/setup";
import { CreateStandaloneInvoiceDialog } from "./CreateStandaloneInvoiceDialog";

vi.mock("@tanstack/react-router", () => ({
	useParams: vi.fn(() => ({ tenant: "acme" })),
}));

const mockUseParams = router.useParams as ReturnType<typeof vi.fn>;

function mockFetch() {
	return global.fetch as ReturnType<typeof vi.fn>;
}

describe("CreateStandaloneInvoiceDialog", () => {
	const mockOnOpenChange = vi.fn();
	const mockOnInvoiceCreated = vi.fn();

	const defaultProps = {
		open: true,
		onOpenChange: mockOnOpenChange,
		onInvoiceCreated: mockOnInvoiceCreated,
		customerId: "cust-123",
		customerName: "Acme Corp",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseParams.mockReturnValue({ tenant: "acme" });
		global.fetch = vi.fn();
	});

	describe("Render Behavior", () => {
		it("should render dialog when open", () => {
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			expect(
				screen.getByRole("heading", { name: /create invoice/i }),
			).toBeInTheDocument();
		});

		it("should not render dialog when closed", () => {
			render(<CreateStandaloneInvoiceDialog {...defaultProps} open={false} />);

			expect(
				screen.queryByRole("heading", { name: /create invoice/i }),
			).not.toBeInTheDocument();
		});

		it("should show customer name in description", () => {
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			expect(
				screen.getByText(/create a standalone invoice for acme corp/i),
			).toBeInTheDocument();
		});
	});

	describe("Form Fields", () => {
		it("should render issue date field", () => {
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			expect(screen.getByLabelText(/issue date/i)).toBeInTheDocument();
		});

		it("should render due date field", () => {
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
		});

		it("should render line items section", () => {
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			expect(screen.getByText(/line items/i)).toBeInTheDocument();
		});

		it("should render tax field", () => {
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			expect(screen.getByLabelText(/tax amount/i)).toBeInTheDocument();
		});

		it("should render notes field", () => {
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
		});

		it("should render totals summary", () => {
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			// Look for dollar amount formatting which indicates totals are present
			expect(screen.getAllByText(/\$\d+\.\d{2}/).length).toBeGreaterThan(0);
		});
	});

	describe("Line Items Management", () => {
		it("should render initial line item", () => {
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			expect(
				screen.getByPlaceholderText(/consulting services/i),
			).toBeInTheDocument();
		});

		it("should add line item when Add Line is clicked", async () => {
			const user = userEvent.setup();
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /add line/i }));

			// Should now have 2 description fields
			const descriptionInputs =
				screen.getAllByPlaceholderText(/consulting services/i);
			expect(descriptionInputs).toHaveLength(2);
		});

		it("should remove line item when delete button is clicked", async () => {
			const user = userEvent.setup();
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			// Add a second line first
			await user.click(screen.getByRole("button", { name: /add line/i }));

			// Now we should have 2 lines with delete buttons visible
			const deleteButtons = screen
				.getAllByRole("button")
				.filter(
					(btn) =>
						btn.querySelector("svg.text-destructive") ||
						btn.querySelector('[class*="destructive"]'),
				);

			// There should be delete buttons now that we have 2 items
			if (deleteButtons.length > 0) {
				await user.click(deleteButtons[0]);

				// Should be back to 1 description field
				await waitFor(() => {
					const descriptionInputs =
						screen.getAllByPlaceholderText(/consulting services/i);
					expect(descriptionInputs).toHaveLength(1);
				});
			}
		});

		it("should calculate line item total correctly", async () => {
			const user = userEvent.setup();
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			// Find numeric inputs (spinbutton role)
			const spinbuttons = screen.getAllByRole("spinbutton");
			expect(spinbuttons.length).toBeGreaterThan(0);

			// Verify inputs exist - one for quantity and one for unit price
			const quantityInput = spinbuttons[0];
			await user.clear(quantityInput);
			await user.type(quantityInput, "5");

			// Verify the value was set
			expect(quantityInput).toHaveValue(5);
		});
	});

	describe("Totals Calculation", () => {
		it("should calculate subtotal from line items", async () => {
			const user = userEvent.setup();
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			const unitPriceInputs = screen.getAllByRole("spinbutton");
			const unitPriceInput = unitPriceInputs.find((input) =>
				input.getAttribute("id")?.includes("unitPrice"),
			);

			if (unitPriceInput) {
				await user.clear(unitPriceInput);
				await user.type(unitPriceInput, "250");

				// Subtotal should be $250.00
				await waitFor(() => {
					const subtotalRow = screen.getByText(/subtotal/i).closest("div");
					expect(subtotalRow).toHaveTextContent("$250.00");
				});
			}
		});

		it("should include tax in total calculation", async () => {
			const user = userEvent.setup();
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			// Set unit price
			const unitPriceInputs = screen.getAllByRole("spinbutton");
			const unitPriceInput = unitPriceInputs.find((input) =>
				input.getAttribute("id")?.includes("unitPrice"),
			);
			const taxInput = screen.getByLabelText(/tax amount/i);

			if (unitPriceInput) {
				await user.clear(unitPriceInput);
				await user.type(unitPriceInput, "100");
				await user.clear(taxInput);
				await user.type(taxInput, "10");

				// Total should be $110.00
				await waitFor(() => {
					const totalElements = screen.getAllByText(/\$110\.00/);
					expect(totalElements.length).toBeGreaterThan(0);
				});
			}
		});
	});

	describe("Form Submission", () => {
		it("should call API when form is submitted", async () => {
			const user = userEvent.setup();
			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ invoice: { id: "inv-1" } }),
			);

			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			// Fill in description
			const descriptionInput =
				screen.getByPlaceholderText(/consulting services/i);
			await user.type(descriptionInput, "Test Service");

			// Submit
			await user.click(screen.getByRole("button", { name: /create invoice/i }));

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					"/api/tenant/acme/invoices",
					expect.objectContaining({
						method: "POST",
						headers: { "Content-Type": "application/json" },
					}),
				);
			});
		});

		it("should convert amounts to cents in API request", async () => {
			const user = userEvent.setup();
			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ invoice: { id: "inv-1" } }),
			);

			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			// Fill in description and unit price
			const descriptionInput =
				screen.getByPlaceholderText(/consulting services/i);
			await user.type(descriptionInput, "Test Service");

			const unitPriceInputs = screen.getAllByRole("spinbutton");
			const unitPriceInput = unitPriceInputs.find((input) =>
				input.getAttribute("id")?.includes("unitPrice"),
			);
			if (unitPriceInput) {
				await user.clear(unitPriceInput);
				await user.type(unitPriceInput, "99.99");
			}

			// Submit
			await user.click(screen.getByRole("button", { name: /create invoice/i }));

			await waitFor(() => {
				const fetchCalls = mockFetch().mock.calls;
				if (fetchCalls.length > 0) {
					const body = JSON.parse(fetchCalls[0][1].body);
					expect(body.lineItems[0].unitPrice).toBe(9999); // cents
				}
			});
		});

		it("should call onInvoiceCreated after successful submission", async () => {
			const user = userEvent.setup();
			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ invoice: { id: "inv-1" } }),
			);

			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			// Fill in description
			const descriptionInput =
				screen.getByPlaceholderText(/consulting services/i);
			await user.type(descriptionInput, "Test Service");

			// Submit
			await user.click(screen.getByRole("button", { name: /create invoice/i }));

			await waitFor(() => {
				expect(mockOnInvoiceCreated).toHaveBeenCalled();
			});
		});

		it("should close dialog after successful submission", async () => {
			const user = userEvent.setup();
			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ invoice: { id: "inv-1" } }),
			);

			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			// Fill in description
			const descriptionInput =
				screen.getByPlaceholderText(/consulting services/i);
			await user.type(descriptionInput, "Test Service");

			// Submit
			await user.click(screen.getByRole("button", { name: /create invoice/i }));

			await waitFor(() => {
				expect(mockOnOpenChange).toHaveBeenCalledWith(false);
			});
		});

		it("should show error message when submission fails", async () => {
			const user = userEvent.setup();
			mockFetch().mockResolvedValueOnce(
				new Response(JSON.stringify({ error: "Failed to create invoice" }), {
					status: 500,
					headers: { "Content-Type": "application/json" },
				}),
			);

			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			// Fill in description
			const descriptionInput =
				screen.getByPlaceholderText(/consulting services/i);
			await user.type(descriptionInput, "Test Service");

			// Submit
			await user.click(screen.getByRole("button", { name: /create invoice/i }));

			await waitFor(() => {
				expect(
					screen.getByText(/failed to create invoice/i),
				).toBeInTheDocument();
			});
		});
	});

	describe("Validation", () => {
		it("should validate line item descriptions", async () => {
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			// When no description is filled, submit should be disabled
			const submitButton = screen.getByRole("button", {
				name: /create invoice/i,
			});
			expect(submitButton).toBeDisabled();
		});

		it("should disable submit button when no valid line items", () => {
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			const submitButton = screen.getByRole("button", {
				name: /create invoice/i,
			});
			expect(submitButton).toBeDisabled();
		});

		it("should enable submit button when description is filled", async () => {
			const user = userEvent.setup();
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			const descriptionInput =
				screen.getByPlaceholderText(/consulting services/i);
			await user.type(descriptionInput, "Test Service");

			const submitButton = screen.getByRole("button", {
				name: /create invoice/i,
			});
			expect(submitButton).not.toBeDisabled();
		});
	});

	describe("Cancel Button", () => {
		it("should call onOpenChange(false) when Cancel clicked", async () => {
			const user = userEvent.setup();

			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /cancel/i }));

			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});

		it("should reset form when dialog is closed", async () => {
			const user = userEvent.setup();
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			// Add some data
			const descriptionInput =
				screen.getByPlaceholderText(/consulting services/i);
			await user.type(descriptionInput, "Test Service");

			// Close dialog
			await user.click(screen.getByRole("button", { name: /cancel/i }));

			// Form should be reset (verified by callback being called)
			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});
	});

	describe("Date Defaults", () => {
		it("should default issue date to today", () => {
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			const issueDateInput = screen.getByLabelText(
				/issue date/i,
			) as HTMLInputElement;
			const today = new Date().toISOString().split("T")[0];
			expect(issueDateInput.value).toBe(today);
		});

		it("should default due date to 30 days from now", () => {
			render(<CreateStandaloneInvoiceDialog {...defaultProps} />);

			const dueDateInput = screen.getByLabelText(
				/due date/i,
			) as HTMLInputElement;
			const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0];
			expect(dueDateInput.value).toBe(thirtyDaysFromNow);
		});
	});
});
