CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"tenantOrganizationId" text,
	"performedByUserId" text,
	"performedByName" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"action" text NOT NULL,
	"fieldName" text,
	"oldValue" text,
	"newValue" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenantOrganizationId_tenant_organization_id_fk" FOREIGN KEY ("tenantOrganizationId") REFERENCES "public"."tenant_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_performedByUserId_user_id_fk" FOREIGN KEY ("performedByUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_organization_idx" ON "audit_log" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "audit_log_tenant_org_idx" ON "audit_log" USING btree ("tenantOrganizationId");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "audit_log_performed_by_idx" ON "audit_log" USING btree ("performedByUserId");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("createdAt");