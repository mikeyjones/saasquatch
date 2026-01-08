import {
	pgTable,
	serial,
	text,
	timestamp,
	boolean,
	index,
	primaryKey,
	integer,
	unique,
} from "drizzle-orm/pg-core";

export const todos = pgTable(
	"todos",
	{
		id: serial("id").primaryKey(),
		title: text("title").notNull(),
		organization_id: text("organization_id").references(() => organization.id, {
			onDelete: "cascade",
		}),
		created_at: timestamp("created_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("todos_organization_idx").on(table.organization_id),
	}),
);

// Better Auth tables
export const user = pgTable(
	"user",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		email: text("email").notNull().unique(),
		email_verified: boolean("email_verified").notNull().default(false),
		image: text("image"),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		emailIdx: index("user_email_idx").on(table.email),
	}),
);

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expires_at: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	created_at: timestamp("created_at").notNull().defaultNow(),
	updated_at: timestamp("updated_at").notNull().defaultNow(),
	ip_address: text("ip_address"),
	user_agent: text("user_agent"),
	user_id: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	account_id: text("account_id").notNull(),
	provider_id: text("provider_id").notNull(),
	user_id: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	access_token: text("access_token"),
	refresh_token: text("refresh_token"),
	id_token: text("id_token"),
	access_token_expires_at: timestamp("access_token_expires_at"),
	refresh_token_expires_at: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	created_at: timestamp("created_at").notNull().defaultNow(),
	updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expires_at: timestamp("expires_at").notNull(),
	created_at: timestamp("created_at"),
	updated_at: timestamp("updated_at"),
});

// Organization plugin tables
export const organization = pgTable("organization", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	logo: text("logo"),
	created_at: timestamp("created_at").notNull().defaultNow(),
	updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const member = pgTable(
	"member",
	{
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		user_id: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role").notNull().default("member"),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.organization_id, table.user_id] }),
	}),
);

