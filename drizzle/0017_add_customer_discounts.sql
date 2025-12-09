-- Add customer discount fields for pricing
ALTER TABLE "tenant_organization" ADD COLUMN "customerDiscountType" text;
ALTER TABLE "tenant_organization" ADD COLUMN "customerDiscountValue" integer;
ALTER TABLE "tenant_organization" ADD COLUMN "customerDiscountIsRecurring" boolean DEFAULT false;
ALTER TABLE "tenant_organization" ADD COLUMN "customerDiscountNotes" text;
