import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	fetchTickets,
	fetchTicket,
	createTicket,
	updateTicket,
	postTicketMessage,
	fetchSupportMembers,
	addTicket,
	ticketsStore,
	filterOptions,
	type Ticket,
	type TicketDetail,
	type CreateTicketInput,
} from "./tickets";
import { mockFetchSuccess, mockFetchError } from "@/test/setup";

// Helper to mock fetch
function mockFetch() {
	return global.fetch as ReturnType<typeof vi.fn>;
}

describe("tickets data functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
		// Reset store
		ticketsStore.setState(() => []);
		// Mock window.location.origin for URL construction
		Object.defineProperty(window, "location", {
			value: { origin: "http://localhost:3000" },
			writable: true,
			configurable: true,
		});
	});

	describe("fetchTickets", () => {
		it("should fetch tickets without filters", async () => {
			const mockTickets: Ticket[] = [
				{
					id: "ticket-1",
					title: "Test Ticket",
					company: "Acme Corp",
					ticketNumber: "#1001",
					priority: "normal",
					status: "open",
					timeAgo: "1h ago",
					preview: "Test preview",
					customer: {
						name: "John Doe",
						company: "Acme Corp",
						initials: "JD",
					},
					messages: [],
				},
			];

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ tickets: mockTickets }),
			);

			const result = await fetchTickets("acme");

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/tenant/acme/tickets"),
				expect.objectContaining({
					credentials: "include",
				}),
			);
			expect(result).toEqual(mockTickets);
		});

		it("should include status filter in query params", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ tickets: [] }));

			await fetchTickets("acme", { status: "open" });

			const callUrl = mockFetch().mock.calls[0][0] as string;
			expect(callUrl).toContain("status=open");
		});

		it("should include priority filter in query params", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ tickets: [] }));

			await fetchTickets("acme", { priority: "urgent" });

			const callUrl = mockFetch().mock.calls[0][0] as string;
			expect(callUrl).toContain("priority=urgent");
		});

		it("should include search filter in query params", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ tickets: [] }));

			await fetchTickets("acme", { search: "test query" });

			const callUrl = mockFetch().mock.calls[0][0] as string;
			// URL encoding can use either + or %20 for spaces, both are valid
			expect(callUrl).toMatch(/search=test(\+|%20)query/);
		});

		it("should include assignedToUserId filter in query params", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ tickets: [] }));

			await fetchTickets("acme", { assignedToUserId: "user-123" });

			const callUrl = mockFetch().mock.calls[0][0] as string;
			expect(callUrl).toContain("assignedToUserId=user-123");
		});

		it("should include unassigned filter in query params", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ tickets: [] }));

			await fetchTickets("acme", { unassigned: true });

			const callUrl = mockFetch().mock.calls[0][0] as string;
			expect(callUrl).toContain("unassigned=true");
		});

		it("should combine multiple filters", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchSuccess({ tickets: [] }));

			await fetchTickets("acme", {
				status: "open",
				priority: "high",
				search: "test",
			});

			const callUrl = mockFetch().mock.calls[0][0] as string;
			expect(callUrl).toContain("status=open");
			expect(callUrl).toContain("priority=high");
			expect(callUrl).toContain("search=test");
		});

		it("should update ticketsStore on success", async () => {
			const mockTickets: Ticket[] = [
				{
					id: "ticket-1",
					title: "Test",
					company: "Acme",
					ticketNumber: "#1001",
					priority: "normal",
					status: "open",
					timeAgo: "1h",
					preview: "Test",
					customer: { name: "John", company: "Acme", initials: "JD" },
					messages: [],
				},
			];

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ tickets: mockTickets }),
			);

			await fetchTickets("acme");

			expect(ticketsStore.state).toEqual(mockTickets);
		});

		it("should return empty array on API error", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchError("Not found", 404));

			const result = await fetchTickets("acme");

			expect(result).toEqual([]);
		});

		it("should return empty array on network error", async () => {
			mockFetch().mockRejectedValueOnce(new Error("Network error"));

			const result = await fetchTickets("acme");

			expect(result).toEqual([]);
		});
	});

	describe("fetchTicket", () => {
		it("should fetch single ticket by ID", async () => {
			const mockTicket: TicketDetail = {
				id: "ticket-1",
				title: "Test Ticket",
				company: "Acme Corp",
				ticketNumber: "#1001",
				priority: "normal",
				status: "open",
				timeAgo: "1h ago",
				preview: "Test preview",
				customer: {
					name: "John Doe",
					company: "Acme Corp",
					initials: "JD",
				},
				messages: [],
				createdAt: "2024-01-01",
				updatedAt: "2024-01-01",
				channel: "email",
				assignedTo: null,
			};

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ ticket: mockTicket }),
			);

			const result = await fetchTicket("acme", "ticket-1");

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/tenant/acme/tickets/ticket-1"),
				expect.objectContaining({
					credentials: "include",
				}),
			);
			expect(result).toEqual(mockTicket);
		});

		it("should return null on API error", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchError("Not found", 404));

			const result = await fetchTicket("acme", "ticket-1");

			expect(result).toBeNull();
		});

		it("should return null on network error", async () => {
			mockFetch().mockRejectedValueOnce(new Error("Network error"));

			const result = await fetchTicket("acme", "ticket-1");

			expect(result).toBeNull();
		});
	});

	describe("createTicket", () => {
		it("should create ticket with correct data", async () => {
			const input: CreateTicketInput = {
				title: "New Ticket",
				priority: "high",
				message: "Test message content",
				customerId: "customer-1",
				customer: {
					name: "John Doe",
					company: "Acme Corp",
					initials: "JD",
				},
			};

			const mockResponseTicket = {
				id: "ticket-new",
				title: "New Ticket",
				company: "Acme Corp",
				ticketNumber: "#1002",
			};

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ ticket: mockResponseTicket }),
			);

			const result = await createTicket("acme", input);

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/tenant/acme/tickets"),
				expect.objectContaining({
					method: "POST",
					headers: { "Content-Type": "application/json" },
				}),
			);

			const callBody = JSON.parse(mockFetch().mock.calls[0][1]?.body as string);
			expect(callBody).toEqual({
				title: "New Ticket",
				priority: "high",
				message: "Test message content",
				customerId: "customer-1",
			});

			expect(result).toBeDefined();
			expect(result?.title).toBe("New Ticket");
			expect(result?.priority).toBe("high");
			expect(result?.status).toBe("open");
		});

		it("should add ticket to store optimistically", async () => {
			const input: CreateTicketInput = {
				title: "New Ticket",
				priority: "normal",
				message: "Short message",
				customerId: "customer-1",
				customer: {
					name: "John Doe",
					company: "Acme Corp",
					initials: "JD",
				},
			};

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({
					ticket: {
						id: "ticket-new",
						title: "New Ticket",
						company: "Acme Corp",
						ticketNumber: "#1002",
					},
				}),
			);

			await createTicket("acme", input);

			expect(ticketsStore.state.length).toBeGreaterThan(0);
			const addedTicket = ticketsStore.state[0];
			expect(addedTicket.title).toBe("New Ticket");
		});

		it("should truncate long message previews", async () => {
			const longMessage = "a".repeat(100);
			const input: CreateTicketInput = {
				title: "New Ticket",
				priority: "normal",
				message: longMessage,
				customerId: "customer-1",
				customer: {
					name: "John Doe",
					company: "Acme Corp",
					initials: "JD",
				},
			};

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({
					ticket: {
						id: "ticket-new",
						title: "New Ticket",
						company: "Acme Corp",
						ticketNumber: "#1002",
					},
				}),
			);

			const result = await createTicket("acme", input);

			expect(result?.preview).toHaveLength(63); // 60 chars + "..."
			expect(result?.preview).toContain("...");
		});

		it("should return null on API error", async () => {
			mockFetch().mockResolvedValueOnce(
				mockFetchError("Validation failed", 400),
			);

			const result = await createTicket("acme", {
				title: "Test",
				priority: "normal",
				message: "Test",
				customerId: "customer-1",
				customer: { name: "John", company: "Acme", initials: "JD" },
			});

			expect(result).toBeNull();
		});

		it("should return null on network error", async () => {
			mockFetch().mockRejectedValueOnce(new Error("Network error"));

			const result = await createTicket("acme", {
				title: "Test",
				priority: "normal",
				message: "Test",
				customerId: "customer-1",
				customer: { name: "John", company: "Acme", initials: "JD" },
			});

			expect(result).toBeNull();
		});
	});

	describe("updateTicket", () => {
		it("should update ticket status", async () => {
			// Add ticket to store first
			const existingTicket: Ticket = {
				id: "ticket-1",
				title: "Test",
				company: "Acme",
				ticketNumber: "#1001",
				priority: "normal",
				status: "open",
				timeAgo: "1h",
				preview: "Test",
				customer: { name: "John", company: "Acme", initials: "JD" },
				messages: [],
			};
			ticketsStore.setState(() => [existingTicket]);

			mockFetch().mockResolvedValueOnce(mockFetchSuccess({}));

			const result = await updateTicket("acme", "ticket-1", {
				status: "closed",
			});

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/tenant/acme/tickets/ticket-1"),
				expect.objectContaining({
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
				}),
			);

			const callBody = JSON.parse(mockFetch().mock.calls[0][1]?.body as string);
			expect(callBody).toEqual({ status: "closed" });

			expect(result).toBe(true);
			expect(ticketsStore.state[0].status).toBe("closed");
		});

		it("should update ticket priority", async () => {
			const existingTicket: Ticket = {
				id: "ticket-1",
				title: "Test",
				company: "Acme",
				ticketNumber: "#1001",
				priority: "normal",
				status: "open",
				timeAgo: "1h",
				preview: "Test",
				customer: { name: "John", company: "Acme", initials: "JD" },
				messages: [],
			};
			ticketsStore.setState(() => [existingTicket]);

			mockFetch().mockResolvedValueOnce(mockFetchSuccess({}));

			const result = await updateTicket("acme", "ticket-1", {
				priority: "urgent",
			});

			expect(result).toBe(true);
			expect(ticketsStore.state[0].priority).toBe("urgent");
		});

		it("should assign ticket to user", async () => {
			const existingTicket: Ticket = {
				id: "ticket-1",
				title: "Test",
				company: "Acme",
				ticketNumber: "#1001",
				priority: "normal",
				status: "open",
				timeAgo: "1h",
				preview: "Test",
				customer: { name: "John", company: "Acme", initials: "JD" },
				messages: [],
			};
			ticketsStore.setState(() => [existingTicket]);

			mockFetch().mockResolvedValueOnce(mockFetchSuccess({}));

			const result = await updateTicket("acme", "ticket-1", {
				assignedToUserId: "user-123",
			});

			expect(result).toBe(true);
			expect(ticketsStore.state[0].assignedToUserId).toBe("user-123");
		});

		it("should unassign ticket when assignedToUserId is null", async () => {
			const existingTicket: Ticket = {
				id: "ticket-1",
				title: "Test",
				company: "Acme",
				ticketNumber: "#1001",
				priority: "normal",
				status: "open",
				timeAgo: "1h",
				preview: "Test",
				customer: { name: "John", company: "Acme", initials: "JD" },
				messages: [],
				assignedToUserId: "user-123",
			};
			ticketsStore.setState(() => [existingTicket]);

			mockFetch().mockResolvedValueOnce(mockFetchSuccess({}));

			const result = await updateTicket("acme", "ticket-1", {
				assignedToUserId: null,
			});

			expect(result).toBe(true);
			expect(ticketsStore.state[0].assignedToUserId).toBeNull();
		});

		it("should update multiple fields at once", async () => {
			const existingTicket: Ticket = {
				id: "ticket-1",
				title: "Test",
				company: "Acme",
				ticketNumber: "#1001",
				priority: "normal",
				status: "open",
				timeAgo: "1h",
				preview: "Test",
				customer: { name: "John", company: "Acme", initials: "JD" },
				messages: [],
			};
			ticketsStore.setState(() => [existingTicket]);

			mockFetch().mockResolvedValueOnce(mockFetchSuccess({}));

			const result = await updateTicket("acme", "ticket-1", {
				status: "closed",
				priority: "high",
				assignedToUserId: "user-123",
			});

			expect(result).toBe(true);
			expect(ticketsStore.state[0].status).toBe("closed");
			expect(ticketsStore.state[0].priority).toBe("high");
			expect(ticketsStore.state[0].assignedToUserId).toBe("user-123");
		});

		it("should return false on API error", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchError("Not found", 404));

			const result = await updateTicket("acme", "ticket-1", {
				status: "closed",
			});

			expect(result).toBe(false);
		});

		it("should return false on network error", async () => {
			mockFetch().mockRejectedValueOnce(new Error("Network error"));

			const result = await updateTicket("acme", "ticket-1", {
				status: "closed",
			});

			expect(result).toBe(false);
		});
	});

	describe("postTicketMessage", () => {
		it("should post public message", async () => {
			const mockMessage = {
				id: "message-1",
				type: "agent" as const,
				author: "Alice Admin",
				timestamp: "Just now",
				content: "Test message",
				isInternal: false,
			};

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ message: mockMessage }),
			);

			const result = await postTicketMessage(
				"acme",
				"ticket-1",
				"Test message",
				false,
			);

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/tenant/acme/tickets/ticket-1"),
				expect.objectContaining({
					method: "POST",
					headers: { "Content-Type": "application/json" },
				}),
			);

			const callBody = JSON.parse(mockFetch().mock.calls[0][1]?.body as string);
			expect(callBody).toEqual({
				content: "Test message",
				isInternal: false,
			});

			expect(result.success).toBe(true);
			expect(result.message).toEqual(mockMessage);
		});

		it("should post internal note when isInternal is true", async () => {
			const mockMessage = {
				id: "message-1",
				type: "agent" as const,
				author: "Alice Admin",
				timestamp: "Just now",
				content: "Internal note",
				isInternal: true,
			};

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ message: mockMessage }),
			);

			const result = await postTicketMessage(
				"acme",
				"ticket-1",
				"Internal note",
				true,
			);

			const callBody = JSON.parse(mockFetch().mock.calls[0][1]?.body as string);
			expect(callBody.isInternal).toBe(true);
			expect(result.success).toBe(true);
		});

		it("should default isInternal to false", async () => {
			const mockMessage = {
				id: "message-1",
				type: "agent" as const,
				author: "Alice Admin",
				timestamp: "Just now",
				content: "Test message",
				isInternal: false,
			};

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ message: mockMessage }),
			);

			await postTicketMessage("acme", "ticket-1", "Test message");

			const callBody = JSON.parse(mockFetch().mock.calls[0][1]?.body as string);
			expect(callBody.isInternal).toBe(false);
		});

		it("should return error on API failure", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchError("Unauthorized", 401));

			const result = await postTicketMessage(
				"acme",
				"ticket-1",
				"Test message",
			);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should handle network errors", async () => {
			mockFetch().mockRejectedValueOnce(new Error("Network error"));

			const result = await postTicketMessage(
				"acme",
				"ticket-1",
				"Test message",
			);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Network error occurred");
		});
	});

	describe("fetchSupportMembers", () => {
		it("should fetch support members", async () => {
			const mockMembers = [
				{
					id: "user-1",
					name: "Alice Admin",
					email: "alice@acme.test",
					role: "owner",
					image: null,
				},
				{
					id: "user-2",
					name: "Bob Builder",
					email: "bob@acme.test",
					role: "admin",
				},
			];

			mockFetch().mockResolvedValueOnce(
				mockFetchSuccess({ members: mockMembers }),
			);

			const result = await fetchSupportMembers("acme");

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/tenant/acme/members"),
				expect.objectContaining({
					credentials: "include",
				}),
			);
			expect(result).toEqual(mockMembers);
		});

		it("should return empty array on API error", async () => {
			mockFetch().mockResolvedValueOnce(mockFetchError("Not found", 404));

			const result = await fetchSupportMembers("acme");

			expect(result).toEqual([]);
		});

		it("should return empty array on network error", async () => {
			mockFetch().mockRejectedValueOnce(new Error("Network error"));

			const result = await fetchSupportMembers("acme");

			expect(result).toEqual([]);
		});
	});

	describe("addTicket", () => {
		it("should add ticket to store", () => {
			const input: Omit<CreateTicketInput, "customerId"> = {
				title: "Legacy Ticket",
				priority: "normal",
				message: "Test message",
				customer: {
					name: "John Doe",
					company: "Acme Corp",
					initials: "JD",
				},
			};

			const result = addTicket(input);

			expect(result.title).toBe("Legacy Ticket");
			expect(result.status).toBe("open");
			expect(result.priority).toBe("normal");
			expect(ticketsStore.state.length).toBeGreaterThan(0);
			expect(ticketsStore.state[0].id).toBe(result.id);
		});

		it("should generate ticket number", () => {
			const input: Omit<CreateTicketInput, "customerId"> = {
				title: "Test",
				priority: "normal",
				message: "Test",
				customer: { name: "John", company: "Acme", initials: "JD" },
			};

			const result = addTicket(input);

			expect(result.ticketNumber).toMatch(/^#\d{4}$/);
		});

		it("should truncate long message previews", () => {
			const longMessage = "a".repeat(100);
			const input: Omit<CreateTicketInput, "customerId"> = {
				title: "Test",
				priority: "normal",
				message: longMessage,
				customer: { name: "John", company: "Acme", initials: "JD" },
			};

			const result = addTicket(input);

			expect(result.preview).toHaveLength(63);
			expect(result.preview).toContain("...");
		});
	});

	describe("filterOptions", () => {
		it("should export filter options array", () => {
			expect(Array.isArray(filterOptions)).toBe(true);
			expect(filterOptions.length).toBeGreaterThan(0);
		});

		it("should have correct filter structure", () => {
			expect(filterOptions[0]).toHaveProperty("id");
			expect(filterOptions[0]).toHaveProperty("label");
		});
	});
});
