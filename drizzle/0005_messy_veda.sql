CREATE TABLE "deal" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"tenantOrganizationId" text NOT NULL,
	"pipelineId" text NOT NULL,
	"stageId" text NOT NULL,
	"name" text NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"assignedToUserId" text,
	"assignedToAI" boolean DEFAULT false NOT NULL,
	"linkedSubscriptionId" text,
	"linkedTrialId" text,
	"manualScore" integer,
	"aiScore" integer,
	"badges" text,
	"customFields" text,
	"nextTask" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"dealId" text NOT NULL,
	"activityType" text NOT NULL,
	"description" text NOT NULL,
	"userId" text,
	"aiAgentId" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_contact" (
	"dealId" text NOT NULL,
	"tenantUserId" text NOT NULL,
	"role" text DEFAULT 'contact' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deal_contact_dealId_tenantUserId_pk" PRIMARY KEY("dealId","tenantUserId")
);
--> statement-breakpoint
CREATE TABLE "pipeline" (
	"id" text PRIMARY KEY NOT NULL,
	"tenantOrganizationId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_stage" (
	"id" text PRIMARY KEY NOT NULL,
	"pipelineId" text NOT NULL,
	"name" text NOT NULL,
	"order" integer NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deal" ADD CONSTRAINT "deal_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal" ADD CONSTRAINT "deal_tenantOrganizationId_tenant_organization_id_fk" FOREIGN KEY ("tenantOrganizationId") REFERENCES "public"."tenant_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal" ADD CONSTRAINT "deal_pipelineId_pipeline_id_fk" FOREIGN KEY ("pipelineId") REFERENCES "public"."pipeline"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal" ADD CONSTRAINT "deal_stageId_pipeline_stage_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."pipeline_stage"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal" ADD CONSTRAINT "deal_assignedToUserId_user_id_fk" FOREIGN KEY ("assignedToUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_activity" ADD CONSTRAINT "deal_activity_dealId_deal_id_fk" FOREIGN KEY ("dealId") REFERENCES "public"."deal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_activity" ADD CONSTRAINT "deal_activity_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_contact" ADD CONSTRAINT "deal_contact_dealId_deal_id_fk" FOREIGN KEY ("dealId") REFERENCES "public"."deal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_contact" ADD CONSTRAINT "deal_contact_tenantUserId_tenant_user_id_fk" FOREIGN KEY ("tenantUserId") REFERENCES "public"."tenant_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline" ADD CONSTRAINT "pipeline_tenantOrganizationId_tenant_organization_id_fk" FOREIGN KEY ("tenantOrganizationId") REFERENCES "public"."tenant_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stage" ADD CONSTRAINT "pipeline_stage_pipelineId_pipeline_id_fk" FOREIGN KEY ("pipelineId") REFERENCES "public"."pipeline"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deal_organization_idx" ON "deal" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "deal_tenant_org_idx" ON "deal" USING btree ("tenantOrganizationId");--> statement-breakpoint
CREATE INDEX "deal_pipeline_idx" ON "deal" USING btree ("pipelineId");--> statement-breakpoint
CREATE INDEX "deal_stage_idx" ON "deal" USING btree ("stageId");--> statement-breakpoint
CREATE INDEX "deal_assigned_idx" ON "deal" USING btree ("assignedToUserId");--> statement-breakpoint
CREATE INDEX "deal_activity_deal_idx" ON "deal_activity" USING btree ("dealId");--> statement-breakpoint
CREATE INDEX "deal_activity_created_idx" ON "deal_activity" USING btree ("dealId","createdAt");--> statement-breakpoint
CREATE INDEX "deal_contact_deal_idx" ON "deal_contact" USING btree ("dealId");--> statement-breakpoint
CREATE INDEX "deal_contact_tenant_user_idx" ON "deal_contact" USING btree ("tenantUserId");--> statement-breakpoint
CREATE INDEX "pipeline_tenant_org_idx" ON "pipeline" USING btree ("tenantOrganizationId");--> statement-breakpoint
CREATE INDEX "pipeline_stage_pipeline_idx" ON "pipeline_stage" USING btree ("pipelineId");--> statement-breakpoint
CREATE INDEX "pipeline_stage_order_idx" ON "pipeline_stage" USING btree ("pipelineId","order");