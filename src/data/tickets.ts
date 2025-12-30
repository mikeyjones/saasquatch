import { Store } from "@tanstack/store";

/**
 * Represents a support ticket with basic information.
 * 
 * Used for ticket lists and overview displays. For full ticket details
 * including all messages and metadata, use TicketDetail.
 */
export interface Ticket {
	id: string;
	title: string;
	company: string;
	organizationId?: string;
	ticketNumber: string;
	priority: "urgent" | "high" | "normal" | "low";
	status: "open" | "closed" | "pending" | "waiting_on_customer" | "escalated";
	timeAgo: string;
	preview: string;
	hasAI?: boolean;
	assignedToUserId?: string | null;
	customer: {
		name: string;
		company: string;
		organizationId?: string;
		initials: string;
	};
	messages: Array<{
		type: "customer" | "agent" | "ai" | "system";
		author: string;
		timestamp: string;
		content: string;
	}>;
	aiTriage?: {
		category: string;
		sentiment: string;
		suggestedAction: string;
		playbook: string;
		playbookLink: string;
	};
}

/**
 * Represents a support ticket with full details including all messages.
 * 
 * Includes complete message history, AI triage information, SLA deadlines,
 * and assignment details.
 */
export interface TicketDetail {
	id: string;
	title: string;
	company: string;
	ticketNumber: string;
	priority: "urgent" | "high" | "normal" | "low";
	status: "open" | "closed" | "pending" | "waiting_on_customer" | "escalated";
	timeAgo: string;
	preview: string;
	hasAI?: boolean;
	customer: {
		id?: string;
		name: string;
		email?: string;
		company: string;
		organizationId?: string;
		initials: string;
		subscriptionPlan?: string;
		subscriptionStatus?: string;
	};
	messages: Array<{
		id?: string;
		type: "customer" | "agent" | "ai" | "system";
		author: string;
		authorTenantUserId?: string | null;
		timestamp: string;
		content: string;
		isInternal?: boolean;
		createdAt?: string;
	}>;
	aiTriage?: {
		category: string;
		sentiment: string;
		urgencyScore?: number;
		suggestedAction: string;
		playbook?: string;
		playbookLink: string;
		summary?: string;
		draftResponse?: string;
		confidence?: number;
	};
	createdAt: string;
	updatedAt: string;
	resolvedAt?: string;
	slaDeadline?: string;
	firstResponseAt?: string;
	channel: string;
	assignedTo?: {
		id: string;
		name: string;
		email: string;
		initials: string;
	} | null;
}

/**
 * Input data for creating a new support ticket.
 * 
 * Includes the ticket title, priority, initial message, and customer information.
 */
export interface CreateTicketInput {
	title: string;
	priority: "urgent" | "high" | "normal" | "low";
	message: string;
	customerId: string;
	customer: {
		name: string;
		company: string;
		initials: string;
	};
}

/**
 * Store for tickets (used for optimistic updates).
 * 
 * Provides reactive state management for ticket lists, allowing components
 * to subscribe to ticket updates.
 */
export const ticketsStore = new Store<Ticket[]>([]);

/**
 * Fetch all tickets from the API.
 * 
 * Supports filtering by status, priority, search query, assignment, and
 * unassigned tickets. Updates the tickets store with fetched data.
 * 
 * @param tenantSlug - The tenant organization slug
 * @param filters - Optional filters for tickets
 * @param filters.status - Filter by ticket status
 * @param filters.priority - Filter by ticket priority
 * @param filters.search - Search query for ticket title or content
 * @param filters.assignedToUserId - Filter by assigned user ID
 * @param filters.unassigned - Filter for unassigned tickets only
 * @returns Promise resolving to an array of tickets
 */