export const invitation = pgTable("invitation", {
	id: text("id").primaryKey(),
	email: text("email").notNull(),
	organization_id: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	role: text("role").notNull().default("member"),
	status: text("status").notNull().default("pending"),
	expires_at: timestamp("expires_at").notNull(),
	created_at: timestamp("created_at").notNull().defaultNow(),
	updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// Tenant Data Tables
// These tables store customer data that belongs to a support staff organization.
// Tenant users do NOT have login accounts - they are customers being supported.
// ============================================================================

/**
 * Tenant Organization - Customer companies that support staff help
 * Scoped to a support staff organization (the logged-in user's org)
 */
export const tenantOrganization = pgTable(
	"tenant_organization",
	{
		id: text("id").primaryKey(),
		// The support staff organization this tenant belongs to
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Basic info
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		logo: text("logo"),
		website: text("website"),
		industry: text("industry"),
		// Subscription info
		subscription_plan: text("subscription_plan").default("free"),
		subscription_status: text("subscription_status").default("active"), // active, canceled, past_due, trialing
		// Billing info
		billing_email: text("billing_email"),
		billing_address: text("billing_address"),
		// CRM fields
		tags: text("tags"), // JSON array of tags, e.g., ["enterprise", "high-value"]
		assigned_to_user_id: text("assigned_to_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		// Customer importance for support prioritization
		importance: text("importance").default("normal"), // low, normal, high, vip
		// Customer discount for pricing
		customer_discount_type: text("customer_discount_type"), // percentage, fixed_amount, null
		customer_discount_value: integer("customer_discount_value"), // percentage (0-100) or cents for fixed_amount
		customer_discount_is_recurring: boolean(
			"customer_discount_is_recurring",
		).default(false), // true = applies to all future subscriptions, false = one-time
		customer_discount_notes: text("customer_discount_notes"),
		// Metadata
		notes: text("notes"),
		metadata: text("metadata"), // JSON object for custom properties/fields
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		orgIdx: index("tenant_org_organization_idx").on(table.organization_id),
		slugIdx: index("tenant_org_slug_idx").on(table.organization_id, table.slug),
		assignedIdx: index("tenant_org_assigned_idx").on(table.assigned_to_user_id),
		importanceIdx: index("tenant_org_importance_idx").on(table.importance),
	}),
);

/**
 * Tenant User - Individual customers within tenant organizations
 * These users do NOT have login accounts - they are customers being supported
 */
export const tenantUser = pgTable(
	"tenant_user",
	{
		id: text("id").primaryKey(),
		// The tenant organization this user belongs to
		tenant_organization_id: text("tenant_organization_id")
			.notNull()
			.references(() => tenantOrganization.id, { onDelete: "cascade" }),
		// Basic info
		name: text("name").notNull(),
		email: text("email").notNull(),
		phone: text("phone"),
		avatar_url: text("avatar_url"),
		title: text("title"), // Job title, e.g., "CEO", "VP of Sales"
		// Role within their organization
		role: text("role").notNull().default("user"), // owner, admin, user, viewer
		is_owner: boolean("is_owner").notNull().default(false),
		// Status
		status: text("status").notNull().default("active"), // active, suspended, invited
		// Activity tracking
		last_activity_at: timestamp("last_activity_at"),
		// Metadata
		notes: text("notes"),
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		tenantOrgIdx: index("tenant_user_tenant_org_idx").on(
			table.tenant_organization_id,
		),
		emailIdx: index("tenant_user_email_idx").on(
			table.tenant_organization_id,
			table.email,
		),
	}),
);

// ============================================================================
// Audit Log Tables
// ============================================================================

/**
 * Audit Log - Tracks important changes to tenant data
 * Used for security, compliance, and activity tracking
 */
export const auditLog = pgTable(
	"audit_log",
	{
		id: text("id").primaryKey(),
		// The support staff organization this audit log belongs to
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// The tenant organization affected (if applicable)
		tenant_organization_id: text("tenant_organization_id").references(
			() => tenantOrganization.id,
			{ onDelete: "cascade" },
		),
		// Who performed the action
		performed_by_user_id: text("performed_by_user_id").references(
			() => user.id,
			{ onDelete: "set null" },
		),
		performed_by_name: text("performed_by_name").notNull(), // Denormalized for display
		// What was changed
		entity_type: text("entity_type").notNull(), // tenant_user, ticket, subscription, etc.
		entity_id: text("entity_id").notNull(), // ID of the entity that was changed
		// Action performed
		action: text("action").notNull(), // role_changed, status_changed, created, deleted, etc.
		// Change details
		field_name: text("field_name"), // e.g., 'role', 'status'
		old_value: text("old_value"), // Previous value (JSON if complex)
		new_value: text("new_value"), // New value (JSON if complex)
		// Additional context
		metadata: text("metadata"), // JSON object for additional context
		// When it happened
		created_at: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => ({
		orgIdx: index("audit_log_organization_idx").on(table.organization_id),
		tenantOrgIdx: index("audit_log_tenant_org_idx").on(
			table.tenant_organization_id,
		),
		entityIdx: index("audit_log_entity_idx").on(
			table.entity_type,
			table.entity_id,
		),
		performedByIdx: index("audit_log_performed_by_idx").on(
			table.performed_by_user_id,
		),
		createdAtIdx: index("audit_log_created_at_idx").on(table.created_at),
	}),
);

// ============================================================================
// Support Ticket Tables
// ============================================================================

/**
 * Ticket - Support tickets created by or for tenant users
 * Scoped to a support staff organization
 */
export const ticket = pgTable(
	"ticket",
	{
		id: text("id").primaryKey(),
		// The support staff organization this ticket belongs to
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Ticket number (human-readable, auto-incremented per org)
		ticket_number: integer("ticket_number").notNull(),
		// The tenant user who submitted/is associated with this ticket
		tenant_user_id: text("tenant_user_id").references(() => tenantUser.id, {
			onDelete: "set null",
		}),
		// Ticket details
		title: text("title").notNull(),
		status: text("status").notNull().default("open"), // open, pending, waiting_on_customer, escalated, closed
		priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
		// Assignment
		assigned_to_user_id: text("assigned_to_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		assigned_to_ai: boolean("assigned_to_ai").notNull().default(false),
		// Channel info
		channel: text("channel").notNull().default("web"), // web, email, api
		// SLA tracking
		sla_deadline: timestamp("sla_deadline"),
		first_response_at: timestamp("first_response_at"),
		resolved_at: timestamp("resolved_at"),
		// Metadata
		tags: text("tags"), // JSON array of tags
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		orgIdx: index("ticket_organization_idx").on(table.organization_id),
		statusIdx: index("ticket_status_idx").on(
			table.organization_id,
			table.status,
		),
		priorityIdx: index("ticket_priority_idx").on(
			table.organization_id,
			table.priority,
		),
		assignedIdx: index("ticket_assigned_idx").on(table.assigned_to_user_id),
		tenantUserIdx: index("ticket_tenant_user_idx").on(table.tenant_user_id),
		ticketNumberIdx: index("ticket_number_idx").on(
			table.organization_id,
			table.ticket_number,
		),
	}),
);

/**
 * Ticket Message - Individual messages within a ticket thread
 */
export const ticketMessage = pgTable(
	"ticket_message",
	{
		id: text("id").primaryKey(),
		ticket_id: text("ticket_id")
			.notNull()
			.references(() => ticket.id, { onDelete: "cascade" }),
		// Message type: customer, agent (support staff), ai, system
		message_type: text("message_type").notNull().default("customer"),
		// Author info - can be tenant user, support staff, or AI
		author_tenant_user_id: text("author_tenant_user_id").references(
			() => tenantUser.id,
			{ onDelete: "set null" },
		),
		author_user_id: text("author_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		author_name: text("author_name").notNull(), // Denormalized for display
		// Content
		content: text("content").notNull(),
		// For internal notes (not visible to customer)
		is_internal: boolean("is_internal").notNull().default(false),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		ticketIdx: index("ticket_message_ticket_idx").on(table.ticket_id),
		createdAtIdx: index("ticket_message_created_idx").on(
			table.ticket_id,
			table.created_at,
		),
	}),
);

/**
 * Ticket AI Triage - AI-generated analysis and suggestions for tickets
 */
export const ticketAiTriage = pgTable(
	"ticket_ai_triage",
	{
		id: text("id").primaryKey(),
		ticket_id: text("ticket_id")
			.notNull()
			.references(() => ticket.id, { onDelete: "cascade" })
			.unique(), // One triage per ticket
		// AI Analysis
		category: text("category"), // e.g., "Authentication / SSO", "Billing", "General"
		sentiment: text("sentiment"), // e.g., "Negative (Urgency Detected)", "Neutral", "Positive"
		urgency_score: integer("urgency_score"), // 1-10 score
		// Suggestions
		suggested_action: text("suggested_action"),
		suggested_playbook: text("suggested_playbook"),
		suggested_playbook_link: text("suggested_playbook_link"),
		// AI-generated summary
		summary: text("summary"),
		// Draft response (if AI generated one)
		draft_response: text("draft_response"),
		// Confidence score
		confidence: integer("confidence"), // 0-100
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		ticketIdx: index("ticket_ai_triage_ticket_idx").on(table.ticket_id),
	}),
);

// ============================================================================
// Knowledge Base Tables
// Help articles and playbooks for support staff and AI agents
// ============================================================================

/**
 * Knowledge Article - Help center articles for self-service support
 * Scoped to a support staff organization
 */
export const knowledgeArticle = pgTable(
	"knowledge_article",
	{
		id: text("id").primaryKey(),
		// The support staff organization this article belongs to
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Article content
		title: text("title").notNull(),
		content: text("content"), // Article body/content (markdown or HTML)
		slug: text("slug").notNull(), // URL-friendly identifier
		// Categorization
		category: text("category"), // AUTHENTICATION, BILLING, DEVELOPER, etc.
		tags: text("tags"), // JSON array of tags
		// Status workflow
		status: text("status").notNull().default("draft"), // draft, published, archived
		// Analytics
		views: integer("views").notNull().default(0),
		// Publishing info
		published_at: timestamp("published_at"),
		// Authorship
		created_by_user_id: text("created_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		updated_by_user_id: text("updated_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		orgIdx: index("knowledge_article_organization_idx").on(
			table.organization_id,
		),
		statusIdx: index("knowledge_article_status_idx").on(
			table.organization_id,
			table.status,
		),
		categoryIdx: index("knowledge_article_category_idx").on(
			table.organization_id,
			table.category,
		),
		slugIdx: index("knowledge_article_slug_idx").on(
			table.organization_id,
			table.slug,
		),
	}),
);

/**
 * Playbook - Guided workflows for support agents (manual or automated)
 * Scoped to a support staff organization
 */
export const playbook = pgTable(
	"playbook",
	{
		id: text("id").primaryKey(),
		// The support staff organization this playbook belongs to
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Playbook info
		name: text("name").notNull(),
		description: text("description"), // What the playbook does
		// Type determines how the playbook is used
		type: text("type").notNull().default("manual"), // manual, automated
		// For manual playbooks: step-by-step guide
		steps: text("steps"), // JSON array of step objects: { order, title, description, action? }
		// For automated playbooks: trigger conditions and actions
		triggers: text("triggers"), // JSON array of trigger conditions
		actions: text("actions"), // JSON array of actions to execute
		// Categorization
		category: text("category"),
		tags: text("tags"), // JSON array of tags
		// Status
		status: text("status").notNull().default("draft"), // draft, active, inactive
		// Authorship
		created_by_user_id: text("created_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		updated_by_user_id: text("updated_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		orgIdx: index("playbook_organization_idx").on(table.organization_id),
		typeIdx: index("playbook_type_idx").on(table.organization_id, table.type),
		statusIdx: index("playbook_status_idx").on(
			table.organization_id,
			table.status,
		),
		categoryIdx: index("playbook_category_idx").on(
			table.organization_id,
			table.category,
		),
	}),
);

// ============================================================================
// Sales CRM Tables
// Pipelines, deals, and sales activities
// ============================================================================

/**
 * Pipeline - Sales pipeline definitions
 * Scoped to a tenant organization (customer company)
 */
export const pipeline = pgTable(
	"pipeline",
	{
		id: text("id").primaryKey(),
		// The tenant organization this pipeline belongs to
		tenant_organization_id: text("tenant_organization_id")
			.notNull()
			.references(() => tenantOrganization.id, { onDelete: "cascade" }),
		// Pipeline info
		name: text("name").notNull(), // e.g., "Enterprise Pipeline", "SMB Pipeline"
		description: text("description"),
		// Default pipeline for the org
		is_default: boolean("is_default").notNull().default(false),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		tenantOrgIdx: index("pipeline_tenant_org_idx").on(
			table.tenant_organization_id,
		),
	}),
);

