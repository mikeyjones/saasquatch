ALTER TABLE "tenant_organization" ADD COLUMN "tags" text;--> statement-breakpoint
ALTER TABLE "tenant_organization" ADD COLUMN "assignedToUserId" text;--> statement-breakpoint
ALTER TABLE "tenant_organization" ADD CONSTRAINT "tenant_organization_assignedToUserId_user_id_fk" FOREIGN KEY ("assignedToUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tenant_org_assigned_idx" ON "tenant_organization" USING btree ("assignedToUserId");