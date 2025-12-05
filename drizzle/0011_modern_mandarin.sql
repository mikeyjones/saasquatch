CREATE TABLE "product_plan_add_on" (
	"id" text PRIMARY KEY NOT NULL,
	"productPlanId" text NOT NULL,
	"productAddOnId" text NOT NULL,
	"billingType" text DEFAULT 'billed_with_main' NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_plan_add_on_productPlanId_productAddOnId_unique" UNIQUE("productPlanId","productAddOnId")
);
--> statement-breakpoint
ALTER TABLE "product_plan_add_on" ADD CONSTRAINT "product_plan_add_on_productPlanId_product_plan_id_fk" FOREIGN KEY ("productPlanId") REFERENCES "public"."product_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_plan_add_on" ADD CONSTRAINT "product_plan_add_on_productAddOnId_product_add_on_id_fk" FOREIGN KEY ("productAddOnId") REFERENCES "public"."product_add_on"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_plan_add_on_plan_idx" ON "product_plan_add_on" USING btree ("productPlanId");--> statement-breakpoint
CREATE INDEX "product_plan_add_on_add_on_idx" ON "product_plan_add_on" USING btree ("productAddOnId");