/**
 * Pipeline Stage - Stages within a pipeline
 */
export const pipelineStage = pgTable(
	"pipeline_stage",
	{
		id: text("id").primaryKey(),
		// The pipeline this stage belongs to
		pipeline_id: text("pipeline_id")
			.notNull()
			.references(() => pipeline.id, { onDelete: "cascade" }),
		// Stage info
		name: text("name").notNull(), // e.g., "Lead", "Meeting", "Negotiation"
		order: integer("order").notNull(), // Display order
		color: text("color").notNull().default("gray"), // Color code for UI
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		pipelineIdx: index("pipeline_stage_pipeline_idx").on(table.pipeline_id),
		orderIdx: index("pipeline_stage_order_idx").on(
			table.pipeline_id,
			table.order,
		),
	}),
);

/**
 * Deal - Sales deals/opportunities
 * Scoped to support staff organization but linked to tenant organization (customer)
 */
export const deal = pgTable(
	"deal",
	{
		id: text("id").primaryKey(),
		// The support staff organization managing this deal
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// The customer organization this deal is for
		tenant_organization_id: text("tenant_organization_id")
			.notNull()
			.references(() => tenantOrganization.id, { onDelete: "cascade" }),
		// Pipeline and stage
		pipeline_id: text("pipeline_id")
			.notNull()
			.references(() => pipeline.id, { onDelete: "cascade" }),
		stage_id: text("stage_id")
			.notNull()
			.references(() => pipelineStage.id, { onDelete: "cascade" }),
		// Deal info
		name: text("name").notNull(), // Deal name/description
		value: integer("value").notNull().default(0), // Deal value in cents
		// Assignment
		assigned_to_user_id: text("assigned_to_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		assigned_to_ai: boolean("assigned_to_ai").notNull().default(false),
		// Linked records
		linked_subscription_id: text("linked_subscription_id"),
		linked_trial_id: text("linked_trial_id"),
		// Scoring
		manual_score: integer("manual_score"), // Manual deal score (1-100)
		ai_score: integer("ai_score"), // AI predicted score (1-100)
		// Additional data
		badges: text("badges"), // JSON array of badges (e.g., ["Hot", "Enterprise"])
		custom_fields: text("custom_fields"), // JSON object for custom fields
		next_task: text("next_task"),
		notes: text("notes"),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		orgIdx: index("deal_organization_idx").on(table.organization_id),
		tenantOrgIdx: index("deal_tenant_org_idx").on(table.tenant_organization_id),
		pipelineIdx: index("deal_pipeline_idx").on(table.pipeline_id),
		stageIdx: index("deal_stage_idx").on(table.stage_id),
		assignedIdx: index("deal_assigned_idx").on(table.assigned_to_user_id),
	}),
);

