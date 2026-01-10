import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { auditLog, organization, ticket } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const Route = createFileRoute(
	"/$tenant/api/tickets/$ticketId/audit-logs",
)({
	server: {
		handlers: {
			/**
			 * GET /:tenant/api/tickets/:ticketId/audit-logs
			 * Fetch audit log history for a specific ticket
			 */
			GET: async ({ request, params }) => {
				try {
					// Get session from Better Auth
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

					// Verify ticket exists and belongs to this organization
					const ticketExists = await db
						.select({ id: ticket.id })
						.from(ticket)
						.where(
							and(
								eq(ticket.id, params.ticketId),
								eq(ticket.organizationId, orgId),
							),
						)
						.limit(1);

					if (ticketExists.length === 0) {
						return new Response(JSON.stringify({ error: "Ticket not found" }), {
							status: 404,
							headers: { "Content-Type": "application/json" },
						});
					}

					// Fetch audit logs for this ticket
					const logs = await db
						.select({
							id: auditLog.id,
							performedByUserId: auditLog.performedByUserId,
							performedByName: auditLog.performedByName,
							action: auditLog.action,
							fieldName: auditLog.fieldName,
							oldValue: auditLog.oldValue,
							newValue: auditLog.newValue,
							metadata: auditLog.metadata,
							createdAt: auditLog.createdAt,
						})
						.from(auditLog)
						.where(
							and(
								eq(auditLog.organizationId, orgId),
								eq(auditLog.entityType, "ticket"),
								eq(auditLog.entityId, params.ticketId),
							),
						)
						.orderBy(desc(auditLog.createdAt))
						.limit(100); // Limit to last 100 changes

					return new Response(
						JSON.stringify({
							logs: logs.map((log) => ({
								id: log.id,
								performedByUserId: log.performedByUserId,
								performedByName: log.performedByName,
								action: log.action,
								fieldName: log.fieldName,
								oldValue: log.oldValue,
								newValue: log.newValue,
								metadata: log.metadata,
								createdAt: log.createdAt.toISOString(),
							})),
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Error fetching ticket audit logs:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
