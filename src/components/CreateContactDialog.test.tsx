import * as router from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockFetchSuccess } from "@/test/setup";
import { CreateContactDialog } from "./CreateContactDialog";

// Mock useParams
vi.mock("@tanstack/react-router", () => ({
	useParams: vi.fn(() => ({ tenant: "acme" })),
}));

const mockUseParams = router.useParams as ReturnType<typeof vi.fn>;

// Helper to mock fetch
function mockFetch() {
	return global.fetch as ReturnType<typeof vi.fn>;
}

describe("CreateContactDialog", () => {
	const mockOnOpenChange = vi.fn();
	const mockOnContactCreated = vi.fn();

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

	describe("Render Behavior", () => {
		it("should render dialog when open", () => {
			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
				/>,
			);

			expect(
				screen.getByRole("heading", { name: /add new contact/i }),
			).toBeInTheDocument();
		});

		it("should not render dialog when closed", () => {
			render(
				<CreateContactDialog
					open={false}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
				/>,
			);

			expect(
				screen.queryByRole("heading", { name: /add new contact/i }),
			).not.toBeInTheDocument();
		});

		it("should show create title in create mode", () => {
			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
				/>,
			);

			expect(
				screen.getByRole("heading", { name: /add new contact/i }),
			).toBeInTheDocument();
		});

		it("should show edit title in edit mode", async () => {
			const mockContact = {
				id: "contact-1",
				name: "John Doe",
				email: "john@acme.com",
				role: "admin",
				isOwner: false,
				status: "active",
				createdAt: "2024-01-01",
				updatedAt: "2024-01-01",
			};

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ contact: mockContact }),
			);

			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
					contactId="contact-1"
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByRole("heading", { name: /edit contact/i }),
				).toBeInTheDocument();
			});
		});
	});

	describe("Form Fields", () => {
		it("should render name field", () => {
			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
				/>,
			);

			expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
		});

		it("should render email field", () => {
			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
				/>,
			);

			expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
		});

		it("should render phone field", () => {
			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
				/>,
			);

			expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
		});

		it("should render title field", () => {
			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
				/>,
			);

			expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
		});

		it("should render role select", () => {
			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
				/>,
			);

			// Role field uses Select component which may not have label association
			expect(screen.getByText("Role")).toBeInTheDocument();
			// Select has default value 'user', verify it's rendered (check for multiple "User" texts)
			const userTexts = screen.getAllByText("User");
			expect(userTexts.length).toBeGreaterThan(0);
		});
	});

	describe("Pre-filled Customer", () => {
		it("should show customer name when customerId and customerName provided", () => {
			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
					customerId="customer-1"
					customerName="Acme Corp"
				/>,
			);

			expect(screen.getByText("Acme Corp")).toBeInTheDocument();
		});
	});

	describe("Edit Mode", () => {
		it("should fetch contact data when in edit mode", async () => {
			const mockContact = {
				id: "contact-1",
				name: "John Doe",
				email: "john@acme.com",
				phone: "555-1234",
				title: "CEO",
				role: "admin",
				isOwner: false,
				status: "active",
				createdAt: "2024-01-01",
				updatedAt: "2024-01-01",
			};

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ contact: mockContact }),
			);

			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
					contactId="contact-1"
				/>,
			);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining("/acme/api/crm/contacts/contact-1"),
				);
			});
		});

		it("should pre-fill form with contact data", async () => {
			const mockContact = {
				id: "contact-1",
				name: "John Doe",
				email: "john@acme.com",
				phone: "555-1234",
				title: "CEO",
				role: "admin",
				isOwner: false,
				status: "active",
				createdAt: "2024-01-01",
				updatedAt: "2024-01-01",
			};

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ contact: mockContact }),
			);

			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
					contactId="contact-1"
				/>,
			);

			await waitFor(() => {
				const nameInput = screen.getByLabelText(
					/full name/i,
				) as HTMLInputElement;
				expect(nameInput.value).toBe("John Doe");
			});
		});

		it("should use initialContact prop if provided", async () => {
			const mockContact = {
				id: "contact-1",
				name: "Jane Smith",
				email: "jane@acme.com",
				role: "user",
				isOwner: false,
				status: "active",
				createdAt: "2024-01-01",
				updatedAt: "2024-01-01",
			};

			// Mock the fetch call that happens when contactId is provided
			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ contact: mockContact }),
			);

			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
					contactId="contact-1"
					contact={mockContact}
				/>,
			);

			// Wait for form to appear after loading completes
			await waitFor(() => {
				const nameInput = screen.getByLabelText(
					/full name/i,
				) as HTMLInputElement;
				expect(nameInput.value).toBe("Jane Smith");
			});
		});
	});

	describe("Form Submission", () => {
		it("should call API to create contact", async () => {
			const user = userEvent.setup();

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ contact: { id: "contact-1" } }),
			);

			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
					customerId="customer-1"
					customerName="Acme Corp"
				/>,
			);

			// Fill form
			await user.type(screen.getByLabelText(/full name/i), "John Doe");
			await user.type(screen.getByLabelText(/email/i), "john@acme.com");

			// Submit
			const submitButton = screen.getByRole("button", {
				name: /create contact/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining(
						"/acme/api/crm/customers/customer-1/contacts",
					),
					expect.objectContaining({
						method: "POST",
						headers: { "Content-Type": "application/json" },
					}),
				);
			});
		});

		it("should call API to update contact in edit mode", async () => {
			const user = userEvent.setup();
			const mockContact = {
				id: "contact-1",
				name: "John Doe",
				email: "john@acme.com",
				role: "admin",
				isOwner: false,
				status: "active",
				createdAt: "2024-01-01",
				updatedAt: "2024-01-01",
			};

			mockFetch()
				.mockResolvedValueOnce(mockFetchSuccess({ contact: mockContact }))
				.mockResolvedValueOnce(
					mockFetchSuccess({
						contact: { ...mockContact, name: "John Updated" },
					}),
				);

			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
					contactId="contact-1"
				/>,
			);

			await waitFor(() => {
				expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
			});

			// Update name
			const nameInput = screen.getByLabelText(/full name/i);
			await user.clear(nameInput);
			await user.type(nameInput, "John Updated");

			// Submit
			const submitButton = screen.getByRole("button", {
				name: /update contact/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(fetch).toHaveBeenCalledWith(
					expect.stringContaining("/acme/api/crm/contacts/contact-1"),
					expect.objectContaining({
						method: "PUT",
					}),
				);
			});
		});

		it("should call onContactCreated callback after successful submission", async () => {
			const user = userEvent.setup();

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ contact: { id: "contact-1" } }),
			);

			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
					customerId="customer-1"
					customerName="Acme Corp"
				/>,
			);

			// Fill form
			await user.type(screen.getByLabelText(/full name/i), "John Doe");
			await user.type(screen.getByLabelText(/email/i), "john@acme.com");

			// Submit
			const submitButton = screen.getByRole("button", {
				name: /create contact/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockOnContactCreated).toHaveBeenCalled();
			});
		});

		it("should close dialog after successful submission", async () => {
			const user = userEvent.setup();

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ contact: { id: "contact-1" } }),
			);

			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
					customerId="customer-1"
					customerName="Acme Corp"
				/>,
			);

			// Fill form
			await user.type(screen.getByLabelText(/full name/i), "John Doe");
			await user.type(screen.getByLabelText(/email/i), "john@acme.com");

			// Submit
			const submitButton = screen.getByRole("button", {
				name: /create contact/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockOnOpenChange).toHaveBeenCalledWith(false);
			});
		});
	});

	describe("Validation", () => {
		it("should show error for invalid email", async () => {
			const user = userEvent.setup();

			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
				/>,
			);

			const emailInput = screen.getByLabelText(/email/i);
			await user.type(emailInput, "invalid-email");
			await user.tab(); // Trigger blur

			await waitFor(() => {
				expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
			});
		});

		it("should require name field", async () => {
			const user = userEvent.setup();

			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
				/>,
			);

			const nameInput = screen.getByLabelText(/full name/i);
			await user.click(nameInput);
			await user.tab(); // Trigger blur

			await waitFor(() => {
				expect(screen.getByText(/name is required/i)).toBeInTheDocument();
			});
		});
	});

	describe("Cancel Button", () => {
		it("should call onOpenChange(false) when Cancel clicked", async () => {
			const user = userEvent.setup();

			render(
				<CreateContactDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onContactCreated={mockOnContactCreated}
				/>,
			);

			const cancelButton = screen.getByRole("button", { name: /cancel/i });
			await user.click(cancelButton);

			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});
	});
});