/**
 * Deal Contact - Contacts associated with deals (many-to-many)
 */
export const dealContact = pgTable(
	"deal_contact",
	{
		// The deal
		deal_id: text("deal_id")
			.notNull()
			.references(() => deal.id, { onDelete: "cascade" }),
		// The tenant user (contact)
		tenant_user_id: text("tenant_user_id")
			.notNull()
			.references(() => tenantUser.id, { onDelete: "cascade" }),
		// Role in the deal
		role: text("role").notNull().default("contact"), // decision_maker, influencer, user, contact
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.deal_id, table.tenant_user_id] }),
		dealIdx: index("deal_contact_deal_idx").on(table.deal_id),
		tenantUserIdx: index("deal_contact_tenant_user_idx").on(
			table.tenant_user_id,
		),
	}),
);

/**
 * Deal Activity - Activity timeline for deals
 */
export const dealActivity = pgTable(
	"deal_activity",
	{
		id: text("id").primaryKey(),
		// The deal
		deal_id: text("deal_id")
			.notNull()
			.references(() => deal.id, { onDelete: "cascade" }),
		// Activity info
		activity_type: text("activity_type").notNull(), // stage_change, note_added, email_sent, task_completed, etc.
		description: text("description").notNull(),
		// Actor info
		user_id: text("user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		ai_agent_id: text("ai_agent_id"), // If done by AI agent
		// Additional data
		metadata: text("metadata"), // JSON object for additional data (e.g., old stage, new stage)
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => ({
		dealIdx: index("deal_activity_deal_idx").on(table.deal_id),
		createdAtIdx: index("deal_activity_created_idx").on(
			table.deal_id,
			table.created_at,
		),
	}),
);

// ============================================================================
// Product Catalog Tables
// Plans, pricing, features, add-ons, and coupons for subscription products
// ============================================================================

/**
 * Product (productFamily table) - Top-level product entity
 * Contains multiple pricing plans. Scoped to a support staff organization.
 * Note: Table is named 'product_family' for backwards compatibility but represents a Product.
 */
export const productFamily = pgTable(
	"product_family",
	{
		id: text("id").primaryKey(),
		// The support staff organization this product belongs to
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Product info
		name: text("name").notNull(),
		description: text("description"),
		// Status: active, draft, archived
		status: text("status").notNull().default("draft"),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		orgIdx: index("product_family_organization_idx").on(table.organization_id),
		statusIdx: index("product_family_status_idx").on(
			table.organization_id,
			table.status,
		),
	}),
);

/**
 * Product Plan - Main product plans/tiers
 * Scoped to a support staff organization
 */
export const productPlan = pgTable(
	"product_plan",
	{
		id: text("id").primaryKey(),
		// The support staff organization this plan belongs to
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Optional product family
		product_family_id: text("product_family_id").references(
			() => productFamily.id,
			{ onDelete: "set null" },
		),
		// Plan info
		name: text("name").notNull(),
		description: text("description"),
		// Status: active, draft, archived
		status: text("status").notNull().default("draft"),
		// Pricing model: flat, seat, usage, hybrid
		pricing_model: text("pricing_model").notNull().default("flat"),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		orgIdx: index("product_plan_organization_idx").on(table.organization_id),
		familyIdx: index("product_plan_family_idx").on(table.product_family_id),
		statusIdx: index("product_plan_status_idx").on(
			table.organization_id,
			table.status,
		),
	}),
);

