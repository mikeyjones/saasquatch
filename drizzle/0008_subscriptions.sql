CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"tenantOrganizationId" text NOT NULL,
	"subscriptionNumber" text NOT NULL,
	"productPlanId" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"billingCycle" text DEFAULT 'monthly' NOT NULL,
	"currentPeriodStart" timestamp NOT NULL,
	"currentPeriodEnd" timestamp NOT NULL,
	"mrr" integer DEFAULT 0 NOT NULL,
	"seats" integer DEFAULT 1 NOT NULL,
	"paymentMethodId" text,
	"linkedDealId" text,
	"couponId" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"subscriptionId" text NOT NULL,
	"activityType" text NOT NULL,
	"description" text NOT NULL,
	"userId" text,
	"aiAgentId" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_add_on" (
	"subscriptionId" text NOT NULL,
	"productAddOnId" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"amount" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_add_on_subscriptionId_productAddOnId_pk" PRIMARY KEY("subscriptionId","productAddOnId")
);
--> statement-breakpoint
CREATE TABLE "usage_history" (
	"id" text PRIMARY KEY NOT NULL,
	"subscriptionId" text NOT NULL,
	"usageMeterId" text NOT NULL,
	"periodStart" timestamp NOT NULL,
	"periodEnd" timestamp NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"recordedAt" timestamp DEFAULT now() NOT NULL,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_meter" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_tenantOrganizationId_tenant_organization_id_fk" FOREIGN KEY ("tenantOrganizationId") REFERENCES "public"."tenant_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_productPlanId_product_plan_id_fk" FOREIGN KEY ("productPlanId") REFERENCES "public"."product_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_linkedDealId_deal_id_fk" FOREIGN KEY ("linkedDealId") REFERENCES "public"."deal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_couponId_coupon_id_fk" FOREIGN KEY ("couponId") REFERENCES "public"."coupon"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_activity" ADD CONSTRAINT "subscription_activity_subscriptionId_subscription_id_fk" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_activity" ADD CONSTRAINT "subscription_activity_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_add_on" ADD CONSTRAINT "subscription_add_on_subscriptionId_subscription_id_fk" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_add_on" ADD CONSTRAINT "subscription_add_on_productAddOnId_product_add_on_id_fk" FOREIGN KEY ("productAddOnId") REFERENCES "public"."product_add_on"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_history" ADD CONSTRAINT "usage_history_subscriptionId_subscription_id_fk" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_history" ADD CONSTRAINT "usage_history_usageMeterId_usage_meter_id_fk" FOREIGN KEY ("usageMeterId") REFERENCES "public"."usage_meter"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_meter" ADD CONSTRAINT "usage_meter_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_organization_idx" ON "subscription" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "subscription_tenant_org_idx" ON "subscription" USING btree ("tenantOrganizationId");--> statement-breakpoint
CREATE INDEX "subscription_number_idx" ON "subscription" USING btree ("organizationId","subscriptionNumber");--> statement-breakpoint
CREATE INDEX "subscription_status_idx" ON "subscription" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "subscription_plan_idx" ON "subscription" USING btree ("productPlanId");--> statement-breakpoint
CREATE INDEX "subscription_activity_subscription_idx" ON "subscription_activity" USING btree ("subscriptionId");--> statement-breakpoint
CREATE INDEX "subscription_activity_created_idx" ON "subscription_activity" USING btree ("subscriptionId","createdAt");--> statement-breakpoint
CREATE INDEX "subscription_add_on_subscription_idx" ON "subscription_add_on" USING btree ("subscriptionId");--> statement-breakpoint
CREATE INDEX "subscription_add_on_add_on_idx" ON "subscription_add_on" USING btree ("productAddOnId");--> statement-breakpoint
CREATE INDEX "usage_history_subscription_idx" ON "usage_history" USING btree ("subscriptionId");--> statement-breakpoint
CREATE INDEX "usage_history_meter_idx" ON "usage_history" USING btree ("usageMeterId");--> statement-breakpoint
CREATE INDEX "usage_history_period_idx" ON "usage_history" USING btree ("subscriptionId","periodStart");--> statement-breakpoint
CREATE INDEX "usage_meter_organization_idx" ON "usage_meter" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "usage_meter_status_idx" ON "usage_meter" USING btree ("organizationId","status");