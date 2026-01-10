import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import {
	ticket,
	ticketMessage,
	ticketAiTriage,
	tenantUser,
	tenantOrganization,
	organization,
	user,
	member,
	auditLog,
} from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { nanoid } from "nanoid";

export const Route = createFileRoute("/$tenant/api/tickets/$ticketId")({
	server: {
		handlers: {
			/**
			 * GET /:tenant/api/tickets/:ticketId
			 * Fetch a single ticket with all messages
			 */
			GET: async ({ request, params }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session?.user) {
						return new Response(JSON.stringify({ error: "Unauthorized" }), {
							status: 401,
							headers: { "Content-Type": "application/json" },
						});
					}

					// Get the organization by slug
					const org = await db
						.select({ id: organization.id })
						.from(organization)
						.where(eq(organization.slug, params.tenant))
						.limit(1);

					if (org.length === 0) {
						return new Response(
							JSON.stringify({ error: "Organization not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const orgId = org[0].id;

					// Fetch ticket with tenant user info
					const tickets = await db
						.select({
							id: ticket.id,
							ticketNumber: ticket.ticketNumber,
							title: ticket.title,
							status: ticket.status,
							priority: ticket.priority,
							channel: ticket.channel,
							assignedToAI: ticket.assignedToAI,
							assignedToUserId: ticket.assignedToUserId,
							createdAt: ticket.createdAt,
							updatedAt: ticket.updatedAt,
							resolvedAt: ticket.resolvedAt,
							slaDeadline: ticket.slaDeadline,
							firstResponseAt: ticket.firstResponseAt,
							tenantUserId: ticket.tenantUserId,
							tenantUserName: tenantUser.name,
							tenantUserEmail: tenantUser.email,
							tenantOrgId: tenantOrganization.id,
							tenantOrgName: tenantOrganization.name,
							tenantOrgSubscriptionPlan: tenantOrganization.subscriptionPlan,
							tenantOrgSubscriptionStatus:
								tenantOrganization.subscriptionStatus,
						})
						.from(ticket)
						.leftJoin(tenantUser, eq(ticket.tenantUserId, tenantUser.id))
						.leftJoin(
							tenantOrganization,
							eq(tenantUser.tenantOrganizationId, tenantOrganization.id),
						)
						.where(
							and(
								eq(ticket.organizationId, orgId),
								eq(ticket.id, params.ticketId),
							),
						)
						.limit(1);

					if (tickets.length === 0) {
						return new Response(JSON.stringify({ error: "Ticket not found" }), {
							status: 404,
							headers: { "Content-Type": "application/json" },
						});
					}

					const t = tickets[0];

					// Fetch all messages for this ticket
					const messages = await db
						.select({
							id: ticketMessage.id,
							messageType: ticketMessage.messageType,
							authorName: ticketMessage.authorName,
							authorTenantUserId: ticketMessage.authorTenantUserId,
							authorUserId: ticketMessage.authorUserId,
							content: ticketMessage.content,
							isInternal: ticketMessage.isInternal,
							createdAt: ticketMessage.createdAt,
						})
						.from(ticketMessage)
						.where(eq(ticketMessage.ticketId, params.ticketId))
						.orderBy(asc(ticketMessage.createdAt));

					// Fetch AI triage
					const triages = await db
						.select()
						.from(ticketAiTriage)
						.where(eq(ticketAiTriage.ticketId, params.ticketId))
						.limit(1);

					const triage = triages[0];

					// Get assigned user info if assigned
					let assignedTo = null;
					if (t.assignedToUserId) {
						const assignedUsers = await db
							.select({ id: user.id, name: user.name, email: user.email })
							.from(user)
							.where(eq(user.id, t.assignedToUserId))
							.limit(1);
						if (assignedUsers.length > 0) {
							assignedTo = assignedUsers[0];
						}
					}

					// Build response
					const response = {
						id: t.id,
						ticketNumber: `#${t.ticketNumber}`,
						title: t.title,
						status: t.status,
						priority: t.priority,
						channel: t.channel,
						hasAI: t.assignedToAI,
						timeAgo: formatTimeAgo(t.createdAt),
						createdAt: t.createdAt.toISOString(),
						updatedAt: t.updatedAt.toISOString(),
						resolvedAt: t.resolvedAt?.toISOString(),
						slaDeadline: t.slaDeadline?.toISOString(),
						firstResponseAt: t.firstResponseAt?.toISOString(),
						company: t.tenantOrgName || "Unknown",
						customer: {
							id: t.tenantUserId,
							name: t.tenantUserName || "Unknown",
							email: t.tenantUserEmail || "",
							company: t.tenantOrgName || "Unknown",
							organizationId: t.tenantOrgId || undefined,
							initials: getInitials(t.tenantUserName || "U"),
							subscriptionPlan: t.tenantOrgSubscriptionPlan,
							subscriptionStatus: t.tenantOrgSubscriptionStatus,
						},
						assignedTo: assignedTo
							? {
									id: assignedTo.id,
									name: assignedTo.name,
									email: assignedTo.email,
									initials: getInitials(assignedTo.name),
								}
							: null,
						messages: messages.map((m) => ({
							id: m.id,
							type: m.messageType as "customer" | "agent" | "ai" | "system",
							author: m.authorName,
							authorTenantUserId: m.authorTenantUserId,
							timestamp: formatTimeAgo(m.createdAt),
							createdAt: m.createdAt.toISOString(),
							content: m.content,
							isInternal: m.isInternal,
						})),
						aiTriage: triage
							? {
									category: triage.category,
									sentiment: triage.sentiment,
									urgencyScore: triage.urgencyScore,
									suggestedAction: triage.suggestedAction,
									playbook: triage.suggestedPlaybook,
									playbookLink: triage.suggestedPlaybookLink || "#",
									summary: triage.summary,
									draftResponse: triage.draftResponse,
									confidence: triage.confidence,
								}
							: undefined,
					};

					return new Response(JSON.stringify({ ticket: response }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error fetching ticket:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * PATCH /:tenant/api/tickets/:ticketId
			 * Update ticket status, priority, or assignment with audit logging
			 */
			PATCH: async ({ request, params }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session?.user) {
						return new Response(JSON.stringify({ error: "Unauthorized" }), {
							status: 401,
							headers: { "Content-Type": "application/json" },
						});
					}

					// Get the organization by slug
					const org = await db
						.select({ id: organization.id })
						.from(organization)
						.where(eq(organization.slug, params.tenant))
						.limit(1);

					if (org.length === 0) {
						return new Response(
							JSON.stringify({ error: "Organization not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const orgId = org[0].id;

					// Fetch existing ticket to track changes
					const existingTickets = await db
						.select({
							id: ticket.id,
							status: ticket.status,
							priority: ticket.priority,
							assignedToUserId: ticket.assignedToUserId,
							tenantUserId: ticket.tenantUserId,
						})
						.from(ticket)
						.leftJoin(tenantUser, eq(ticket.tenantUserId, tenantUser.id))
						.leftJoin(
							tenantOrganization,
							eq(tenantUser.tenantOrganizationId, tenantOrganization.id),
						)
						.where(
							and(
								eq(ticket.organizationId, orgId),
								eq(ticket.id, params.ticketId),
							),
						)
						.limit(1);

					if (existingTickets.length === 0) {
						return new Response(JSON.stringify({ error: "Ticket not found" }), {
							status: 404,
							headers: { "Content-Type": "application/json" },
						});
					}

					const existingTicket = existingTickets[0];

					// Parse request body
					const body = await request.json();
					const { status, priority, assignedToUserId } = body as {
						status?: string;
						priority?: string;
						assignedToUserId?: string | null;
					};

					// Build update object
					const updates: Record<string, unknown> = {
						updatedAt: new Date(),
					};

					// Track changes for audit log
					const auditLogs: Array<{
						fieldName: string;
						oldValue: string | null;
						newValue: string | null;
						action: string;
					}> = [];

					if (status && status !== existingTicket.status) {
						updates.status = status;
						auditLogs.push({
							fieldName: "status",
							oldValue: existingTicket.status,
							newValue: status,
							action: status === "closed" ? "resolved" : "status_changed",
						});

						if (status === "closed") {
							updates.resolvedAt = new Date();
							auditLogs.push({
								fieldName: "resolvedAt",
								oldValue: null,
								newValue: new Date().toISOString(),
								action: "resolved",
							});
						}
					}

					if (priority && priority !== existingTicket.priority) {
						updates.priority = priority;
						auditLogs.push({
							fieldName: "priority",
							oldValue: existingTicket.priority,
							newValue: priority,
							action: "priority_changed",
						});
					}

					if (
						assignedToUserId !== undefined &&
						assignedToUserId !== existingTicket.assignedToUserId
					) {
						updates.assignedToUserId = assignedToUserId;
						auditLogs.push({
							fieldName: "assignedToUserId",
							oldValue: existingTicket.assignedToUserId,
							newValue: assignedToUserId,
							action: "assignment_changed",
						});
					}

					// Only update if there are changes
					if (Object.keys(updates).length > 1) {
						// Update ticket
						await db
							.update(ticket)
							.set(updates)
							.where(
								and(
									eq(ticket.organizationId, orgId),
									eq(ticket.id, params.ticketId),
								),
							);

						// Create audit log entries
						for (const log of auditLogs) {
							await db.insert(auditLog).values({
								id: nanoid(),
								organizationId: orgId,
								tenantOrganizationId: null, // Tickets may not always have a tenant org
								performedByUserId: session.user.id,
								performedByName: session.user.name,
								entityType: "ticket",
								entityId: params.ticketId,
								action: log.action,
								fieldName: log.fieldName,
								oldValue: log.oldValue,
								newValue: log.newValue,
							});
						}
					}

					return new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					console.error("Error updating ticket:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * POST /:tenant/api/tickets/:ticketId
			 * Add a message to a ticket (support staff reply or internal note)
			 */
			POST: async ({ request, params }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session?.user) {
						return new Response(JSON.stringify({ error: "Unauthorized" }), {
							status: 401,
							headers: { "Content-Type": "application/json" },
						});
					}

					// Get the organization by slug
					const org = await db
						.select({ id: organization.id })
						.from(organization)
						.where(eq(organization.slug, params.tenant))
						.limit(1);

					if (org.length === 0) {
						return new Response(
							JSON.stringify({ error: "Organization not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const orgId = org[0].id;

					// Verify user is a member of this organization
					const membership = await db
						.select({ role: member.role })
						.from(member)
						.where(
							and(
								eq(member.organizationId, orgId),
								eq(member.userId, session.user.id),
							),
						)
						.limit(1);

					if (membership.length === 0) {
						return new Response(
							JSON.stringify({
								error: "Forbidden: Not a member of this organization",
							}),
							{ status: 403, headers: { "Content-Type": "application/json" } },
						);
					}

					// Verify ticket exists and belongs to this organization
					const existingTicket = await db
						.select({
							id: ticket.id,
							firstResponseAt: ticket.firstResponseAt,
						})
						.from(ticket)
						.where(
							and(
								eq(ticket.organizationId, orgId),
								eq(ticket.id, params.ticketId),
							),
						)
						.limit(1);

					if (existingTicket.length === 0) {
						return new Response(JSON.stringify({ error: "Ticket not found" }), {
							status: 404,
							headers: { "Content-Type": "application/json" },
						});
					}

					// Parse request body
					const body = await request.json();
					const { content, isInternal } = body as {
						content: string;
						isInternal?: boolean;
					};

					if (
						!content ||
						typeof content !== "string" ||
						content.trim().length === 0
					) {
						return new Response(
							JSON.stringify({ error: "Message content is required" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					const now = new Date();
					const messageId = crypto
						.randomUUID()
						.replace(/-/g, "")
						.substring(0, 24);

					// Create the message
					await db.insert(ticketMessage).values({
						id: messageId,
						ticketId: params.ticketId,
						messageType: "agent",
						authorUserId: session.user.id,
						authorTenantUserId: null,
						authorName: session.user.name || "Support Agent",
						content: content.trim(),
						isInternal: isInternal ?? false,
						createdAt: now,
						updatedAt: now,
					});

					// Update ticket's updatedAt and set firstResponseAt if this is the first agent response
					const ticketUpdates: Record<string, unknown> = {
						updatedAt: now,
					};

					// Only set firstResponseAt if it hasn't been set and this is a public response
					if (!existingTicket[0].firstResponseAt && !isInternal) {
						ticketUpdates.firstResponseAt = now;
					}

					await db
						.update(ticket)
						.set(ticketUpdates)
						.where(eq(ticket.id, params.ticketId));

					// Return the created message
					return new Response(
						JSON.stringify({
							message: {
								id: messageId,
								type: "agent",
								author: session.user.name || "Support Agent",
								timestamp: "Just now",
								createdAt: now.toISOString(),
								content: content.trim(),
								isInternal: isInternal ?? false,
							},
						}),
						{
							status: 201,
							headers: { "Content-Type": "application/json" },
						},
					);
				} catch (error) {
					console.error("Error creating message:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});

function formatTimeAgo(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString();
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.substring(0, 2);
}