/**
 * Product Pricing - Flexible pricing structure for plans
 * Supports base pricing, regional pricing, seat-based, and usage-based
 */
export const productPricing = pgTable(
	"product_pricing",
	{
		id: text("id").primaryKey(),
		// The plan this pricing belongs to
		product_plan_id: text("product_plan_id")
			.notNull()
			.references(() => productPlan.id, { onDelete: "cascade" }),
		// Pricing type: base, regional, seat, usage
		pricing_type: text("pricing_type").notNull().default("base"),
		// Region code (for regional pricing, e.g., "US", "GB", "DE")
		region: text("region"),
		// Currency code (e.g., "USD", "EUR", "GBP")
		currency: text("currency").notNull().default("USD"),
		// Amount in cents (for base/regional/flat pricing)
		amount: integer("amount").notNull().default(0),
		// Billing interval: monthly, yearly (null for usage-based)
		interval: text("interval"), // monthly, yearly
		// Per-seat amount (for seat-based pricing, in cents)
		per_seat_amount: integer("per_seat_amount"),
		// Usage meter reference (for usage-based pricing)
		usage_meter_id: text("usage_meter_id"),
		// Usage tier pricing (JSON for tiered usage pricing)
		usage_tiers: text("usage_tiers"), // JSON: [{ upTo: 1000, unitPrice: 10 }, { upTo: null, unitPrice: 5 }]
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		planIdx: index("product_pricing_plan_idx").on(table.product_plan_id),
		typeIdx: index("product_pricing_type_idx").on(
			table.product_plan_id,
			table.pricing_type,
		),
		regionIdx: index("product_pricing_region_idx").on(
			table.product_plan_id,
			table.region,
		),
	}),
);

/**
 * Product Feature - Features included in a plan
 */
export const productFeature = pgTable(
	"product_feature",
	{
		id: text("id").primaryKey(),
		// The plan this feature belongs to
		product_plan_id: text("product_plan_id")
			.notNull()
			.references(() => productPlan.id, { onDelete: "cascade" }),
		// Feature info
		name: text("name").notNull(),
		description: text("description"),
		// Display order
		order: integer("order").notNull().default(0),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		planIdx: index("product_feature_plan_idx").on(table.product_plan_id),
		orderIdx: index("product_feature_order_idx").on(
			table.product_plan_id,
			table.order,
		),
	}),
);

/**
 * Product Add-On - Add-ons available for plans
 * Scoped to a support staff organization
 */
export const productAddOn = pgTable(
	"product_add_on",
	{
		id: text("id").primaryKey(),
		// The support staff organization this add-on belongs to
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Add-on info
		name: text("name").notNull(),
		description: text("description"),
		// Pricing model: flat, seat, usage
		pricing_model: text("pricing_model").notNull().default("flat"),
		// Status: active, draft, archived
		status: text("status").notNull().default("draft"),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		orgIdx: index("product_add_on_organization_idx").on(table.organization_id),
		statusIdx: index("product_add_on_status_idx").on(
			table.organization_id,
			table.status,
		),
	}),
);

/**
 * Product Add-On Pricing - Pricing for add-ons
 * Similar structure to productPricing
 */
export const productAddOnPricing = pgTable(
	"product_add_on_pricing",
	{
		id: text("id").primaryKey(),
		// The add-on this pricing belongs to
		product_add_on_id: text("product_add_on_id")
			.notNull()
			.references(() => productAddOn.id, { onDelete: "cascade" }),
		// Pricing type: base, regional, seat, usage
		pricing_type: text("pricing_type").notNull().default("base"),
		// Region code (for regional pricing)
		region: text("region"),
		// Currency code
		currency: text("currency").notNull().default("USD"),
		// Amount in cents
		amount: integer("amount").notNull().default(0),
		// Billing interval
		interval: text("interval"), // monthly, yearly
		// Per-seat amount (for seat-based pricing)
		per_seat_amount: integer("per_seat_amount"),
		// Usage meter reference
		usage_meter_id: text("usage_meter_id"),
		// Usage tier pricing (JSON)
		usage_tiers: text("usage_tiers"),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		addOnIdx: index("product_add_on_pricing_add_on_idx").on(
			table.product_add_on_id,
		),
		typeIdx: index("product_add_on_pricing_type_idx").on(
			table.product_add_on_id,
			table.pricing_type,
		),
	}),
);

/**
 * Coupon - Discounts and promotional codes
 * Scoped to a support staff organization
 */
