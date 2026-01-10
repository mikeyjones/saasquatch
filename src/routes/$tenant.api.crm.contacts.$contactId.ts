import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { tenantOrganization, organization, tenantUser } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const Route = createFileRoute(
	"/$tenant/api/crm/contacts/$contactId",
)({
	server: {
		handlers: {
			/**
			 * GET /:tenant/api/crm/contacts/:contactId
			 * Fetch a single contact with details
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

					// Fetch contact with customer info
					const contact = await db
						.select({
							id: tenantUser.id,
							name: tenantUser.name,
							email: tenantUser.email,
							phone: tenantUser.phone,
							avatarUrl: tenantUser.avatarUrl,
							title: tenantUser.title,
							role: tenantUser.role,
							isOwner: tenantUser.isOwner,
							status: tenantUser.status,
							notes: tenantUser.notes,
							lastActivityAt: tenantUser.lastActivityAt,
							createdAt: tenantUser.createdAt,
							updatedAt: tenantUser.updatedAt,
							customerId: tenantOrganization.id,
							customerName: tenantOrganization.name,
						})
						.from(tenantUser)
						.innerJoin(
							tenantOrganization,
							eq(tenantUser.tenantOrganizationId, tenantOrganization.id),
						)
						.where(
							and(
								eq(tenantUser.id, params.contactId),
								eq(tenantOrganization.organizationId, orgId),
							),
						)
						.limit(1);

					if (contact.length === 0) {
						return new Response(
							JSON.stringify({ error: "Contact not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const c = contact[0];

					return new Response(
						JSON.stringify({
							contact: {
								id: c.id,
								name: c.name,
								email: c.email,
								phone: c.phone,
								avatarUrl: c.avatarUrl,
								title: c.title,
								role: c.role,
								isOwner: c.isOwner,
								status: c.status,
								notes: c.notes,
								lastActivityAt: c.lastActivityAt?.toISOString() || null,
								createdAt: c.createdAt.toISOString(),
								updatedAt: c.updatedAt.toISOString(),
							},
							customer: {
								id: c.customerId,
								name: c.customerName,
							},
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Error fetching contact:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * PUT /:tenant/api/crm/contacts/:contactId
			 * Update an existing contact
			 * Body:
			 * - name (optional)
			 * - email (optional)
			 * - phone (optional)
			 * - title (optional)
			 * - role (optional)
			 * - avatarUrl (optional)
			 * - notes (optional)
			 * - isOwner (optional)
			 * - status (optional) - 'active' | 'suspended' | 'invited'
			 */
			PUT: async ({ request, params }) => {
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

					// Verify contact exists and belongs to a customer in this organization
					const existingContact = await db
						.select({
							id: tenantUser.id,
							customerId: tenantOrganization.id,
							customerName: tenantOrganization.name,
						})
						.from(tenantUser)
						.innerJoin(
							tenantOrganization,
							eq(tenantUser.tenantOrganizationId, tenantOrganization.id),
						)
						.where(
							and(
								eq(tenantUser.id, params.contactId),
								eq(tenantOrganization.organizationId, orgId),
							),
						)
						.limit(1);

					if (existingContact.length === 0) {
						return new Response(
							JSON.stringify({ error: "Contact not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					// Parse request body
					const body = await request.json();
					const {
						name,
						email,
						phone,
						title,
						role,
						avatarUrl,
						notes,
						isOwner,
						status,
					} = body as {
						name?: string;
						email?: string;
						phone?: string;
						title?: string;
						role?: string;
						avatarUrl?: string;
						notes?: string;
						isOwner?: boolean;
						status?: string;
					};

					// Build update object
					const updateData: {
						name?: string;
						email?: string;
						phone?: string | null;
						title?: string | null;
						role?: string;
						avatarUrl?: string | null;
						notes?: string | null;
						isOwner?: boolean;
						status?: string;
						updatedAt: Date;
					} = {
						updatedAt: new Date(),
					};

					if (
						name !== undefined &&
						typeof name === "string" &&
						name.trim().length > 0
					) {
						updateData.name = name.trim();
					}

					if (
						email !== undefined &&
						typeof email === "string" &&
						email.trim().length > 0
					) {
						// Basic email validation
						const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
						if (!emailRegex.test(email.trim())) {
							return new Response(
								JSON.stringify({ error: "Invalid email format" }),
								{
									status: 400,
									headers: { "Content-Type": "application/json" },
								},
							);
						}
						updateData.email = email.trim().toLowerCase();
					}

					if (phone !== undefined) {
						updateData.phone = phone?.trim() || null;
					}

					if (title !== undefined) {
						updateData.title = title?.trim() || null;
					}

					if (role !== undefined) {
						const validRoles = ["owner", "admin", "user", "viewer"];
						if (validRoles.includes(role)) {
							updateData.role = role;
						}
					}

					if (avatarUrl !== undefined) {
						updateData.avatarUrl = avatarUrl || null;
					}

					if (notes !== undefined) {
						updateData.notes = notes?.trim() || null;
					}

					if (isOwner !== undefined) {
						updateData.isOwner = isOwner;
					}

					if (status !== undefined) {
						const validStatuses = ["active", "suspended", "invited"];
						if (validStatuses.includes(status)) {
							updateData.status = status;
						}
					}

					// Update contact
					await db
						.update(tenantUser)
						.set(updateData)
						.where(eq(tenantUser.id, params.contactId));

					// Fetch updated contact
					const updatedContact = await db
						.select({
							id: tenantUser.id,
							name: tenantUser.name,
							email: tenantUser.email,
							phone: tenantUser.phone,
							avatarUrl: tenantUser.avatarUrl,
							title: tenantUser.title,
							role: tenantUser.role,
							isOwner: tenantUser.isOwner,
							status: tenantUser.status,
							notes: tenantUser.notes,
							lastActivityAt: tenantUser.lastActivityAt,
							createdAt: tenantUser.createdAt,
							updatedAt: tenantUser.updatedAt,
						})
						.from(tenantUser)
						.where(eq(tenantUser.id, params.contactId))
						.limit(1);

					const c = updatedContact[0];

					return new Response(
						JSON.stringify({
							success: true,
							contact: {
								id: c.id,
								name: c.name,
								email: c.email,
								phone: c.phone,
								avatarUrl: c.avatarUrl,
								title: c.title,
								role: c.role,
								isOwner: c.isOwner,
								status: c.status,
								notes: c.notes,
								lastActivityAt: c.lastActivityAt?.toISOString() || null,
								createdAt: c.createdAt.toISOString(),
								updatedAt: c.updatedAt.toISOString(),
							},
							customer: {
								id: existingContact[0].customerId,
								name: existingContact[0].customerName,
							},
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Error updating contact:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},

			/**
			 * DELETE /:tenant/api/crm/contacts/:contactId
			 * Delete a contact
			 */
			DELETE: async ({ request, params }) => {
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

					// Verify contact exists and belongs to a customer in this organization
					const existingContact = await db
						.select({
							id: tenantUser.id,
							name: tenantUser.name,
							customerId: tenantOrganization.id,
							customerName: tenantOrganization.name,
						})
						.from(tenantUser)
						.innerJoin(
							tenantOrganization,
							eq(tenantUser.tenantOrganizationId, tenantOrganization.id),
						)
						.where(
							and(
								eq(tenantUser.id, params.contactId),
								eq(tenantOrganization.organizationId, orgId),
							),
						)
						.limit(1);

					if (existingContact.length === 0) {
						return new Response(
							JSON.stringify({ error: "Contact not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					// Delete contact
					await db
						.delete(tenantUser)
						.where(eq(tenantUser.id, params.contactId));

					return new Response(
						JSON.stringify({
							success: true,
							message: `Contact "${existingContact[0].name}" has been deleted`,
							deletedContact: {
								id: existingContact[0].id,
								name: existingContact[0].name,
							},
							customer: {
								id: existingContact[0].customerId,
								name: existingContact[0].customerName,
							},
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Error deleting contact:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
