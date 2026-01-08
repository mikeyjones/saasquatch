import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/db";
import { invoice, organization } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const Route = createFileRoute(
	"/api/tenant/$tenant/invoices/$invoiceId/finalize",
)({
	server: {
		handlers: {
			/**
			 * POST /api/tenant/:tenant/invoices/:invoiceId/finalize
			 * Finalize an invoice by changing status from draft to final
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

					// Fetch the invoice
					const invoiceData = await db
						.select({
							id: invoice.id,
							invoiceNumber: invoice.invoiceNumber,
							status: invoice.status,
						})
						.from(invoice)
						.where(
							and(
								eq(invoice.id, params.invoiceId),
								eq(invoice.organizationId, orgId),
							),
						)
						.limit(1);

					if (invoiceData.length === 0) {
						return new Response(
							JSON.stringify({ error: "Invoice not found" }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					const inv = invoiceData[0];

					// Check if invoice is already finalized
					if (inv.status === "final") {
						return new Response(
							JSON.stringify({ error: "Invoice is already finalized" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Only allow finalization from draft status
					if (inv.status !== "draft") {
						return new Response(
							JSON.stringify({ error: "Only draft invoices can be finalized" }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					const now = new Date();

					// Update invoice status to final
					await db
						.update(invoice)
						.set({
							status: "final",
							updatedAt: now,
						})
						.where(eq(invoice.id, inv.id));

					return new Response(
						JSON.stringify({
							success: true,
							invoice: {
								id: inv.id,
								invoiceNumber: inv.invoiceNumber,
								status: "final",
								updatedAt: now.toISOString(),
							},
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				} catch (error) {
					console.error("Error finalizing invoice:", error);
					return new Response(
						JSON.stringify({ error: "Internal server error" }),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			},
		},
	},
});
