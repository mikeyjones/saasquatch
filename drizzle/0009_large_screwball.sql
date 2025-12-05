CREATE TABLE "invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"subscriptionId" text NOT NULL,
	"tenantOrganizationId" text NOT NULL,
	"invoiceNumber" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"tax" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"issueDate" timestamp NOT NULL,
	"dueDate" timestamp NOT NULL,
	"paidAt" timestamp,
	"lineItems" text NOT NULL,
	"pdfPath" text,
	"billingName" text,
	"billingEmail" text,
	"billingAddress" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_subscriptionId_subscription_id_fk" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_tenantOrganizationId_tenant_organization_id_fk" FOREIGN KEY ("tenantOrganizationId") REFERENCES "public"."tenant_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_organization_idx" ON "invoice" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "invoice_subscription_idx" ON "invoice" USING btree ("subscriptionId");--> statement-breakpoint
CREATE INDEX "invoice_tenant_org_idx" ON "invoice" USING btree ("tenantOrganizationId");--> statement-breakpoint
CREATE INDEX "invoice_number_idx" ON "invoice" USING btree ("organizationId","invoiceNumber");--> statement-breakpoint
CREATE INDEX "invoice_status_idx" ON "invoice" USING btree ("organizationId","status");