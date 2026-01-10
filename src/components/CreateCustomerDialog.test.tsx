import * as router from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockFetchError, mockFetchSuccess } from "@/test/setup";
import { CreateCustomerDialog } from "./CreateCustomerDialog";

// Mock useParams
vi.mock("@tanstack/react-router", () => ({
	useParams: vi.fn(() => ({ tenant: "acme" })),
}));

const mockUseParams = router.useParams as ReturnType<typeof vi.fn>;

// Helper to mock fetch
function mockFetch() {
	return global.fetch as ReturnType<typeof vi.fn>;
}

describe("CreateCustomerDialog", () => {
	const mockOnOpenChange = vi.fn();
	const mockOnCustomerCreated = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseParams.mockReturnValue({ tenant: "acme" });
		global.fetch = vi.fn(() => {
			return Promise.resolve(
				new Response(JSON.stringify({ error: "Not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				}),
			);
		}) as typeof fetch;
	});

	describe("Render & Close Behavior", () => {
		it('should show "Add New Customer" title in create mode', () => {
			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ members: [] }));

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
				/>,
			);

			expect(screen.getByText("Add New Customer")).toBeInTheDocument();
		});

		it('should show "Edit Customer" title in edit mode', () => {
			mockFetch()
				.mockResolvedValueOnce(
					mockFetchSuccess({ customer: { id: "customer-123", name: "Acme" } }),
				)
				.mockResolvedValueOnce(mockFetchSuccess({ members: [] }));

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
					customerId="customer-123"
				/>,
			);

			expect(screen.getByText("Edit Customer")).toBeInTheDocument();
		});

		it("should call onOpenChange(false) when Cancel clicked", async () => {
			const user = userEvent.setup();

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ members: [] }));

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
				/>,
			);

			const cancelButton = screen.getByRole("button", { name: /cancel/i });
			await user.click(cancelButton);

			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});
	});

	describe("Data Fetching on Open (Create Mode)", () => {
		it("should fetch plans and members when dialog opens", async () => {
			const mockPlans = [
				{
					id: "plan-1",
					name: "Enterprise",
					status: "active",
					pricingModel: "flat",
				},
			];
			const mockMembers = [{ id: "user-1", name: "John Smith" }];

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ plans: mockPlans }))
				.mockResolvedValueOnce(mockFetchSuccess({ members: mockMembers }));

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
				/>,
			);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining(
						"/acme/api/product-catalog/plans?status=active",
					),
				);
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining("/acme/api/members"),
				);
			});
		});

		it("should not fetch plans in edit mode", async () => {
			const mockCustomer = {
				id: "customer-123",
				name: "Acme Corp",
				industry: "Technology",
			};
			const mockMembers = [{ id: "user-1", name: "John Smith" }];

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customer: mockCustomer }))
				.mockResolvedValueOnce(mockFetchSuccess({ members: mockMembers }));

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
					customerId="customer-123"
				/>,
			);

			await waitFor(() => {
				// Give the component time to make fetch calls
				expect(fetch).toHaveBeenCalledTimes(2);
			});

			// Should not have called plans endpoint
			const calls = mockFetch().mock.calls.map((call) => call[0]?.toString());
			expect(calls.some((url) => url?.includes("/product-catalog/plans"))).toBe(
				false,
			);
		});
	});

	describe("Create Subscription Toggle", () => {
		it("should show subscription section when toggle is checked", async () => {
			const user = userEvent.setup();
			const mockPlans = [
				{
					id: "plan-1",
					name: "Enterprise",
					status: "active",
					pricingModel: "flat",
				},
			];
			const mockMembers = [{ id: "user-1", name: "John Smith" }];

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ plans: mockPlans }))
				.mockResolvedValueOnce(mockFetchSuccess({ members: mockMembers }));

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
				/>,
			);

			// Subscription section should not be visible initially
			expect(
				screen.queryByText("Subscription Details"),
			).not.toBeInTheDocument();

			const checkbox = screen.getByLabelText(/create subscription now/i);
			await user.click(checkbox);

			await waitFor(() => {
				expect(screen.getByText("Subscription Details")).toBeInTheDocument();
			});
		});

		it("should disable submit when subscription enabled but no plan selected", async () => {
			const user = userEvent.setup();
			const mockPlans = [
				{
					id: "plan-1",
					name: "Enterprise",
					status: "active",
					pricingModel: "flat",
				},
			];
			const mockMembers = [{ id: "user-1", name: "John Smith" }];

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ plans: mockPlans }))
				.mockResolvedValueOnce(mockFetchSuccess({ members: mockMembers }));

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/acme corporation/i),
				).toBeInTheDocument();
			});

			// Fill company name
			const nameInput = screen.getByPlaceholderText(/acme corporation/i);
			await user.type(nameInput, "Acme Corp");

			// Enable subscription toggle
			const checkbox = screen.getByLabelText(/create subscription now/i);
			await user.click(checkbox);

			// Submit button should be disabled (no plan selected)
			const submitButton = screen.getByRole("button", {
				name: /create customer/i,
			});
			expect(submitButton).toBeDisabled();
		});
	});

	describe("Submit Create Prospect", () => {
		it("should submit prospect creation without subscription", async () => {
			const user = userEvent.setup();
			const mockMembers = [{ id: "user-1", name: "John Smith" }];

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ members: mockMembers }))
				.mockResolvedValueOnce(
					mockFetchSuccess({
						success: true,
						customer: { id: "customer-123", name: "Acme Corp" },
					}),
				);

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/acme corporation/i),
				).toBeInTheDocument();
			});

			// Fill form
			const nameInput = screen.getByPlaceholderText(/acme corporation/i);
			await user.type(nameInput, "Acme Corp");

			const tagsInput = screen.getByPlaceholderText(/comma-separated/i);
			await user.type(tagsInput, "enterprise, high-value");

			// Submit
			const submitButton = screen.getByRole("button", {
				name: /create prospect/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining("/acme/api/crm/customers"),
					expect.objectContaining({
						method: "POST",
						headers: { "Content-Type": "application/json" },
					}),
				);
			});

			const callArgs = mockFetch().mock.calls.find(
				(call) =>
					call[0]?.toString().includes("/crm/customers") &&
					call[1]?.method === "POST",
			);
			const requestBody = JSON.parse(callArgs?.[1]?.body as string);

			expect(requestBody.name).toBe("Acme Corp");
			expect(requestBody.tags).toEqual(["enterprise", "high-value"]);
			expect(requestBody.createSubscription).toBeUndefined();

			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
			expect(mockOnCustomerCreated).toHaveBeenCalled();
		});

		it("should trim and parse tags correctly", async () => {
			const user = userEvent.setup();
			const mockMembers = [{ id: "user-1", name: "John Smith" }];

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ members: mockMembers }))
				.mockResolvedValueOnce(
					mockFetchSuccess({
						success: true,
						customer: { id: "customer-123", name: "Acme Corp" },
					}),
				);

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/acme corporation/i),
				).toBeInTheDocument();
			});

			const nameInput = screen.getByPlaceholderText(/acme corporation/i);
			await user.type(nameInput, "Acme Corp");

			const tagsInput = screen.getByPlaceholderText(/comma-separated/i);
			await user.type(tagsInput, "enterprise , high-value , vip");

			const submitButton = screen.getByRole("button", {
				name: /create prospect/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				const callArgs = mockFetch().mock.calls.find(
					(call) =>
						call[0]?.toString().includes("/crm/customers") &&
						call[1]?.method === "POST",
				);
				const requestBody = JSON.parse(callArgs?.[1]?.body as string);
				expect(requestBody.tags).toEqual(["enterprise", "high-value", "vip"]);
			});
		});
	});

	describe("Error Handling", () => {
		it("should display error message and keep dialog open on error", async () => {
			const user = userEvent.setup();
			const mockMembers = [{ id: "user-1", name: "John Smith" }];

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ members: mockMembers }))
				.mockResolvedValueOnce(
					mockFetchError("Failed to create customer", 500),
				);

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/acme corporation/i),
				).toBeInTheDocument();
			});

			const nameInput = screen.getByPlaceholderText(/acme corporation/i);
			await user.type(nameInput, "Acme Corp");

			const submitButton = screen.getByRole("button", {
				name: /create prospect/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(
					screen.getByText(/failed to create customer/i),
				).toBeInTheDocument();
			});

			// Dialog should still be open
			expect(screen.getByText("Add New Customer")).toBeInTheDocument();
			expect(mockOnOpenChange).not.toHaveBeenCalled();
		});
	});

	describe("Edit Mode", () => {
		it("should fetch customer data when opened in edit mode", async () => {
			const mockCustomer = {
				id: "customer-123",
				name: "Acme Corp",
				industry: "Technology",
			};
			const mockMembers = [{ id: "user-1", name: "John Smith" }];

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customer: mockCustomer }))
				.mockResolvedValueOnce(mockFetchSuccess({ members: mockMembers }));

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
					customerId="customer-123"
				/>,
			);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining(
						"/acme/api/crm/customers/customer-123",
					),
				);
			});
		});

		it("should pre-fill form fields with customer data", async () => {
			const mockCustomer = {
				id: "customer-123",
				name: "Acme Corp",
				industry: "Technology",
				website: "https://acme.com",
				billingEmail: "billing@acme.com",
				billingAddress: "123 Main St",
				assignedToUserId: "user-1",
				importance: "high",
				tags: ["enterprise", "high-value"],
				notes: "Important customer",
			};
			const mockMembers = [{ id: "user-1", name: "John Smith" }];

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customer: mockCustomer }))
				.mockResolvedValueOnce(mockFetchSuccess({ members: mockMembers }));

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
					customerId="customer-123"
				/>,
			);

			await waitFor(() => {
				expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
				expect(
					screen.getByDisplayValue("https://acme.com"),
				).toBeInTheDocument();
				expect(
					screen.getByDisplayValue("billing@acme.com"),
				).toBeInTheDocument();
				expect(screen.getByDisplayValue("123 Main St")).toBeInTheDocument();
				expect(
					screen.getByDisplayValue("enterprise, high-value"),
				).toBeInTheDocument();
				expect(
					screen.getByDisplayValue("Important customer"),
				).toBeInTheDocument();
			});
		});

		it("should hide subscription toggle in edit mode", async () => {
			const mockCustomer = {
				id: "customer-123",
				name: "Acme Corp",
			};
			const mockMembers = [{ id: "user-1", name: "John Smith" }];

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customer: mockCustomer }))
				.mockResolvedValueOnce(mockFetchSuccess({ members: mockMembers }));

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
					customerId="customer-123"
				/>,
			);

			await waitFor(() => {
				expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
			});

			expect(
				screen.queryByText(/create subscription now/i),
			).not.toBeInTheDocument();
		});

		it("should submit PUT request for updates", async () => {
			const user = userEvent.setup();
			const mockCustomer = {
				id: "customer-123",
				name: "Acme Corp",
				industry: "Technology",
			};
			const mockMembers = [{ id: "user-1", name: "John Smith" }];

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ customer: mockCustomer }))
				.mockResolvedValueOnce(mockFetchSuccess({ members: mockMembers }))
				.mockResolvedValueOnce(
					mockFetchSuccess({
						success: true,
						customer: { ...mockCustomer, name: "Acme Corporation" },
					}),
				);

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
					customerId="customer-123"
				/>,
			);

			await waitFor(() => {
				expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
			});

			// Update name
			const nameInput = screen.getByDisplayValue("Acme Corp");
			await user.clear(nameInput);
			await user.type(nameInput, "Acme Corporation");

			// Submit
			const submitButton = screen.getByRole("button", {
				name: /update customer/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining(
						"/acme/api/crm/customers/customer-123",
					),
					expect.objectContaining({
						method: "PUT",
					}),
				);
			});

			const callArgs = mockFetch().mock.calls.find(
				(call) =>
					call[0]?.toString().includes("/customers/customer-123") &&
					call[1]?.method === "PUT",
			);
			const requestBody = JSON.parse(callArgs?.[1]?.body as string);

			expect(requestBody.name).toBe("Acme Corporation");

			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
			expect(mockOnCustomerCreated).toHaveBeenCalled();
		});
	});

	describe("Form Fields", () => {
		it("should render all form fields", async () => {
			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ plans: [] }))
				.mockResolvedValueOnce(mockFetchSuccess({ members: [] }));

			render(
				<CreateCustomerDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onCustomerCreated={mockOnCustomerCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/acme corporation/i),
				).toBeInTheDocument();
			});

			// Check for form field labels
			expect(screen.getByText("Industry")).toBeInTheDocument();
			expect(screen.getByText(/Website/i)).toBeInTheDocument();
			expect(screen.getByText(/Billing Email/i)).toBeInTheDocument();
			expect(screen.getByText(/Billing Address/i)).toBeInTheDocument();
			expect(screen.getByText("Assign To")).toBeInTheDocument();
			expect(screen.getByText(/Customer Importance/i)).toBeInTheDocument();
			expect(screen.getByText(/Tags/i)).toBeInTheDocument();
			expect(screen.getByText(/Notes/i)).toBeInTheDocument();
		});
	});
});
