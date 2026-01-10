-- Migration: Add organization_api_key table for org-scoped API tokens
-- This table links Better Auth's apikey table to organizations with role-based access

CREATE TABLE IF NOT EXISTS "organization_api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"role" text DEFAULT 'read-only' NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_api_key" ADD CONSTRAINT "organization_api_key_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_api_key" ADD CONSTRAINT "organization_api_key_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_api_key_org_idx" ON "organization_api_key" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_api_key_api_key_idx" ON "organization_api_key" USING btree ("api_key_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_api_key_created_by_idx" ON "organization_api_key" USING btree ("created_by_user_id");