export async function fetchTickets(
	tenantSlug: string,
	filters?: { status?: string; priority?: string; search?: string; assignedToUserId?: string; unassigned?: boolean },
): Promise<Ticket[]> {
	try {
		const url = new URL(
			`/api/tenant/${tenantSlug}/tickets`,
			window.location.origin,
		);

		if (filters?.status) url.searchParams.set("status", filters.status);
		if (filters?.priority) url.searchParams.set("priority", filters.priority);
		if (filters?.search) url.searchParams.set("search", filters.search);
		if (filters?.assignedToUserId) url.searchParams.set("assignedToUserId", filters.assignedToUserId);
		if (filters?.unassigned) url.searchParams.set("unassigned", "true");

		const response = await fetch(url.toString(), {
			credentials: "include",
		});

		if (!response.ok) {
			console.error("Failed to fetch tickets:", response.statusText);
			return [];
		}

		const data = await response.json();
		const tickets = data.tickets || [];

		// Update the store
		ticketsStore.setState(() => tickets);

		return tickets;
	} catch (error) {
		console.error("Error fetching tickets:", error);
		return [];
	}
}

/**
 * Fetch a single ticket with all details including full message history.
 * 
 * @param tenantSlug - The tenant organization slug
 * @param ticketId - The ID of the ticket to fetch
 * @returns Promise resolving to the ticket details or null if not found
 */
export async function fetchTicket(
	tenantSlug: string,
	ticketId: string,
): Promise<TicketDetail | null> {
	try {
		const response = await fetch(
			`/api/tenant/${tenantSlug}/tickets/${ticketId}`,
			{ credentials: "include" },
		);

		if (!response.ok) {
			console.error("Failed to fetch ticket:", response.statusText);
			return null;
		}

		const data = await response.json();
		return data.ticket || null;
	} catch (error) {
		console.error("Error fetching ticket:", error);
		return null;
	}
}

/**
 * Create a new ticket via API.
 * 
 * Creates a ticket and adds it to the tickets store optimistically.
 * 
 * @param tenantSlug - The tenant organization slug
 * @param input - The ticket data to create
 * @returns Promise resolving to the created ticket or null on error
 */
export async function createTicket(
	tenantSlug: string,
	input: CreateTicketInput,
): Promise<Ticket | null> {
	try {
		const response = await fetch(`/api/tenant/${tenantSlug}/tickets`, {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				title: input.title,
				priority: input.priority,
				message: input.message,
				customerId: input.customerId,
			}),
		});

		if (!response.ok) {
			console.error("Failed to create ticket:", response.statusText);
			return null;
		}

		const data = await response.json();
		const newTicket = data.ticket;

		if (newTicket) {
			// Add to store optimistically
			const ticket: Ticket = {
				id: newTicket.id,
				title: newTicket.title,
				company: newTicket.company,
				ticketNumber: newTicket.ticketNumber,
				priority: input.priority,
				status: "open",
				timeAgo: "Just now",
				preview:
					input.message.slice(0, 60) + (input.message.length > 60 ? "..." : ""),
				customer: input.customer,
				messages: [
					{
						type: "customer",
						author: input.customer.name,
						timestamp: "Just now",
						content: input.message,
					},
				],
			};

			ticketsStore.setState((prev) => [ticket, ...prev]);
			return ticket;
		}

		return null;
	} catch (error) {
		console.error("Error creating ticket:", error);
		return null;
	}
}

