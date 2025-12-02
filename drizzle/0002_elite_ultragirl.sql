CREATE TABLE "tenant_organization" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"website" text,
	"industry" text,
	"subscriptionPlan" text DEFAULT 'free',
	"subscriptionStatus" text DEFAULT 'active',
	"billingEmail" text,
	"billingAddress" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_user" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantOrganizationId" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"avatarUrl" text,
	"role" text DEFAULT 'user' NOT NULL,
	"isOwner" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"lastActivityAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_organization" ADD CONSTRAINT "tenant_organization_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_user" ADD CONSTRAINT "tenant_user_tenantOrganizationId_tenant_organization_id_fk" FOREIGN KEY ("tenantOrganizationId") REFERENCES "public"."tenant_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_org_organization_idx" ON "tenant_organization" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "tenant_org_slug_idx" ON "tenant_organization" USING btree ("organizationId","slug");--> statement-breakpoint
CREATE INDEX "tenant_user_tenant_org_idx" ON "tenant_user" USING btree ("tenantOrganizationId");--> statement-breakpoint
CREATE INDEX "tenant_user_email_idx" ON "tenant_user" USING btree ("tenantOrganizationId","email");