CREATE TABLE "coupon" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"discountType" text NOT NULL,
	"discountValue" integer NOT NULL,
	"applicablePlanIds" text,
	"maxRedemptions" integer,
	"redemptionCount" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_add_on" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"pricingModel" text DEFAULT 'flat' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_add_on_pricing" (
	"id" text PRIMARY KEY NOT NULL,
	"productAddOnId" text NOT NULL,
	"pricingType" text DEFAULT 'base' NOT NULL,
	"region" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"interval" text,
	"perSeatAmount" integer,
	"usageMeterId" text,
	"usageTiers" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_family" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_feature" (
	"id" text PRIMARY KEY NOT NULL,
	"productPlanId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_feature_flag" (
	"id" text PRIMARY KEY NOT NULL,
	"productPlanId" text NOT NULL,
	"flagKey" text NOT NULL,
	"flagValue" text DEFAULT 'true' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"productFamilyId" text,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"pricingModel" text DEFAULT 'flat' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_pricing" (
	"id" text PRIMARY KEY NOT NULL,
	"productPlanId" text NOT NULL,
	"pricingType" text DEFAULT 'base' NOT NULL,
	"region" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"interval" text,
	"perSeatAmount" integer,
	"usageMeterId" text,
	"usageTiers" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coupon" ADD CONSTRAINT "coupon_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_add_on" ADD CONSTRAINT "product_add_on_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_add_on_pricing" ADD CONSTRAINT "product_add_on_pricing_productAddOnId_product_add_on_id_fk" FOREIGN KEY ("productAddOnId") REFERENCES "public"."product_add_on"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_family" ADD CONSTRAINT "product_family_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_feature" ADD CONSTRAINT "product_feature_productPlanId_product_plan_id_fk" FOREIGN KEY ("productPlanId") REFERENCES "public"."product_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_feature_flag" ADD CONSTRAINT "product_feature_flag_productPlanId_product_plan_id_fk" FOREIGN KEY ("productPlanId") REFERENCES "public"."product_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_plan" ADD CONSTRAINT "product_plan_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_plan" ADD CONSTRAINT "product_plan_productFamilyId_product_family_id_fk" FOREIGN KEY ("productFamilyId") REFERENCES "public"."product_family"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_pricing" ADD CONSTRAINT "product_pricing_productPlanId_product_plan_id_fk" FOREIGN KEY ("productPlanId") REFERENCES "public"."product_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coupon_organization_idx" ON "coupon" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "coupon_code_idx" ON "coupon" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "coupon_status_idx" ON "coupon" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "product_add_on_organization_idx" ON "product_add_on" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "product_add_on_status_idx" ON "product_add_on" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "product_add_on_pricing_add_on_idx" ON "product_add_on_pricing" USING btree ("productAddOnId");--> statement-breakpoint
CREATE INDEX "product_add_on_pricing_type_idx" ON "product_add_on_pricing" USING btree ("productAddOnId","pricingType");--> statement-breakpoint
CREATE INDEX "product_family_organization_idx" ON "product_family" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "product_feature_plan_idx" ON "product_feature" USING btree ("productPlanId");--> statement-breakpoint
CREATE INDEX "product_feature_order_idx" ON "product_feature" USING btree ("productPlanId","order");--> statement-breakpoint
CREATE INDEX "product_feature_flag_plan_idx" ON "product_feature_flag" USING btree ("productPlanId");--> statement-breakpoint
CREATE INDEX "product_feature_flag_key_idx" ON "product_feature_flag" USING btree ("productPlanId","flagKey");--> statement-breakpoint
CREATE INDEX "product_plan_organization_idx" ON "product_plan" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "product_plan_family_idx" ON "product_plan" USING btree ("productFamilyId");--> statement-breakpoint
CREATE INDEX "product_plan_status_idx" ON "product_plan" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "product_pricing_plan_idx" ON "product_pricing" USING btree ("productPlanId");--> statement-breakpoint
CREATE INDEX "product_pricing_type_idx" ON "product_pricing" USING btree ("productPlanId","pricingType");--> statement-breakpoint
CREATE INDEX "product_pricing_region_idx" ON "product_pricing" USING btree ("productPlanId","region");