export const coupon = pgTable(
	"coupon",
	{
		id: text("id").primaryKey(),
		// The support staff organization this coupon belongs to
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Coupon code
		code: text("code").notNull(),
		// Discount type: percentage, fixed_amount, free_months, trial_extension
		discount_type: text("discount_type").notNull(),
		// Discount value (percentage 0-100, or cents for fixed_amount, or months for free_months/trial_extension)
		discount_value: integer("discount_value").notNull(),
		// Applicable plan IDs (JSON array, null means all plans)
		applicable_plan_ids: text("applicable_plan_ids"), // JSON array of plan IDs
		// Maximum redemptions (null for unlimited)
		max_redemptions: integer("max_redemptions"),
		// Current redemption count
		redemption_count: integer("redemption_count").notNull().default(0),
		// Status: active, expired, disabled
		status: text("status").notNull().default("active"),
		// Expiration date
		expires_at: timestamp("expires_at"),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		orgIdx: index("coupon_organization_idx").on(table.organization_id),
		codeIdx: index("coupon_code_idx").on(table.organization_id, table.code),
		statusIdx: index("coupon_status_idx").on(
			table.organization_id,
			table.status,
		),
	}),
);

/**
 * Product Feature Flag - Feature flags per plan
 * Used to enable/disable specific features for a plan
 */
export const productFeatureFlag = pgTable(
	"product_feature_flag",
	{
		id: text("id").primaryKey(),
		// The plan this feature flag belongs to
		product_plan_id: text("product_plan_id")
			.notNull()
			.references(() => productPlan.id, { onDelete: "cascade" }),
		// Flag key (e.g., "api_access", "advanced_analytics", "custom_branding")
		flag_key: text("flag_key").notNull(),
		// Flag value (JSON for flexibility - boolean, number, or object)
		flag_value: text("flag_value").notNull().default("true"), // JSON value
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		planIdx: index("product_feature_flag_plan_idx").on(table.product_plan_id),
		keyIdx: index("product_feature_flag_key_idx").on(
			table.product_plan_id,
			table.flag_key,
		),
	}),
);

/**
 * Product Plan Add-On - Junction table linking product plans to available add-ons
 * Allows configuring which add-ons are available for each plan
 */
export const productPlanAddOn = pgTable(
	"product_plan_add_on",
	{
		id: text("id").primaryKey(),
		// The plan this add-on is available for
		product_plan_id: text("product_plan_id")
			.notNull()
			.references(() => productPlan.id, { onDelete: "cascade" }),
		// The add-on available for this plan
		product_add_on_id: text("product_add_on_id")
			.notNull()
			.references(() => productAddOn.id, { onDelete: "cascade" }),
		// Billing type: 'billed_with_main' (recurring with subscription) or 'consumable' (usage-based)
		billing_type: text("billing_type").notNull().default("billed_with_main"),
		// Display order for UI
		display_order: integer("display_order").notNull().default(0),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		planIdx: index("product_plan_add_on_plan_idx").on(table.product_plan_id),
		addOnIdx: index("product_plan_add_on_add_on_idx").on(
			table.product_add_on_id,
		),
		// Unique constraint: one add-on can only be added once per plan
		uniquePlanAddOn: unique().on(
			table.product_plan_id,
			table.product_add_on_id,
		),
	}),
);

// ============================================================================
// Subscription Management Tables
// Customer subscriptions, usage tracking, and subscription activities
// ============================================================================

/**
 * Usage Meter - Definition of usage-based billing meters
 * Scoped to a support staff organization
 */
export const usageMeter = pgTable(
	"usage_meter",
	{
		id: text("id").primaryKey(),
		// The support staff organization this meter belongs to
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Meter info
		name: text("name").notNull(), // e.g., "API Calls", "Storage GB"
		unit: text("unit").notNull(), // e.g., "calls", "GB", "messages"
		description: text("description"),
		// Status
		status: text("status").notNull().default("active"), // active, archived
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		orgIdx: index("usage_meter_organization_idx").on(table.organization_id),
		statusIdx: index("usage_meter_status_idx").on(
			table.organization_id,
			table.status,
		),
	}),
);

/**
 * Subscription - Customer subscriptions to product plans
 * Scoped to support staff organization but linked to tenant organization (customer)
 */