/**
 * Update ticket status, priority, or assignment.
 * 
 * Updates the ticket via API and optimistically updates the tickets store.
 * 
 * @param tenantSlug - The tenant organization slug
 * @param ticketId - The ID of the ticket to update
 * @param updates - The fields to update
 * @param updates.status - New ticket status
 * @param updates.priority - New ticket priority
 * @param updates.assignedToUserId - User ID to assign ticket to, or null to unassign
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function updateTicket(
	tenantSlug: string,
	ticketId: string,
	updates: {
		status?: string;
		priority?: string;
		assignedToUserId?: string | null;
	},
): Promise<boolean> {
	try {
		const response = await fetch(
			`/api/tenant/${tenantSlug}/tickets/${ticketId}`,
			{
				method: "PATCH",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			},
		);

		if (!response.ok) {
			console.error("Failed to update ticket:", response.statusText);
			return false;
		}

		// Update store optimistically
		ticketsStore.setState((prev) =>
			prev.map((t) =>
				t.id === ticketId
					? {
							...t,
							...updates,
							status: (updates.status as Ticket["status"]) ?? t.status,
							priority: (updates.priority as Ticket["priority"]) ?? t.priority,
						}
					: t,
			),
		);

		return true;
	} catch (error) {
		console.error("Error updating ticket:", error);
		return false;
	}
}

/**
 * Post a message to a ticket (support staff reply or internal note).
 * 
 * @param tenantSlug - The tenant organization slug
 * @param ticketId - The ID of the ticket to post to
 * @param content - The message content
 * @param isInternal - Whether this is an internal note (not visible to customer)
 * @returns Promise resolving to a result object with success status and optional message or error
 */
export async function postTicketMessage(
	tenantSlug: string,
	ticketId: string,
	content: string,
	isInternal = false,
): Promise<{
	success: boolean;
	message?: {
		id: string;
		type: "agent";
		author: string;
		timestamp: string;
		content: string;
		isInternal: boolean;
	};
	error?: string;
}> {
	try {
		const response = await fetch(
			`/api/tenant/${tenantSlug}/tickets/${ticketId}`,
			{
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content, isInternal }),
			},
		);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error("Failed to post message:", response.statusText);
			return {
				success: false,
				error: errorData.error || "Failed to send message",
			};
		}

		const data = await response.json();
		return {
			success: true,
			message: data.message,
		};
	} catch (error) {
		console.error("Error posting message:", error);
		return {
			success: false,
			error: "Network error occurred",
		};
	}
}

/**
 * Legacy function for backward compatibility with CreateTicketDialog.
 * 
 * Creates a ticket locally without API call. For new code, use createTicket instead.
 * 
 * @param input - The ticket data (without customerId)
 * @returns The created ticket object
 */
export function addTicket(
	input: Omit<CreateTicketInput, "customerId">,
): Ticket {
	const newTicket: Ticket = {
		id: String(Date.now()),
		title: input.title,
		company: input.customer.company,
		ticketNumber: `#${9900 + Math.floor(Math.random() * 100)}`,
		priority: input.priority,
		status: "open",
		timeAgo: "Just now",
		preview:
			input.message.slice(0, 60) + (input.message.length > 60 ? "..." : ""),
		customer: input.customer,
		messages: [
			{
				type: "customer",
				author: input.customer.name,
				timestamp: "Just now",
				content: input.message,
			},
		],
	};

	ticketsStore.setState((prev) => [newTicket, ...prev]);
	return newTicket;
}

/**
 * Available filter options for ticket lists.
 */
export const filterOptions = [
	{ id: "all", label: "All" },
	{ id: "my-open", label: "Mine" },
	{ id: "unassigned", label: "Unassigned" },
	{ id: "open", label: "Open" },
	{ id: "pending", label: "Pending" },
	{ id: "closed", label: "Closed" },
	{ id: "urgent", label: "Urgent" },
];

/**
 * Support staff member for ticket assignment.
 * 
 * Represents a support team member who can be assigned to tickets.
 */
export interface SupportMember {
	id: string;
	name: string;
	email: string;
	role: string;
	image?: string | null;
}

/**
 * Fetch support staff members for ticket assignment dropdown.
 * 
 * @param tenantSlug - The tenant organization slug
 * @returns Promise resolving to an array of support staff members
 */
export async function fetchSupportMembers(
	tenantSlug: string,
): Promise<SupportMember[]> {
	try {
		const response = await fetch(`/api/tenant/${tenantSlug}/members`, {
			credentials: "include",
		});

		if (!response.ok) {
			console.error("Failed to fetch support members:", response.statusText);
			return [];
		}

		const data = await response.json();
		return data.members || [];
	} catch (error) {
		console.error("Error fetching support members:", error);
		return [];
	}
}
