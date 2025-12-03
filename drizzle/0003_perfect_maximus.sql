CREATE TABLE "ticket" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"ticketNumber" integer NOT NULL,
	"tenantUserId" text,
	"title" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"assignedToUserId" text,
	"assignedToAI" boolean DEFAULT false NOT NULL,
	"channel" text DEFAULT 'web' NOT NULL,
	"slaDeadline" timestamp,
	"firstResponseAt" timestamp,
	"resolvedAt" timestamp,
	"tags" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_ai_triage" (
	"id" text PRIMARY KEY NOT NULL,
	"ticketId" text NOT NULL,
	"category" text,
	"sentiment" text,
	"urgencyScore" integer,
	"suggestedAction" text,
	"suggestedPlaybook" text,
	"suggestedPlaybookLink" text,
	"summary" text,
	"draftResponse" text,
	"confidence" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_ai_triage_ticketId_unique" UNIQUE("ticketId")
);
--> statement-breakpoint
CREATE TABLE "ticket_message" (
	"id" text PRIMARY KEY NOT NULL,
	"ticketId" text NOT NULL,
	"messageType" text DEFAULT 'customer' NOT NULL,
	"authorTenantUserId" text,
	"authorUserId" text,
	"authorName" text NOT NULL,
	"content" text NOT NULL,
	"isInternal" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_tenantUserId_tenant_user_id_fk" FOREIGN KEY ("tenantUserId") REFERENCES "public"."tenant_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_assignedToUserId_user_id_fk" FOREIGN KEY ("assignedToUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_ai_triage" ADD CONSTRAINT "ticket_ai_triage_ticketId_ticket_id_fk" FOREIGN KEY ("ticketId") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_ticketId_ticket_id_fk" FOREIGN KEY ("ticketId") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_authorTenantUserId_tenant_user_id_fk" FOREIGN KEY ("authorTenantUserId") REFERENCES "public"."tenant_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_authorUserId_user_id_fk" FOREIGN KEY ("authorUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_organization_idx" ON "ticket" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "ticket_status_idx" ON "ticket" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "ticket_priority_idx" ON "ticket" USING btree ("organizationId","priority");--> statement-breakpoint
CREATE INDEX "ticket_assigned_idx" ON "ticket" USING btree ("assignedToUserId");--> statement-breakpoint
CREATE INDEX "ticket_tenant_user_idx" ON "ticket" USING btree ("tenantUserId");--> statement-breakpoint
CREATE INDEX "ticket_number_idx" ON "ticket" USING btree ("organizationId","ticketNumber");--> statement-breakpoint
CREATE INDEX "ticket_ai_triage_ticket_idx" ON "ticket_ai_triage" USING btree ("ticketId");--> statement-breakpoint
CREATE INDEX "ticket_message_ticket_idx" ON "ticket_message" USING btree ("ticketId");--> statement-breakpoint
CREATE INDEX "ticket_message_created_idx" ON "ticket_message" USING btree ("ticketId","createdAt");