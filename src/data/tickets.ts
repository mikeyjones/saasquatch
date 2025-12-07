import { Store } from "@tanstack/store";

export interface Ticket {
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
		name: string;
		company: string;
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
		initials: string;
		subscriptionPlan?: string;
		subscriptionStatus?: string;
	};
	messages: Array<{
		id?: string;
		type: "customer" | "agent" | "ai" | "system";
		author: string;
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

// Create a store for tickets (used for optimistic updates)
export const ticketsStore = new Store<Ticket[]>([]);

/**
 * Fetch all tickets from the API
 */
export async function fetchTickets(
	tenantSlug: string,
	filters?: { status?: string; priority?: string; search?: string },
): Promise<Ticket[]> {
	try {
		const url = new URL(
			`/api/tenant/${tenantSlug}/tickets`,
			window.location.origin,
		);

		if (filters?.status) url.searchParams.set("status", filters.status);
		if (filters?.priority) url.searchParams.set("priority", filters.priority);
		if (filters?.search) url.searchParams.set("search", filters.search);

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
 * Fetch a single ticket with all details
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
 * Create a new ticket via API
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
 * Update ticket status, priority, or assignment
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

// Legacy function for backward compatibility with CreateTicketDialog
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

export const filterOptions = [
	{ id: "all", label: "All" },
	{ id: "open", label: "Open" },
	{ id: "pending", label: "Pending" },
	{ id: "closed", label: "Closed" },
	{ id: "urgent", label: "Urgent" },
];
