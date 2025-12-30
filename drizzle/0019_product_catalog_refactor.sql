-- Add status column to product_family table (Product entity)
-- This enables products to have active/draft/archived status like plans

ALTER TABLE "product_family" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'draft' NOT NULL;

-- Add index for querying products by organization and status
CREATE INDEX IF NOT EXISTS "product_family_status_idx" ON "product_family" ("organizationId", "status");