export const subscription = pgTable(
	"subscription",
	{
		id: text("id").primaryKey(),
		// The support staff organization managing this subscription
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// The customer organization this subscription is for
		tenant_organization_id: text("tenant_organization_id")
			.notNull()
			.references(() => tenantOrganization.id, { onDelete: "cascade" }),
		// Human-readable subscription ID (e.g., "SUB-992")
		subscription_number: text("subscription_number").notNull(),
		// The plan this subscription is for
		product_plan_id: text("product_plan_id")
			.notNull()
			.references(() => productPlan.id, { onDelete: "restrict" }),
		// Subscription status
		status: text("status").notNull().default("draft"), // draft, active, trial, past_due, canceled, paused
		// Payment collection method
		// 'automatic' = self-service, auto-charge via Stripe/payment processor
		// 'send_invoice' = sales-led, manual invoice sent to customer
		collection_method: text("collection_method")
			.notNull()
			.default("send_invoice"), // automatic, send_invoice
		// Billing info
		billing_cycle: text("billing_cycle").notNull().default("monthly"), // monthly, yearly
		current_period_start: timestamp("current_period_start").notNull(),
		current_period_end: timestamp("current_period_end").notNull(), // renewsAt
		// Revenue
		mrr: integer("mrr").notNull().default(0), // Monthly recurring revenue in cents
		// Seat-based pricing
		seats: integer("seats").notNull().default(1),
		// Payment method reference (external)
		payment_method_id: text("payment_method_id"),
		// Linked deal (if created from a deal)
		linked_deal_id: text("linked_deal_id").references(() => deal.id, {
			onDelete: "set null",
		}),
		// Applied coupon/discount
		coupon_id: text("coupon_id").references(() => coupon.id, {
			onDelete: "set null",
		}),
		// Internal notes
		notes: text("notes"),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		orgIdx: index("subscription_organization_idx").on(table.organization_id),
		tenantOrgIdx: index("subscription_tenant_org_idx").on(
			table.tenant_organization_id,
		),
		subscriptionNumberIdx: index("subscription_number_idx").on(
			table.organization_id,
			table.subscription_number,
		),
		statusIdx: index("subscription_status_idx").on(
			table.organization_id,
			table.status,
		),
		planIdx: index("subscription_plan_idx").on(table.product_plan_id),
	}),
);

/**
 * Subscription Add-On - Add-ons attached to a subscription
 */
