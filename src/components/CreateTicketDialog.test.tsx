import * as router from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as membersData from "@/data/members";
import * as ticketsData from "@/data/tickets";
import { CreateTicketDialog } from "./CreateTicketDialog";

// Mock useParams
vi.mock("@tanstack/react-router", () => ({
	useParams: vi.fn(() => ({ tenant: "acme" })),
}));

const mockUseParams = router.useParams as ReturnType<typeof vi.fn>;

// Mock data modules
vi.mock("@/data/members", () => ({
	fetchMembers: vi.fn(),
}));

vi.mock("@/data/tickets", () => ({
	createTicket: vi.fn(),
}));

// Helper to mock fetch (kept for reference but not currently used)
// function mockFetch() {
// 	return global.fetch as ReturnType<typeof vi.fn>;
// }

describe("CreateTicketDialog", () => {
	const mockOnOpenChange = vi.fn();
	const mockOnTicketCreated = vi.fn();

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
		it("should render dialog when open", async () => {
			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce([]);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			expect(
				screen.getByRole("heading", { name: /create new ticket/i }),
			).toBeInTheDocument();
		});

		it("should not render dialog when closed", () => {
			render(
				<CreateTicketDialog
					open={false}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			expect(
				screen.queryByRole("heading", { name: /create new ticket/i }),
			).not.toBeInTheDocument();
		});

		it("should show dialog description", async () => {
			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce([]);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			expect(
				screen.getByText(/create a support ticket for a customer/i),
			).toBeInTheDocument();
		});
	});

	describe("Fetch on Open", () => {
		it("should fetch members when dialog opens", async () => {
			const mockMembers = [
				{
					id: "member-1",
					name: "John Doe",
					email: "john@acme.com",
					initials: "JD",
					organization: "Acme Corp",
					role: "Admin" as const,
					status: "Active" as const,
					lastLogin: "2h ago",
				},
			];

			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce(mockMembers);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(membersData.fetchMembers).toHaveBeenCalledWith("acme");
			});
		});

		it("should not fetch members when dialog is closed", () => {
			render(
				<CreateTicketDialog
					open={false}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			expect(membersData.fetchMembers).not.toHaveBeenCalled();
		});
	});

	describe("Customer Search", () => {
		it("should render customer search input", async () => {
			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce([]);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/fuzzy search by name/i),
				).toBeInTheDocument();
			});
		});

		it("should filter members when typing in search", async () => {
			const user = userEvent.setup();
			const mockMembers = [
				{
					id: "member-1",
					name: "John Doe",
					email: "john@acme.com",
					initials: "JD",
					organization: "Acme Corp",
					role: "Admin" as const,
					status: "Active" as const,
					lastLogin: "2h ago",
				},
				{
					id: "member-2",
					name: "Jane Smith",
					email: "jane@acme.com",
					initials: "JS",
					organization: "Acme Corp",
					role: "User" as const,
					status: "Active" as const,
					lastLogin: "1d ago",
				},
			];

			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce(mockMembers);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/fuzzy search by name/i),
				).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText(/fuzzy search by name/i);
			await user.type(searchInput, "John");

			// The customer name might be split across elements due to highlighting
			await waitFor(
				() => {
					const buttons = screen.getAllByRole("button");
					const customerButton = buttons.find((button) => {
						const text = button.textContent?.toLowerCase() || "";
						return (
							text.includes("john doe") &&
							!text.includes("cancel") &&
							!text.includes("create")
						);
					});
					expect(customerButton).toBeDefined();
				},
				{ timeout: 2000 },
			);
		});

		it('should show "No customers found" when search has no results', async () => {
			const user = userEvent.setup();
			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce([]);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/fuzzy search by name/i),
				).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText(/fuzzy search by name/i);
			await user.type(searchInput, "Nonexistent");

			await waitFor(() => {
				expect(screen.getByText(/no customers found/i)).toBeInTheDocument();
			});
		});
	});

	describe("Customer Selection", () => {
		it("should allow selecting a customer from dropdown", async () => {
			const user = userEvent.setup();
			const mockMembers = [
				{
					id: "member-1",
					name: "John Doe",
					email: "john@acme.com",
					initials: "JD",
					organization: "Acme Corp",
					role: "Admin" as const,
					status: "Active" as const,
					lastLogin: "2h ago",
				},
			];

			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce(mockMembers);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/fuzzy search by name/i),
				).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText(/fuzzy search by name/i);
			await user.type(searchInput, "John");

			// The customer name might be split across elements due to highlighting
			// Use a function matcher to find text across multiple elements
			await waitFor(
				() => {
					const buttons = screen.getAllByRole("button");
					const customerButton = buttons.find((button) => {
						const text = button.textContent?.toLowerCase() || "";
						return (
							text.includes("john doe") &&
							!text.includes("cancel") &&
							!text.includes("create")
						);
					});
					expect(customerButton).toBeDefined();
				},
				{ timeout: 2000 },
			);

			const buttons = screen.getAllByRole("button");
			const customerButton = buttons.find((button) => {
				const text = button.textContent?.toLowerCase() || "";
				return (
					text.includes("john doe") &&
					!text.includes("cancel") &&
					!text.includes("create")
				);
			});
			if (customerButton) {
				await user.click(customerButton);
			}

			await waitFor(() => {
				expect(screen.getByText("John Doe")).toBeInTheDocument();
				expect(screen.getByText("Acme Corp")).toBeInTheDocument();
			});
		});

		it("should show selected customer display", async () => {
			const user = userEvent.setup();
			const mockMembers = [
				{
					id: "member-1",
					name: "John Doe",
					email: "john@acme.com",
					initials: "JD",
					organization: "Acme Corp",
					role: "Admin" as const,
					status: "Active" as const,
					lastLogin: "2h ago",
				},
			];

			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce(mockMembers);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/fuzzy search by name/i),
				).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText(/fuzzy search by name/i);
			await user.type(searchInput, "John");

			// The customer name might be split across elements due to highlighting
			// Use a function matcher to find text across multiple elements
			await waitFor(
				() => {
					const buttons = screen.getAllByRole("button");
					const customerButton = buttons.find((button) => {
						const text = button.textContent?.toLowerCase() || "";
						return (
							text.includes("john doe") &&
							!text.includes("cancel") &&
							!text.includes("create")
						);
					});
					expect(customerButton).toBeDefined();
				},
				{ timeout: 2000 },
			);

			const buttons = screen.getAllByRole("button");
			const customerButton = buttons.find((button) => {
				const text = button.textContent?.toLowerCase() || "";
				return (
					text.includes("john doe") &&
					!text.includes("cancel") &&
					!text.includes("create")
				);
			});
			if (customerButton) {
				await user.click(customerButton);
			}

			await waitFor(() => {
				// Should show selected customer display
				const selectedDisplay = screen.getByText("John Doe").closest("div");
				expect(selectedDisplay).toBeInTheDocument();
			});
		});

		it("should allow clearing selected customer", async () => {
			const user = userEvent.setup();
			const mockMembers = [
				{
					id: "member-1",
					name: "John Doe",
					email: "john@acme.com",
					initials: "JD",
					organization: "Acme Corp",
					role: "Admin" as const,
					status: "Active" as const,
					lastLogin: "2h ago",
				},
			];

			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce(mockMembers);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/fuzzy search by name/i),
				).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText(/fuzzy search by name/i);
			await user.type(searchInput, "John");

			// The customer name might be split across elements due to highlighting
			// Use a function matcher to find text across multiple elements
			await waitFor(
				() => {
					const buttons = screen.getAllByRole("button");
					const customerButton = buttons.find((button) => {
						const text = button.textContent?.toLowerCase() || "";
						return (
							text.includes("john doe") &&
							!text.includes("cancel") &&
							!text.includes("create")
						);
					});
					expect(customerButton).toBeDefined();
				},
				{ timeout: 2000 },
			);

			const buttons = screen.getAllByRole("button");
			const customerButton = buttons.find((button) => {
				const text = button.textContent?.toLowerCase() || "";
				return (
					text.includes("john doe") &&
					!text.includes("cancel") &&
					!text.includes("create")
				);
			});
			if (customerButton) {
				await user.click(customerButton);
			}

			// Wait for clear button to appear, then click it
			await waitFor(() => {
				expect(screen.getByText("✕")).toBeInTheDocument();
			});

			const clearButton = screen.getByText("✕");
			await user.click(clearButton);

			await waitFor(() => {
				expect(searchInput).toHaveValue("");
			});
		});
	});

	describe("Form Fields", () => {
		it("should render title field", async () => {
			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce([]);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
			});
		});

		it("should render priority field", async () => {
			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce([]);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				// Priority field uses Select component which may not have label association
				expect(screen.getByText("Priority")).toBeInTheDocument();
				// Default value is 'normal', verify it's rendered (check for multiple "Normal" texts)
				const normalTexts = screen.getAllByText("Normal");
				expect(normalTexts.length).toBeGreaterThan(0);
			});
		});

		it("should render message field", async () => {
			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce([]);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(screen.getByLabelText(/initial message/i)).toBeInTheDocument();
			});
		});
	});

	describe("Validation", () => {
		it("should prevent submission when no customer selected", async () => {
			const user = userEvent.setup();
			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce([]);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/fuzzy search by name/i),
				).toBeInTheDocument();
			});

			// Fill other required fields
			await user.type(screen.getByLabelText(/title/i), "Test Ticket");
			await user.type(
				screen.getByLabelText(/initial message/i),
				"Test message",
			);

			// Try to submit without selecting a customer
			const submitButton = screen.getByRole("button", {
				name: /create ticket/i,
			});
			await user.click(submitButton);

			// The form should not submit (onTicketCreated should not be called)
			// The onSubmit handler returns early if !selectedCustomer
			await new Promise((resolve) => setTimeout(resolve, 500));
			expect(mockOnTicketCreated).not.toHaveBeenCalled();
			expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
		});
	});

	describe("Form Submission", () => {
		it("should call createTicket when form is submitted", async () => {
			const user = userEvent.setup();
			const mockMembers = [
				{
					id: "member-1",
					name: "John Doe",
					email: "john@acme.com",
					initials: "JD",
					organization: "Acme Corp",
					role: "Admin" as const,
					status: "Active" as const,
					lastLogin: "2h ago",
				},
			];

			const mockTicket = {
				id: "ticket-1",
				title: "Test Ticket",
				company: "Acme Corp",
				ticketNumber: "#1001",
				priority: "normal" as const,
				status: "open" as const,
				timeAgo: "Just now",
				preview: "Test message",
				customer: {
					name: "John Doe",
					company: "Acme Corp",
					initials: "JD",
				},
				messages: [],
			};

			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce(mockMembers);
			vi.mocked(ticketsData.createTicket).mockResolvedValueOnce(mockTicket);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/fuzzy search by name/i),
				).toBeInTheDocument();
			});

			// Select customer
			const searchInput = screen.getByPlaceholderText(/fuzzy search by name/i);
			await user.type(searchInput, "John");

			// The customer name might be split across elements due to highlighting
			// Use a function matcher to find text across multiple elements
			await waitFor(
				() => {
					const buttons = screen.getAllByRole("button");
					const customerButton = buttons.find((button) => {
						const text = button.textContent?.toLowerCase() || "";
						return (
							text.includes("john doe") &&
							!text.includes("cancel") &&
							!text.includes("create")
						);
					});
					expect(customerButton).toBeDefined();
				},
				{ timeout: 2000 },
			);

			const buttons = screen.getAllByRole("button");
			const customerButton = buttons.find((button) => {
				const text = button.textContent?.toLowerCase() || "";
				return (
					text.includes("john doe") &&
					!text.includes("cancel") &&
					!text.includes("create")
				);
			});
			if (customerButton) {
				await user.click(customerButton);
			}

			// Fill form
			await user.type(screen.getByLabelText(/title/i), "Test Ticket");
			await user.type(
				screen.getByLabelText(/initial message/i),
				"Test message",
			);

			// Submit
			const submitButton = screen.getByRole("button", {
				name: /create ticket/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(ticketsData.createTicket).toHaveBeenCalledWith(
					"acme",
					expect.objectContaining({
						title: "Test Ticket",
						priority: "normal",
						message: "Test message",
						customerId: "member-1",
					}),
				);
			});
		});

		it("should call onTicketCreated callback after successful submission", async () => {
			const user = userEvent.setup();
			const mockMembers = [
				{
					id: "member-1",
					name: "John Doe",
					email: "john@acme.com",
					initials: "JD",
					organization: "Acme Corp",
					role: "Admin" as const,
					status: "Active" as const,
					lastLogin: "2h ago",
				},
			];

			const mockTicket = {
				id: "ticket-1",
				title: "Test Ticket",
				company: "Acme Corp",
				ticketNumber: "#1001",
				priority: "normal" as const,
				status: "open" as const,
				timeAgo: "Just now",
				preview: "Test message",
				customer: {
					name: "John Doe",
					company: "Acme Corp",
					initials: "JD",
				},
				messages: [],
			};

			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce(mockMembers);
			vi.mocked(ticketsData.createTicket).mockResolvedValueOnce(mockTicket);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/fuzzy search by name/i),
				).toBeInTheDocument();
			});

			// Select customer
			const searchInput = screen.getByPlaceholderText(/fuzzy search by name/i);
			await user.type(searchInput, "John");

			// The customer name might be split across elements due to highlighting
			// Use a function matcher to find text across multiple elements
			await waitFor(
				() => {
					const buttons = screen.getAllByRole("button");
					const customerButton = buttons.find((button) => {
						const text = button.textContent?.toLowerCase() || "";
						return (
							text.includes("john doe") &&
							!text.includes("cancel") &&
							!text.includes("create")
						);
					});
					expect(customerButton).toBeDefined();
				},
				{ timeout: 2000 },
			);

			const buttons = screen.getAllByRole("button");
			const customerButton = buttons.find((button) => {
				const text = button.textContent?.toLowerCase() || "";
				return (
					text.includes("john doe") &&
					!text.includes("cancel") &&
					!text.includes("create")
				);
			});
			if (customerButton) {
				await user.click(customerButton);
			}

			// Fill form
			await user.type(screen.getByLabelText(/title/i), "Test Ticket");
			await user.type(
				screen.getByLabelText(/initial message/i),
				"Test message",
			);

			// Submit
			const submitButton = screen.getByRole("button", {
				name: /create ticket/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockOnTicketCreated).toHaveBeenCalled();
			});
		});

		it("should close dialog after successful submission", async () => {
			const user = userEvent.setup();
			const mockMembers = [
				{
					id: "member-1",
					name: "John Doe",
					email: "john@acme.com",
					initials: "JD",
					organization: "Acme Corp",
					role: "Admin" as const,
					status: "Active" as const,
					lastLogin: "2h ago",
				},
			];

			const mockTicket = {
				id: "ticket-1",
				title: "Test Ticket",
				company: "Acme Corp",
				ticketNumber: "#1001",
				priority: "normal" as const,
				status: "open" as const,
				timeAgo: "Just now",
				preview: "Test message",
				customer: {
					name: "John Doe",
					company: "Acme Corp",
					initials: "JD",
				},
				messages: [],
			};

			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce(mockMembers);
			vi.mocked(ticketsData.createTicket).mockResolvedValueOnce(mockTicket);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/fuzzy search by name/i),
				).toBeInTheDocument();
			});

			// Select customer
			const searchInput = screen.getByPlaceholderText(/fuzzy search by name/i);
			await user.type(searchInput, "John");

			// The customer name might be split across elements due to highlighting
			// Use a function matcher to find text across multiple elements
			await waitFor(
				() => {
					const buttons = screen.getAllByRole("button");
					const customerButton = buttons.find((button) => {
						const text = button.textContent?.toLowerCase() || "";
						return (
							text.includes("john doe") &&
							!text.includes("cancel") &&
							!text.includes("create")
						);
					});
					expect(customerButton).toBeDefined();
				},
				{ timeout: 2000 },
			);

			const buttons = screen.getAllByRole("button");
			const customerButton = buttons.find((button) => {
				const text = button.textContent?.toLowerCase() || "";
				return (
					text.includes("john doe") &&
					!text.includes("cancel") &&
					!text.includes("create")
				);
			});
			if (customerButton) {
				await user.click(customerButton);
			}

			// Fill form
			await user.type(screen.getByLabelText(/title/i), "Test Ticket");
			await user.type(
				screen.getByLabelText(/initial message/i),
				"Test message",
			);

			// Submit
			const submitButton = screen.getByRole("button", {
				name: /create ticket/i,
			});
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockOnOpenChange).toHaveBeenCalledWith(false);
			});
		});
	});

	describe("Cancel Button", () => {
		it("should call onOpenChange(false) when Cancel clicked", async () => {
			const user = userEvent.setup();
			vi.mocked(membersData.fetchMembers).mockResolvedValueOnce([]);

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /cancel/i }),
				).toBeInTheDocument();
			});

			const cancelButton = screen.getByRole("button", { name: /cancel/i });
			await user.click(cancelButton);

			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
		});
	});

	describe("Loading States", () => {
		it("should show loading state while fetching members", async () => {
			vi.mocked(membersData.fetchMembers).mockImplementation(
				() => new Promise(() => {}),
			); // Never resolves

			render(
				<CreateTicketDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					onTicketCreated={mockOnTicketCreated}
				/>,
			);

			await waitFor(() => {
				expect(
					screen.getByPlaceholderText(/fuzzy search by name/i),
				).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText(/fuzzy search by name/i);
			await userEvent.type(searchInput, "test");

			await waitFor(() => {
				expect(screen.getByText(/loading customers/i)).toBeInTheDocument();
			});
		});
	});
});
