CREATE TABLE "knowledge_article" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"slug" text NOT NULL,
	"category" text,
	"tags" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"publishedAt" timestamp,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbook" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'manual' NOT NULL,
	"steps" text,
	"triggers" text,
	"actions" text,
	"category" text,
	"tags" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"createdByUserId" text,
	"updatedByUserId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_article" ADD CONSTRAINT "knowledge_article_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_article" ADD CONSTRAINT "knowledge_article_createdByUserId_user_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_article" ADD CONSTRAINT "knowledge_article_updatedByUserId_user_id_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook" ADD CONSTRAINT "playbook_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook" ADD CONSTRAINT "playbook_createdByUserId_user_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook" ADD CONSTRAINT "playbook_updatedByUserId_user_id_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_article_organization_idx" ON "knowledge_article" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "knowledge_article_status_idx" ON "knowledge_article" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "knowledge_article_category_idx" ON "knowledge_article" USING btree ("organizationId","category");--> statement-breakpoint
CREATE INDEX "knowledge_article_slug_idx" ON "knowledge_article" USING btree ("organizationId","slug");--> statement-breakpoint
CREATE INDEX "playbook_organization_idx" ON "playbook" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX "playbook_type_idx" ON "playbook" USING btree ("organizationId","type");--> statement-breakpoint
CREATE INDEX "playbook_status_idx" ON "playbook" USING btree ("organizationId","status");--> statement-breakpoint
CREATE INDEX "playbook_category_idx" ON "playbook" USING btree ("organizationId","category");