export const subscriptionAddOn = pgTable(
	"subscription_add_on",
	{
		// The subscription
		subscription_id: text("subscription_id")
			.notNull()
			.references(() => subscription.id, { onDelete: "cascade" }),
		// The add-on
		product_add_on_id: text("product_add_on_id")
			.notNull()
			.references(() => productAddOn.id, { onDelete: "cascade" }),
		// Quantity (for seat-based add-ons)
		quantity: integer("quantity").notNull().default(1),
		// Override amount (if custom pricing, in cents)
		amount: integer("amount"),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => ({
		pk: primaryKey({
			columns: [table.subscription_id, table.product_add_on_id],
		}),
		subscriptionIdx: index("subscription_add_on_subscription_idx").on(
			table.subscription_id,
		),
		addOnIdx: index("subscription_add_on_add_on_idx").on(
			table.product_add_on_id,
		),
	}),
);

/**
 * Usage History - Tracks usage for usage-based billing
 */
export const usageHistory = pgTable(
	"usage_history",
	{
		id: text("id").primaryKey(),
		// The subscription
		subscription_id: text("subscription_id")
			.notNull()
			.references(() => subscription.id, { onDelete: "cascade" }),
		// The usage meter
		usage_meter_id: text("usage_meter_id")
			.notNull()
			.references(() => usageMeter.id, { onDelete: "cascade" }),
		// Usage period
		period_start: timestamp("period_start").notNull(),
		period_end: timestamp("period_end").notNull(),
		// Usage quantity
		quantity: integer("quantity").notNull().default(0),
		// When usage was recorded
		recorded_at: timestamp("recorded_at").notNull().defaultNow(),
		// Additional usage data (JSON)
		metadata: text("metadata"),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => ({
		subscriptionIdx: index("usage_history_subscription_idx").on(
			table.subscription_id,
		),
		meterIdx: index("usage_history_meter_idx").on(table.usage_meter_id),
		periodIdx: index("usage_history_period_idx").on(
			table.subscription_id,
			table.period_start,
		),
	}),
);

/**
 * Subscription Activity - Activity timeline for subscriptions
 */
export const subscriptionActivity = pgTable(
	"subscription_activity",
	{
		id: text("id").primaryKey(),
		// The subscription
		subscription_id: text("subscription_id")
			.notNull()
			.references(() => subscription.id, { onDelete: "cascade" }),
		// Activity type
		activity_type: text("activity_type").notNull(), // created, plan_changed, paused, resumed, canceled, seat_added, seat_removed, addon_added, addon_removed, coupon_applied
		// Human-readable description
		description: text("description").notNull(),
		// Actor info
		user_id: text("user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		ai_agent_id: text("ai_agent_id"), // If done by AI agent
		// Additional data (JSON - old plan, new plan, etc.)
		metadata: text("metadata"),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => ({
		subscriptionIdx: index("subscription_activity_subscription_idx").on(
			table.subscription_id,
		),
		createdAtIdx: index("subscription_activity_created_idx").on(
			table.subscription_id,
			table.created_at,
		),
	}),
);

// ============================================================================
// Invoice Tables
// Invoices for subscription billing
// ============================================================================

/**
 * Invoice - Invoices for subscription payments
 * Subscriptions start as draft and become active when invoice is paid
 */
export const invoice = pgTable(
	"invoice",
	{
		id: text("id").primaryKey(),
		// The support staff organization this invoice belongs to
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// The subscription this invoice is for (optional - null for standalone invoices)
		subscription_id: text("subscription_id").references(() => subscription.id, {
			onDelete: "cascade",
		}),
		// The customer organization
		tenant_organization_id: text("tenant_organization_id")
			.notNull()
			.references(() => tenantOrganization.id, { onDelete: "cascade" }),
		// Human-readable invoice number (e.g., "INV-ACME-1001")
		invoice_number: text("invoice_number").notNull(),
		// Invoice status: draft, final, paid, overdue, canceled
		status: text("status").notNull().default("draft"),
		// Billing amounts (in cents)
		subtotal: integer("subtotal").notNull().default(0),
		tax: integer("tax").notNull().default(0),
		total: integer("total").notNull().default(0),
		// Currency
		currency: text("currency").notNull().default("USD"),
		// Invoice dates
		issue_date: timestamp("issue_date").notNull(),
		due_date: timestamp("due_date").notNull(),
		paid_at: timestamp("paid_at"),
		// Line items (JSON array)
		line_items: text("line_items").notNull(), // JSON: [{ description, quantity, unitPrice, total }]
		// PDF storage path
		pdf_path: text("pdf_path"),
		// Billing details (snapshot at time of invoice)
		billing_name: text("billing_name"),
		billing_email: text("billing_email"),
		billing_address: text("billing_address"),
		// Internal notes
		notes: text("notes"),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		orgIdx: index("invoice_organization_idx").on(table.organization_id),
		subscriptionIdx: index("invoice_subscription_idx").on(
			table.subscription_id,
		),
		tenantOrgIdx: index("invoice_tenant_org_idx").on(
			table.tenant_organization_id,
		),
		invoiceNumberIdx: index("invoice_number_idx").on(
			table.organization_id,
			table.invoice_number,
		),
		statusIdx: index("invoice_status_idx").on(
			table.organization_id,
			table.status,
		),
	}),
);

/**
 * Quote - Pricing proposals sent to customers
 * Can be linked to a deal or standalone, and optionally linked to product plans
 * Quotes can be converted to invoices when accepted
 */
export const quote = pgTable(
	"quote",
	{
		id: text("id").primaryKey(),
		// The support staff organization this quote belongs to
		organization_id: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// The customer organization
		tenant_organization_id: text("tenant_organization_id")
			.notNull()
			.references(() => tenantOrganization.id, { onDelete: "cascade" }),
		// Optional link to deal
		deal_id: text("deal_id").references(() => deal.id, {
			onDelete: "set null",
		}),
		// Optional link to product plan
		product_plan_id: text("product_plan_id").references(() => productPlan.id, {
			onDelete: "set null",
		}),
		// Human-readable quote number (e.g., "QUO-ACME-1001")
		quote_number: text("quote_number").notNull(),
		// Quote status: draft, sent, accepted, rejected, expired, converted
		status: text("status").notNull().default("draft"),
		// Quote version (for tracking revisions)
		version: integer("version").notNull().default(1),
		// Parent quote ID (if this is a revision)
		parent_quote_id: text("parent_quote_id").references(() => quote.id, {
			onDelete: "set null",
		}),
		// Pricing amounts (in cents)
		subtotal: integer("subtotal").notNull().default(0),
		tax: integer("tax").notNull().default(0),
		total: integer("total").notNull().default(0),
		// Currency
		currency: text("currency").notNull().default("USD"),
		// Quote validity expiration date
		valid_until: timestamp("valid_until"),
		// Line items (JSON array)
		line_items: text("line_items").notNull(), // JSON: [{ description, quantity, unitPrice, total }]
		// Converted to invoice (when accepted)
		converted_to_invoice_id: text("converted_to_invoice_id").references(
			() => invoice.id,
			{ onDelete: "set null" },
		),
		// PDF storage path
		pdf_path: text("pdf_path"),
		// Billing details (snapshot at time of quote)
		billing_name: text("billing_name"),
		billing_email: text("billing_email"),
		billing_address: text("billing_address"),
		// Notes
		notes: text("notes"),
		// Metadata
		created_at: timestamp("created_at").notNull().defaultNow(),
		updated_at: timestamp("updated_at").notNull().defaultNow(),
		sent_at: timestamp("sent_at"), // When quote was sent to customer
		accepted_at: timestamp("accepted_at"), // When customer accepted
		rejected_at: timestamp("rejected_at"), // When customer rejected
	},
	(table) => ({
		orgIdx: index("quote_organization_idx").on(table.organization_id),
		tenantOrgIdx: index("quote_tenant_org_idx").on(
			table.tenant_organization_id,
		),
		dealIdx: index("quote_deal_idx").on(table.deal_id),
		productPlanIdx: index("quote_product_plan_idx").on(table.product_plan_id),
		quoteNumberIdx: index("quote_number_idx").on(
			table.organization_id,
			table.quote_number,
		),
		statusIdx: index("quote_status_idx").on(
			table.organization_id,
			table.status,
		),
		parentQuoteIdx: index("quote_parent_idx").on(table.parent_quote_id),
		convertedInvoiceIdx: index("quote_converted_invoice_idx").on(
			table.converted_to_invoice_id,
		),
	}),
);
