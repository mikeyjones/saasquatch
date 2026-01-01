-- Create quote table for pricing proposals
-- Quotes can be linked to deals and product plans, and converted to invoices

CREATE TABLE "quote" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"tenantOrganizationId" text NOT NULL,
	"dealId" text,
	"productPlanId" text,
	"quoteNumber" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parentQuoteId" text,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"tax" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"validUntil" timestamp,
	"lineItems" text NOT NULL,
	"convertedToInvoiceId" text,
	"pdfPath" text,
	"billingName" text,
	"billingEmail" text,
	"billingAddress" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"sentAt" timestamp,
	"acceptedAt" timestamp,
	"rejectedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_tenantOrganizationId_tenant_organization_id_fk" FOREIGN KEY ("tenantOrganizationId") REFERENCES "public"."tenant_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_dealId_deal_id_fk" FOREIGN KEY ("dealId") REFERENCES "public"."deal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_productPlanId_product_plan_id_fk" FOREIGN KEY ("productPlanId") REFERENCES "public"."product_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_parentQuoteId_quote_id_fk" FOREIGN KEY ("parentQuoteId") REFERENCES "public"."quote"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_convertedToInvoiceId_invoice_id_fk" FOREIGN KEY ("convertedToInvoiceId") REFERENCES "public"."invoice"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_organization_idx" ON "quote" ("organizationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_tenant_org_idx" ON "quote" ("tenantOrganizationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_deal_idx" ON "quote" ("dealId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_product_plan_idx" ON "quote" ("productPlanId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_number_idx" ON "quote" ("organizationId","quoteNumber");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_status_idx" ON "quote" ("organizationId","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_parent_idx" ON "quote" ("parentQuoteId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quote_converted_invoice_idx" ON "quote" ("convertedToInvoiceId");

