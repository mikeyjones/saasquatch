-- Fix todos table: Add organizationId column if it doesn't exist
-- This column should have been added by migration 0001, but the fix-up migration created the table without it

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'todos'
        AND column_name = 'organizationId'
    ) THEN
        ALTER TABLE "todos" ADD COLUMN "organizationId" text;
        ALTER TABLE "todos" ADD CONSTRAINT "todos_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
        CREATE INDEX "todos_organization_idx" ON "todos" USING btree ("organizationId");
    END IF;
END $$;
