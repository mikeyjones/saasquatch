ALTER TABLE "todos" ADD COLUMN "organizationId" text;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "todos_organization_idx" ON "todos" USING btree ("organizationId");--> statement-breakpoint
ALTER TABLE "member" DROP COLUMN "id";