-- Add customer importance field for support prioritization
ALTER TABLE "tenant_organization" ADD COLUMN "importance" text DEFAULT 'normal';

-- Add index for importance filtering
CREATE INDEX "tenant_org_importance_idx" ON "tenant_organization" ("importance");
