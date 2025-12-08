import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import {
	tenantOrganization,
	tenantUser,
	ticket,
	subscription,
	productPlan,
	invoice,
	organization,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const Route = createFileRoute(
	"/api/tenant/$tenant/support/organizations/$organizationId",
)({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					});

					if (!session?.user) {
						return new Response(
							JSON.stringify({ error: "Unauthorized" }),
							{
								status: 401,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					// Get the organization ID from tenant slug
					const tenantSlug = params.tenant;
					const org = await db
						.select({ id: organization.id })
						.from(organization)
						.where(eq(organization.slug, tenantSlug))
						.limit(1);

					if (org.length === 0) {
						return new Response(
							JSON.stringify({ error: "Organization not found" }),
							{
								status: 404,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					const orgId = org[0].id;

					// Fetch the customer organization
					const customerResult = await db
						.select({
							id: tenantOrganization.id,
							name: tenantOrganization.name,
							slug: tenantOrganization.slug,
							logo: tenantOrganization.logo,
							industry: tenantOrganization.industry,
							website: tenantOrganization.website,
							billingEmail: tenantOrganization.billingEmail,
							billingAddress: tenantOrganization.billingAddress,
							subscriptionPlan: tenantOrganization.subscriptionPlan,
							subscriptionStatus: tenantOrganization.subscriptionStatus,
							tags: tenantOrganization.tags,
							notes: tenantOrganization.notes,
							metadata: tenantOrganization.metadata,
							createdAt: tenantOrganization.createdAt,
							updatedAt: tenantOrganization.updatedAt,
						})
						.from(tenantOrganization)
						.where(
							and(
								eq(tenantOrganization.id, params.organizationId),
								eq(tenantOrganization.organizationId, orgId),
							),
						)
						.limit(1);

					if (!customerResult || customerResult.length === 0) {
						return new Response(
							JSON.stringify({ error: "Customer organization not found" }),
							{
								status: 404,
								headers: { "Content-Type": "application/json" },
							},
						);
					}

					const customer = customerResult[0];

					// Fetch subscriptions
					const subscriptions = await db
						.select({
							id: subscription.id,
							subscriptionNumber: subscription.subscriptionNumber,
							productPlanId: subscription.productPlanId,
							planName: productPlan.name,
							status: subscription.status,
							billingCycle: subscription.billingCycle,
							mrr: subscription.mrr,
							seats: subscription.seats,
							startDate: subscription.currentPeriodStart,
							renewalDate: subscription.currentPeriodEnd,
							updatedAt: subscription.updatedAt,
							createdAt: subscription.createdAt,
						})
						.from(subscription)
						.innerJoin(productPlan, eq(subscription.productPlanId, productPlan.id))
						.where(
							and(
								eq(subscription.tenantOrganizationId, params.organizationId),
								eq(subscription.organizationId, orgId),
							),
						)
						.orderBy(desc(subscription.createdAt));

					// Fetch contacts (organization members)
					const contacts = await db
						.select({
							id: tenantUser.id,
							name: tenantUser.name,
							email: tenantUser.email,
							phone: tenantUser.phone,
							title: tenantUser.title,
							role: tenantUser.role,
							isOwner: tenantUser.isOwner,
							status: tenantUser.status,
							lastActivityAt: tenantUser.lastActivityAt,
							createdAt: tenantUser.createdAt,
						})
						.from(tenantUser)
						.where(eq(tenantUser.tenantOrganizationId, params.organizationId))
						.orderBy(desc(tenantUser.createdAt));

					// Fetch tickets from all organization members
					const tickets = await db
						.select({
							id: ticket.id,
							ticketNumber: ticket.ticketNumber,
							title: ticket.title,
							status: ticket.status,
							priority: ticket.priority,
							channel: ticket.channel,
							tenantUserId: ticket.tenantUserId,
							customerName: tenantUser.name,
							customerEmail: tenantUser.email,
							assignedToUserId: ticket.assignedToUserId,
							createdAt: ticket.createdAt,
							updatedAt: ticket.updatedAt,
							resolvedAt: ticket.resolvedAt,
						})
						.from(ticket)
						.innerJoin(tenantUser, eq(ticket.tenantUserId, tenantUser.id))
						.where(
							and(
								eq(tenantUser.tenantOrganizationId, params.organizationId),
								eq(ticket.organizationId, orgId),
							),
						)
						.orderBy(desc(ticket.createdAt));

					// Fetch invoices (for billing support)
					// Temporarily disabled to debug
					const invoices: any[] = [];
					/*
					const invoices = await db
						.select({
							id: invoice.id,
							invoiceNumber: invoice.invoiceNumber,
							status: invoice.status,
							total: invoice.total,
							dueDate: invoice.dueDate,
							paidAt: invoice.paidAt,
							createdAt: invoice.createdAt,
						})
						.from(invoice)
						.where(eq(invoice.tenantOrganizationId, params.organizationId))
						.orderBy(desc(invoice.createdAt))
						.limit(10); // Limit to recent invoices
					*/

					// Calculate metrics
					const totalTickets = tickets.length;
					const openTickets = tickets.filter(
						(t) => t.status === "open" || t.status === "pending",
					).length;
					const closedTickets = tickets.filter((t) => t.status === "closed").length;
					const urgentTickets = tickets.filter((t) => t.priority === "urgent").length;

					// Calculate tickets this month
					const now = new Date();
					const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
					const ticketsThisMonth = tickets.filter(
						(t) => new Date(t.createdAt) >= startOfMonth,
					).length;

					// Calculate average response time (simplified - would need ticket messages)
					// For now, return null - can be calculated with message timestamps
					const avgResponseTime = null;

					// Calculate MRR from active subscriptions
					const activeSubs = subscriptions.filter((s) => s.status === "active");
					const totalMRR = activeSubs.reduce((sum, s) => {
						const mrr = s.mrr ? Number.parseFloat(s.mrr) : 0;
						return sum + mrr;
					}, 0);

					// Format response
					return new Response(
						JSON.stringify({
							organization: {
								id: customer.id,
								name: customer.name,
								slug: customer.slug,
								logo: customer.logo,
								industry: customer.industry,
								website: customer.website,
								billingEmail: customer.billingEmail,
								billingAddress: customer.billingAddress,
								subscriptionPlan: customer.subscriptionPlan,
								subscriptionStatus: customer.subscriptionStatus,
								tags: (() => {
									if (!customer.tags) return [];
									if (typeof customer.tags === 'string') {
										try { return JSON.parse(customer.tags); } catch { return []; }
									}
									return customer.tags;
								})(),
								notes: customer.notes,
								metadata: (() => {
									if (!customer.metadata) return {};
									if (typeof customer.metadata === 'string') {
										try { return JSON.parse(customer.metadata); } catch { return {}; }
									}
									return customer.metadata;
								})(),
								createdAt: customer.createdAt ? customer.createdAt.toISOString() : null,
								updatedAt: customer.updatedAt?.toISOString() || null,
							},
							subscriptions: subscriptions.map((s) => ({
								id: s.id,
								subscriptionNumber: s.subscriptionNumber,
								productPlanId: s.productPlanId,
								planName: s.planName,
								status: s.status,
								billingCycle: s.billingCycle,
								mrr: s.mrr,
								seats: s.seats,
								startDate: s.startDate ? s.startDate.toISOString() : null,
								renewalDate: s.renewalDate ? s.renewalDate.toISOString() : null,
								canceledAt: s.status === 'canceled' && s.updatedAt ? s.updatedAt.toISOString() : null,
								createdAt: s.createdAt ? s.createdAt.toISOString() : null,
							})),
							contacts: contacts.map((c) => ({
								id: c.id,
								name: c.name,
								email: c.email,
								phone: c.phone,
								title: c.title,
								role: c.role,
								isOwner: c.isOwner,
								status: c.status,
								lastActivityAt: c.lastActivityAt?.toISOString() || null,
								createdAt: c.createdAt ? c.createdAt.toISOString() : null,
							})),
							tickets: tickets.map((t) => ({
								id: t.id,
								ticketNumber: t.ticketNumber,
								title: t.title,
								status: t.status,
								priority: t.priority,
								channel: t.channel,
								tenantUserId: t.tenantUserId,
								customerName: t.customerName,
								customerEmail: t.customerEmail,
								assignedToUserId: t.assignedToUserId,
								createdAt: t.createdAt ? t.createdAt.toISOString() : null,
								updatedAt: t.updatedAt?.toISOString() || null,
								resolvedAt: t.resolvedAt?.toISOString() || null,
							})),
							invoices: invoices.map((i) => ({
								id: i.id,
								invoiceNumber: i.invoiceNumber,
								status: i.status,
								total: i.total,
								dueDate: i.dueDate?.toISOString() || null,
								paidAt: i.paidAt?.toISOString() || null,
								createdAt: i.createdAt ? i.createdAt.toISOString() : null,
							})),
							metrics: {
								totalTickets,
								openTickets,
								closedTickets,
								urgentTickets,
								ticketsThisMonth,
								avgResponseTime,
								contactCount: contacts.length,
								totalMRR: totalMRR.toFixed(2),
							},
						}),
						{
							status: 200,
							headers: { "Content-Type": "application/json" },
						},
					);
				} catch (error) {
					console.error("Error fetching support organization:", error);
					console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
					console.error("Error details:", JSON.stringify(error, null, 2));
					return new Response(
						JSON.stringify({
							error: "Internal server error",
							message: error instanceof Error ? error.message : String(error)
						}),
						{
							status: 500,
							headers: { "Content-Type": "application/json" },
						},
					);
				}
			},
		},
	},
});
