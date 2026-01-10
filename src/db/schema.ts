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
		organizationId: text("organization_id").references(() => organization.id, {
			onDelete: "cascade",
		}),
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("todos_organization_idx").on(table.organizationId),
	}),
);

// Better Auth tables
export const user = pgTable(
	"user",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		email: text("email").notNull().unique(),
		emailVerified: boolean("email_verified").notNull().default(false),
		image: text("image"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		emailIdx: index("user_email_idx").on(table.email),
	}),
);

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at"),
	updatedAt: timestamp("updated_at"),
});

// Organization plugin tables
export const organization = pgTable("organization", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").unique(),
	logo: text("logo"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const member = pgTable(
	"member",
	{
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role").notNull(),
		createdAt: timestamp("created_at").notNull(),
		updatedAt: timestamp("updated_at").notNull(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.organizationId, table.userId] }),
	}),
);

export const invitation = pgTable("invitation", {
	id: text("id").primaryKey(),
	email: text("email").notNull(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organization.id, { onDelete: "cascade" }),
	role: text("role").notNull(),
	status: text("status").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

/**
 * Tenant Organization - Represents a customer company being managed
 * This is distinct from the "organization" which represents the support staff company
 *
 * Scoped to a support staff organization (the logged-in user's org)
 */
export const tenantOrganization = pgTable(
	"tenant_organization",
	{
		id: text("id").primaryKey(),
		// Which support staff organization owns this tenant
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Tenant organization details
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		logo: text("logo"),
		website: text("website"),
		industry: text("industry"),
		// Subscription details
		subscriptionPlan: text("subscription_plan"),
		subscriptionStatus: text("subscription_status"),
		// Billing information
		billingEmail: text("billing_email"),
		billingAddress: text("billing_address"),
		// Management metadata
		tags: text("tags").array(),
		assignedToUserId: text("assigned_to_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		// Customer importance/priority
		importance: text("importance"),
		// Customer-specific discount information
		customerDiscountType: text("customer_discount_type"),
		customerDiscountValue: integer("customer_discount_value"),
		customerDiscountIsRecurring: boolean("customer_discount_is_recurring")
			.notNull()
			.default(false),
		customerDiscountNotes: text("customer_discount_notes"),
		// Additional metadata
		notes: text("notes"),
		metadata: text("metadata"),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("tenant_organization_organization_idx").on(
			table.organizationId,
		),
		slugIdx: unique("tenant_organization_slug_idx").on(table.slug),
		assignedIdx: index("tenant_organization_assigned_idx").on(
			table.assignedToUserId,
		),
		importanceIdx: index("tenant_organization_importance_idx").on(
			table.importance,
		),
	}),
);

/**
 * Tenant User - Users within a tenant organization (customers)
 * These users do NOT have login accounts - they are customers being supported
 */
export const tenantUser = pgTable(
	"tenant_user",
	{
		id: text("id").primaryKey(),
		// Which tenant organization this user belongs to
		tenantOrganizationId: text("tenant_organization_id")
			.notNull()
			.references(() => tenantOrganization.id, { onDelete: "cascade" }),
		// User details
		name: text("name").notNull(),
		email: text("email").notNull(),
		phone: text("phone"),
		avatarUrl: text("avatar_url"),
		title: text("title"),
		// Role within their organization (not our system role)
		role: text("role"),
		isOwner: boolean("is_owner").notNull().default(false),
		// Status
		status: text("status").notNull().default("active"),
		// Activity tracking
		lastActivityAt: timestamp("last_activity_at"),
		// Additional metadata
		notes: text("notes"),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		tenantOrgIdx: index("tenant_user_tenant_organization_idx").on(
			table.tenantOrganizationId,
		),
		emailIdx: unique("tenant_user_email_tenant_org_idx").on(
			table.email,
			table.tenantOrganizationId,
		),
	}),
);

/**
 * Audit Log - Track all changes for compliance and debugging
 * Used for security, compliance, and activity tracking
 */
export const auditLog = pgTable(
	"audit_log",
	{
		id: text("id").primaryKey(),
		// Which support staff organization this audit log belongs to
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Which tenant organization was affected (if applicable)
		tenantOrganizationId: text("tenant_organization_id").references(
			() => tenantOrganization.id,
			{ onDelete: "cascade" },
		),
		// Who performed the action
		performedByUserId: text("performed_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		performedByName: text("performed_by_name"),
		// What entity was changed
		entityType: text("entity_type").notNull(),
		entityId: text("entity_id").notNull(),
		// What action was performed
		action: text("action").notNull(),
		// What fields were changed
		fieldName: text("field_name"),
		oldValue: text("old_value"),
		newValue: text("new_value"),
		// Additional context
		metadata: text("metadata"),
		// When
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		orgIdx: index("audit_log_organization_idx").on(table.organizationId),
		tenantOrgIdx: index("audit_log_tenant_organization_idx").on(
			table.tenantOrganizationId,
		),
		entityIdx: index("audit_log_entity_idx").on(
			table.entityType,
			table.entityId,
		),
		performedByIdx: index("audit_log_performed_by_idx").on(
			table.performedByUserId,
		),
		createdAtIdx: index("audit_log_created_at_idx").on(table.createdAt),
	}),
);

/**
 * Ticket - Support tickets from tenant users
 *
 * Scoped to a support staff organization
 */
export const ticket = pgTable(
	"ticket",
	{
		id: text("id").primaryKey(),
		// Which support staff organization owns this ticket
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Unique ticket identifier
		ticketNumber: text("ticket_number").notNull(),
		// Who submitted the ticket
		tenantUserId: text("tenant_user_id")
			.references(() => tenantUser.id, { onDelete: "set null" })
			.notNull(),
		// Ticket details
		title: text("title").notNull(),
		status: text("status").notNull().default("open"),
		priority: text("priority").notNull().default("medium"),
		// Assignment
		assignedToUserId: text("assigned_to_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		assignedToAI: boolean("assigned_to_ai").notNull().default(false),
		// Channel the ticket came in on
		channel: text("channel").notNull().default("email"),
		// SLA tracking
		slaDeadline: timestamp("sla_deadline"),
		firstResponseAt: timestamp("first_response_at"),
		resolvedAt: timestamp("resolved_at"),
		// Categorization
		tags: text("tags").array(),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("ticket_organization_idx").on(table.organizationId),
		statusIdx: index("ticket_status_idx").on(
			table.status,
			table.organizationId,
		),
		priorityIdx: index("ticket_priority_idx").on(
			table.priority,
			table.organizationId,
		),
		assignedIdx: index("ticket_assigned_idx").on(table.assignedToUserId),
		tenantUserIdx: index("ticket_tenant_user_idx").on(table.tenantUserId),
		ticketNumberIdx: unique("ticket_number_idx").on(
			table.ticketNumber,
			table.organizationId,
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
		ticketId: text("ticket_id")
			.notNull()
			.references(() => ticket.id, { onDelete: "cascade" }),
		// Message type: "customer", "agent", "system", "ai"
		messageType: text("message_type").notNull(),
		// Who sent the message
		authorTenantUserId: text("author_tenant_user_id").references(
			() => tenantUser.id,
			{ onDelete: "set null" },
		),
		authorUserId: text("author_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		authorName: text("author_name").notNull(),
		// Message content
		content: text("content").notNull(),
		// Internal notes (not visible to customer)
		isInternal: boolean("is_internal").notNull().default(false),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		ticketIdx: index("ticket_message_ticket_idx").on(table.ticketId),
		createdAtIdx: index("ticket_message_created_at_idx").on(
			table.ticketId,
			table.createdAt,
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
		ticketId: text("ticket_id")
			.notNull()
			.references(() => ticket.id, { onDelete: "cascade" }),
		// AI analysis
		category: text("category"),
		sentiment: text("sentiment"),
		urgencyScore: integer("urgency_score"),
		// AI suggestions
		suggestedAction: text("suggested_action"),
		suggestedPlaybook: text("suggested_playbook"),
		suggestedPlaybookLink: text("suggested_playbook_link"),
		// AI summary and draft response
		summary: text("summary"),
		// Draft response for agent to review/edit
		draftResponse: text("draft_response"),
		// Confidence score (0-100)
		confidence: integer("confidence"),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		ticketIdx: index("ticket_ai_triage_ticket_idx").on(table.ticketId),
	}),
);

/**
 * Knowledge Article - Documentation and help articles
 *
 * Scoped to a support staff organization
 */
export const knowledgeArticle = pgTable(
	"knowledge_article",
	{
		id: text("id").primaryKey(),
		// Which support staff organization owns this article
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Article content
		title: text("title").notNull(),
		content: text("content").notNull(),
		slug: text("slug").notNull(),
		// Categorization
		category: text("category"),
		tags: text("tags").array(),
		// Status workflow
		status: text("status").notNull().default("draft"),
		// Analytics
		views: integer("views").notNull().default(0),
		// Publishing
		publishedAt: timestamp("published_at"),
		// Authorship
		createdByUserId: text("created_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		updatedByUserId: text("updated_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("knowledge_article_organization_idx").on(
			table.organizationId,
		),
		statusIdx: index("knowledge_article_status_idx").on(
			table.status,
			table.organizationId,
		),
		categoryIdx: index("knowledge_article_category_idx").on(
			table.category,
			table.organizationId,
		),
		slugIdx: unique("knowledge_article_slug_idx").on(
			table.slug,
			table.organizationId,
		),
	}),
);

/**
 * Playbook - Standardized processes and automation workflows
 *
 * Scoped to a support staff organization
 */
export const playbook = pgTable(
	"playbook",
	{
		id: text("id").primaryKey(),
		// Which support staff organization owns this playbook
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Playbook details
		name: text("name").notNull(),
		description: text("description"),
		// Type: "ticket_workflow", "onboarding", "escalation", etc.
		type: text("type").notNull(),
		// Steps in the playbook (JSON array)
		steps: text("steps").notNull(),
		// Triggers (JSON array of conditions)
		triggers: text("triggers"),
		actions: text("actions"),
		// Categorization
		category: text("category"),
		tags: text("tags").array(),
		// Status workflow
		status: text("status").notNull().default("draft"),
		// Authorship
		createdByUserId: text("created_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		updatedByUserId: text("updated_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("playbook_organization_idx").on(table.organizationId),
		typeIdx: index("playbook_type_idx").on(table.type),
		statusIdx: index("playbook_status_idx").on(
			table.status,
			table.organizationId,
		),
		categoryIdx: index("playbook_category_idx").on(
			table.category,
			table.organizationId,
		),
	}),
);

/**
 * Pipeline - Sales pipeline for deals
 *
 * Scoped to a tenant organization (customer company)
 */
export const pipeline = pgTable(
	"pipeline",
	{
		id: text("id").primaryKey(),
		// Which tenant organization owns this pipeline
		tenantOrganizationId: text("tenant_organization_id")
			.notNull()
			.references(() => tenantOrganization.id, { onDelete: "cascade" }),
		// Pipeline details
		name: text("name").notNull(),
		description: text("description"),
		// Whether this is the default pipeline for the tenant organization
		isDefault: boolean("is_default").notNull().default(false),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		tenantOrgIdx: index("pipeline_tenant_organization_idx").on(
			table.tenantOrganizationId,
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
		// Which pipeline this stage belongs to
		pipelineId: text("pipeline_id")
			.notNull()
			.references(() => pipeline.id, { onDelete: "cascade" }),
		// Stage details
		name: text("name").notNull(),
		order: integer("order").notNull(),
		color: text("color"),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		pipelineIdx: index("pipeline_stage_pipeline_idx").on(table.pipelineId),
		orderIdx: index("pipeline_stage_order_idx").on(
			table.pipelineId,
			table.order,
		),
	}),
);

/**
 * Deal - Sales opportunities
 *
 * Scoped to support staff organization but linked to tenant organization (customer)
 */
export const deal = pgTable(
	"deal",
	{
		id: text("id").primaryKey(),
		// Which support staff organization owns this deal
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Which tenant organization this deal is for
		tenantOrganizationId: text("tenant_organization_id")
			.notNull()
			.references(() => tenantOrganization.id, { onDelete: "cascade" }),
		// Pipeline and stage
		pipelineId: text("pipeline_id")
			.notNull()
			.references(() => pipeline.id, { onDelete: "cascade" }),
		stageId: text("stage_id")
			.notNull()
			.references(() => pipelineStage.id, { onDelete: "cascade" }),
		// Deal details
		name: text("name").notNull(),
		value: integer("value"),
		// Assignment
		assignedToUserId: text("assigned_to_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		assignedToAI: boolean("assigned_to_ai").notNull().default(false),
		// Linking to subscriptions and trials
		linkedSubscriptionId: text("linked_subscription_id"),
		linkedTrialId: text("linked_trial_id"),
		// Scoring
		manualScore: integer("manual_score"),
		aiScore: integer("ai_score"),
		// Badges for quick visual identification
		badges: text("badges").array(),
		customFields: text("custom_fields"),
		nextTask: text("next_task"),
		notes: text("notes"),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("deal_organization_idx").on(table.organizationId),
		tenantOrgIdx: index("deal_tenant_organization_idx").on(
			table.tenantOrganizationId,
		),
		pipelineIdx: index("deal_pipeline_idx").on(table.pipelineId),
		stageIdx: index("deal_stage_idx").on(table.stageId),
		assignedIdx: index("deal_assigned_idx").on(table.assignedToUserId),
	}),
);

/**
 * Deal Contact - Contacts associated with deals (many-to-many)
 */
export const dealContact = pgTable(
	"deal_contact",
	{
		// Which deal
		dealId: text("deal_id")
			.notNull()
			.references(() => deal.id, { onDelete: "cascade" }),
		// Which tenant user
		tenantUserId: text("tenant_user_id")
			.notNull()
			.references(() => tenantUser.id, { onDelete: "cascade" }),
		// Role: "primary", "secondary", "decision_maker", "influencer", etc.
		role: text("role").notNull(),
		// Timestamp
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.dealId, table.tenantUserId] }),
		dealIdx: index("deal_contact_deal_idx").on(table.dealId),
		tenantUserIdx: index("deal_contact_tenant_user_idx").on(table.tenantUserId),
	}),
);

/**
 * Deal Activity - Activity log for deals
 */
export const dealActivity = pgTable(
	"deal_activity",
	{
		id: text("id").primaryKey(),
		// Which deal this activity is for
		dealId: text("deal_id")
			.notNull()
			.references(() => deal.id, { onDelete: "cascade" }),
		// Activity details
		activityType: text("activity_type").notNull(),
		description: text("description").notNull(),
		// Who performed the activity
		userId: text("user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		aiAgentId: text("ai_agent_id"),
		// Additional metadata
		metadata: text("metadata"),
		// Timestamp
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => ({
		dealIdx: index("deal_activity_deal_idx").on(table.dealId),
		createdAtIdx: index("deal_activity_created_at_idx").on(
			table.dealId,
			table.createdAt,
		),
	}),
);

/**
 * Product Family (Product) - Top-level product grouping
 *
 * Scoped to a support staff organization (tenant)
 */
export const productFamily = pgTable(
	"product_family",
	{
		id: text("id").primaryKey(),
		// Which support staff organization owns this product family
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Product family details
		name: text("name").notNull(),
		description: text("description"),
		// Status workflow
		status: text("status").notNull().default("draft"),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("product_family_organization_idx").on(table.organizationId),
		statusIdx: index("product_family_status_idx").on(
			table.status,
			table.organizationId,
		),
	}),
);

/**
 * Product Plan - Specific pricing plan/tier for a product
 *
 * Scoped to a support staff organization (tenant)
 */
export const productPlan = pgTable(
	"product_plan",
	{
		id: text("id").primaryKey(),
		// Which support staff organization owns this product plan
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Optional product family grouping
		productFamilyId: text("product_family_id").references(
			() => productFamily.id,
			{ onDelete: "set null" },
		),
		// Plan details
		name: text("name").notNull(),
		description: text("description"),
		// Status workflow
		status: text("status").notNull().default("draft"),
		// Pricing model: "flat", "seat", "usage", "hybrid"
		pricingModel: text("pricing_model").notNull().default("flat"),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("product_plan_organization_idx").on(table.organizationId),
		familyIdx: index("product_plan_family_idx").on(table.productFamilyId),
		statusIdx: index("product_plan_status_idx").on(
			table.status,
			table.organizationId,
		),
	}),
);

/**
 * Product Pricing - Pricing details for a product plan
 *
 * Multiple pricing records can exist per plan (e.g., monthly vs yearly, regional pricing)
 */
export const productPricing = pgTable(
	"product_pricing",
	{
		id: text("id").primaryKey(),
		// Which product plan this pricing is for
		productPlanId: text("product_plan_id")
			.notNull()
			.references(() => productPlan.id, { onDelete: "cascade" }),
		// Pricing type: "base", "overage", "tier"
		pricingType: text("pricing_type").notNull().default("base"),
		// Regional pricing support
		region: text("region"),
		// Price details
		currency: text("currency").notNull().default("USD"),
		// Amount in cents
		amount: integer("amount").notNull(),
		// Billing interval: "month", "year", "one_time"
		interval: text("interval").notNull().default("month"),
		// Seat-based pricing
		perSeatAmount: integer("per_seat_amount"),
		// Usage-based pricing
		usageMeterId: text("usage_meter_id"),
		usageTiers: text("usage_tiers"),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		planIdx: index("product_pricing_plan_idx").on(table.productPlanId),
		typeIdx: index("product_pricing_type_idx").on(
			table.pricingType,
			table.productPlanId,
		),
		regionIdx: index("product_pricing_region_idx").on(
			table.region,
			table.productPlanId,
		),
	}),
);

/**
 * Product Feature - Features included in a product plan
 */
export const productFeature = pgTable(
	"product_feature",
	{
		id: text("id").primaryKey(),
		// Which product plan this feature belongs to
		productPlanId: text("product_plan_id")
			.notNull()
			.references(() => productPlan.id, { onDelete: "cascade" }),
		// Feature details
		name: text("name").notNull(),
		description: text("description"),
		// Display order for UI
		order: integer("order").notNull().default(0),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		planIdx: index("product_feature_plan_idx").on(table.productPlanId),
		orderIdx: index("product_feature_order_idx").on(
			table.productPlanId,
			table.order,
		),
	}),
);

/**
 * Product Add-On - Optional add-ons for product plans
 *
 * Scoped to a support staff organization (tenant)
 */
export const productAddOn = pgTable(
	"product_add_on",
	{
		id: text("id").primaryKey(),
		// Which support staff organization owns this add-on
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Add-on details
		name: text("name").notNull(),
		description: text("description"),
		// Pricing model: "flat", "seat", "usage", "hybrid"
		pricingModel: text("pricing_model").notNull().default("flat"),
		// Status workflow
		status: text("status").notNull().default("draft"),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("product_add_on_organization_idx").on(table.organizationId),
		statusIdx: index("product_add_on_status_idx").on(
			table.status,
			table.organizationId,
		),
	}),
);

/**
 * Product Add-On Pricing - Pricing details for product add-ons
 *
 * Same structure as productPricing
 */
export const productAddOnPricing = pgTable(
	"product_add_on_pricing",
	{
		id: text("id").primaryKey(),
		// Which product add-on this pricing is for
		productAddOnId: text("product_add_on_id")
			.notNull()
			.references(() => productAddOn.id, { onDelete: "cascade" }),
		// Pricing type: "base", "overage", "tier"
		pricingType: text("pricing_type").notNull().default("base"),
		// Regional pricing support
		region: text("region"),
		// Price details
		currency: text("currency").notNull().default("USD"),
		// Amount in cents
		amount: integer("amount").notNull(),
		// Billing interval: "month", "year", "one_time"
		interval: text("interval").notNull().default("month"),
		// Seat-based pricing
		perSeatAmount: integer("per_seat_amount"),
		// Usage-based pricing
		usageMeterId: text("usage_meter_id"),
		usageTiers: text("usage_tiers"),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		addOnIdx: index("product_add_on_pricing_add_on_idx").on(
			table.productAddOnId,
		),
		typeIdx: index("product_add_on_pricing_type_idx").on(
			table.pricingType,
			table.productAddOnId,
		),
	}),
);

/**
 * Coupon - Discount codes for product plans
 *
 * Scoped to a support staff organization (tenant)
 */
export const coupon = pgTable(
	"coupon",
	{
		id: text("id").primaryKey(),
		// Which support staff organization owns this coupon
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Coupon details
		code: text("code").notNull(),
		// Discount type: "percentage", "fixed_amount", "free_months", "trial_extension"
		discountType: text("discount_type").notNull(),
		// Discount value (percentage 0-100, or fixed amount in cents)
		discountValue: integer("discount_value").notNull(),
		// Which plans this coupon applies to (null = all plans)
		applicablePlanIds: text("applicable_plan_ids").array(),
		// Redemption limits
		maxRedemptions: integer("max_redemptions"),
		redemptionCount: integer("redemption_count").notNull().default(0),
		// Status
		status: text("status").notNull().default("active"),
		// Expiration
		expiresAt: timestamp("expires_at"),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("coupon_organization_idx").on(table.organizationId),
		codeIdx: unique("coupon_code_idx").on(table.code, table.organizationId),
		statusIdx: index("coupon_status_idx").on(
			table.status,
			table.organizationId,
		),
	}),
);

/**
 * Product Feature Flag - Feature flags tied to product plans
 *
 * Used to enable/disable features based on plan
 */
export const productFeatureFlag = pgTable(
	"product_feature_flag",
	{
		id: text("id").primaryKey(),
		// Which product plan this feature flag belongs to
		productPlanId: text("product_plan_id")
			.notNull()
			.references(() => productPlan.id, { onDelete: "cascade" }),
		// Feature flag key
		flagKey: text("flag_key").notNull(),
		// Feature flag value (JSON)
		flagValue: text("flag_value").notNull(),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		planIdx: index("product_feature_flag_plan_idx").on(table.productPlanId),
		keyIdx: unique("product_feature_flag_key_idx").on(
			table.flagKey,
			table.productPlanId,
		),
	}),
);

/**
 * Product Plan Add-On (Bolt-Ons) - Junction table for plans and add-ons
 *
 * Defines which add-ons are available for which plans and how they're configured
 */
export const productPlanAddOn = pgTable(
	"product_plan_add_on",
	{
		id: text("id").primaryKey(),
		// Which product plan
		productPlanId: text("product_plan_id")
			.notNull()
			.references(() => productPlan.id, { onDelete: "cascade" }),
		// Which add-on
		productAddOnId: text("product_add_on_id")
			.notNull()
			.references(() => productAddOn.id, { onDelete: "cascade" }),
		// How this add-on is billed: "one_time", "recurring"
		billingType: text("billing_type").notNull().default("recurring"),
		// Display order for UI
		displayOrder: integer("display_order").notNull().default(0),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		planIdx: index("product_plan_add_on_plan_idx").on(table.productPlanId),
		addOnIdx: index("product_plan_add_on_add_on_idx").on(table.productAddOnId),
		// Ensure a plan can't have the same add-on twice
		uniquePlanAddOn: unique("product_plan_add_on_unique").on(
			table.productPlanId,
			table.productAddOnId,
		),
	}),
);

/**
 * Usage Meter - Defines usage-based pricing meters
 *
 * Scoped to a support staff organization (tenant)
 */
export const usageMeter = pgTable(
	"usage_meter",
	{
		id: text("id").primaryKey(),
		// Which support staff organization owns this meter
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Meter details
		name: text("name").notNull(),
		unit: text("unit").notNull(),
		description: text("description"),
		// Status
		status: text("status").notNull().default("active"),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("usage_meter_organization_idx").on(table.organizationId),
		statusIdx: index("usage_meter_status_idx").on(
			table.status,
			table.organizationId,
		),
	}),
);

/**
 * Subscription - Active subscriptions for tenant organizations
 *
 * Scoped to support staff organization but linked to tenant organization (customer)
 */
export const subscription = pgTable(
	"subscription",
	{
		id: text("id").primaryKey(),
		// Which support staff organization owns this subscription
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Which tenant organization this subscription is for
		tenantOrganizationId: text("tenant_organization_id")
			.notNull()
			.references(() => tenantOrganization.id, { onDelete: "cascade" }),
		// Unique subscription identifier
		subscriptionNumber: text("subscription_number").notNull(),
		// Which product plan
		productPlanId: text("product_plan_id")
			.notNull()
			.references(() => productPlan.id, { onDelete: "cascade" }),
		// Subscription status
		status: text("status").notNull().default("active"),
		// Collection method: "charge_automatically", "send_invoice"
		// This determines whether to auto-charge or generate invoices
		collectionMethod: text("collection_method")
			.notNull()
			.default("charge_automatically"),
		// Billing cycle
		billingCycle: text("billing_cycle").notNull().default("monthly"),
		currentPeriodStart: timestamp("current_period_start").notNull(),
		currentPeriodEnd: timestamp("current_period_end").notNull(),
		// Monthly Recurring Revenue in cents
		mrr: integer("mrr").notNull(),
		// Seat count
		seats: integer("seats").notNull().default(1),
		// Payment method reference
		paymentMethodId: text("payment_method_id"),
		// Link to the deal that originated this subscription
		linkedDealId: text("linked_deal_id").references(() => deal.id, {
			onDelete: "set null",
		}),
		// Applied coupon
		couponId: text("coupon_id").references(() => coupon.id, {
			onDelete: "set null",
		}),
		// Additional notes
		notes: text("notes"),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("subscription_organization_idx").on(table.organizationId),
		tenantOrgIdx: index("subscription_tenant_organization_idx").on(
			table.tenantOrganizationId,
		),
		subscriptionNumberIdx: unique("subscription_number_idx").on(
			table.subscriptionNumber,
			table.organizationId,
		),
		statusIdx: index("subscription_status_idx").on(
			table.status,
			table.organizationId,
		),
		planIdx: index("subscription_plan_idx").on(table.productPlanId),
	}),
);

/**
 * Subscription Add-On - Add-ons attached to subscriptions
 */
export const subscriptionAddOn = pgTable(
	"subscription_add_on",
	{
		// Which subscription
		subscriptionId: text("subscription_id")
			.notNull()
			.references(() => subscription.id, { onDelete: "cascade" }),
		// Which add-on
		productAddOnId: text("product_add_on_id")
			.notNull()
			.references(() => productAddOn.id, { onDelete: "cascade" }),
		// Quantity of this add-on
		quantity: integer("quantity").notNull().default(1),
		// Amount in cents
		amount: integer("amount").notNull(),
		// Timestamp
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => ({
		pk: primaryKey({
			columns: [table.subscriptionId, table.productAddOnId],
		}),
		subscriptionIdx: index("subscription_add_on_subscription_idx").on(
			table.subscriptionId,
		),
		addOnIdx: index("subscription_add_on_add_on_idx").on(table.productAddOnId),
	}),
);

/**
 * Usage History - Track usage for usage-based pricing
 */
export const usageHistory = pgTable(
	"usage_history",
	{
		id: text("id").primaryKey(),
		// Which subscription this usage is for
		subscriptionId: text("subscription_id")
			.notNull()
			.references(() => subscription.id, { onDelete: "cascade" }),
		// Which meter
		usageMeterId: text("usage_meter_id")
			.notNull()
			.references(() => usageMeter.id, { onDelete: "cascade" }),
		// Period
		periodStart: timestamp("period_start").notNull(),
		periodEnd: timestamp("period_end").notNull(),
		// Quantity
		quantity: integer("quantity").notNull(),
		// When this usage was recorded
		recordedAt: timestamp("recorded_at").notNull(),
		// Additional metadata
		metadata: text("metadata"),
		// Timestamp
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => ({
		subscriptionIdx: index("usage_history_subscription_idx").on(
			table.subscriptionId,
		),
		meterIdx: index("usage_history_meter_idx").on(table.usageMeterId),
		periodIdx: index("usage_history_period_idx").on(
			table.periodStart,
			table.periodEnd,
		),
	}),
);

/**
 * Subscription Activity - Activity log for subscriptions
 */
export const subscriptionActivity = pgTable(
	"subscription_activity",
	{
		id: text("id").primaryKey(),
		// Which subscription this activity is for
		subscriptionId: text("subscription_id")
			.notNull()
			.references(() => subscription.id, { onDelete: "cascade" }),
		// Activity details
		activityType: text("activity_type").notNull(),
		// Description
		description: text("description").notNull(),
		// Who performed the activity
		userId: text("user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		aiAgentId: text("ai_agent_id"),
		// Additional metadata
		metadata: text("metadata"),
		// Timestamp
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => ({
		subscriptionIdx: index("subscription_activity_subscription_idx").on(
			table.subscriptionId,
		),
		createdAtIdx: index("subscription_activity_created_at_idx").on(
			table.subscriptionId,
			table.createdAt,
		),
	}),
);

/**
 * Invoice - Invoices for subscriptions
 *
 * Scoped to support staff organization but linked to tenant organization (customer)
 */
export const invoice = pgTable(
	"invoice",
	{
		id: text("id").primaryKey(),
		// Which support staff organization owns this invoice
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Which subscription this invoice is for
		subscriptionId: text("subscription_id").references(() => subscription.id, {
			onDelete: "set null",
		}),
		// Which tenant organization this invoice is for
		tenantOrganizationId: text("tenant_organization_id")
			.notNull()
			.references(() => tenantOrganization.id, { onDelete: "cascade" }),
		// Invoice details
		invoiceNumber: text("invoice_number").notNull(),
		// Invoice status: "draft", "open", "paid", "void", "uncollectible"
		status: text("status").notNull().default("draft"),
		// Amount details (in cents)
		subtotal: integer("subtotal").notNull(),
		tax: integer("tax").notNull().default(0),
		total: integer("total").notNull(),
		// Currency
		currency: text("currency").notNull().default("USD"),
		// Dates
		issueDate: timestamp("issue_date").notNull(),
		dueDate: timestamp("due_date").notNull(),
		paidAt: timestamp("paid_at"),
		// Line items (JSON array)
		lineItems: text("line_items").notNull(),
		// PDF storage path
		pdfPath: text("pdf_path"),
		// Billing details
		billingName: text("billing_name").notNull(),
		billingEmail: text("billing_email").notNull(),
		billingAddress: text("billing_address"),
		// Additional notes
		notes: text("notes"),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("invoice_organization_idx").on(table.organizationId),
		subscriptionIdx: index("invoice_subscription_idx").on(table.subscriptionId),
		tenantOrgIdx: index("invoice_tenant_organization_idx").on(
			table.tenantOrganizationId,
		),
		invoiceNumberIdx: unique("invoice_number_idx").on(
			table.invoiceNumber,
			table.organizationId,
		),
		statusIdx: index("invoice_status_idx").on(
			table.status,
			table.organizationId,
		),
	}),
);

/**
 * Quote - Sales quotes for potential deals
 *
 * Scoped to support staff organization but linked to tenant organization (customer)
 */
export const quote = pgTable(
	"quote",
	{
		id: text("id").primaryKey(),
		// Which support staff organization owns this quote
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// Which tenant organization this quote is for
		tenantOrganizationId: text("tenant_organization_id")
			.notNull()
			.references(() => tenantOrganization.id, { onDelete: "cascade" }),
		// Optional link to deal
		dealId: text("deal_id").references(() => deal.id, {
			onDelete: "set null",
		}),
		// Optional link to product plan
		productPlanId: text("product_plan_id").references(() => productPlan.id, {
			onDelete: "set null",
		}),
		// Quote details
		quoteNumber: text("quote_number").notNull(),
		// Quote status: "draft", "sent", "accepted", "rejected", "expired"
		status: text("status").notNull().default("draft"),
		// Version for quote revisions
		version: integer("version").notNull().default(1),
		// Parent quote for revisions
		parentQuoteId: text("parent_quote_id").references(() => quote.id, {
			onDelete: "set null",
		}),
		// Amount details (in cents)
		subtotal: integer("subtotal").notNull(),
		tax: integer("tax").notNull().default(0),
		total: integer("total").notNull(),
		// Currency
		currency: text("currency").notNull().default("USD"),
		// Valid until date
		validUntil: timestamp("valid_until"),
		// Line items (JSON array)
		lineItems: text("line_items").notNull(),
		// Conversion tracking
		convertedToInvoiceId: text("converted_to_invoice_id").references(
			() => invoice.id,
			{ onDelete: "set null" },
		),
		// PDF storage path
		pdfPath: text("pdf_path"),
		// Billing details
		billingName: text("billing_name").notNull(),
		billingEmail: text("billing_email").notNull(),
		billingAddress: text("billing_address"),
		// Additional notes
		notes: text("notes"),
		// Timestamps
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
		sentAt: timestamp("sent_at"),
		acceptedAt: timestamp("accepted_at"),
		rejectedAt: timestamp("rejected_at"),
	},
	(table) => ({
		orgIdx: index("quote_organization_idx").on(table.organizationId),
		tenantOrgIdx: index("quote_tenant_organization_idx").on(
			table.tenantOrganizationId,
		),
		dealIdx: index("quote_deal_idx").on(table.dealId),
		productPlanIdx: index("quote_product_plan_idx").on(table.productPlanId),
		quoteNumberIdx: unique("quote_number_idx").on(
			table.quoteNumber,
			table.organizationId,
		),
		statusIdx: index("quote_status_idx").on(table.status, table.organizationId),
		parentQuoteIdx: index("quote_parent_quote_idx").on(table.parentQuoteId),
		convertedInvoiceIdx: index("quote_converted_invoice_idx").on(
			table.convertedToInvoiceId,
		),
	}),
);

/**
 * Organization API Key - Links Better Auth API keys to organizations
 *
 * Enables organization-scoped API tokens with role-based permissions.
 * Better Auth manages the actual apikey table, this table links those
 * keys to organizations and adds role-based access control.
 */
export const organizationApiKey = pgTable(
	"organization_api_key",
	{
		id: text("id").primaryKey(),
		// Which organization owns this API key
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		// References Better Auth's apikey table (managed by plugin)
		apiKeyId: text("api_key_id").notNull(),
		// Role-based permission: "read-only" | "full-access"
		role: text("role").notNull().default("read-only"),
		// Who created it (for audit trail)
		createdByUserId: text("created_by_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => ({
		orgIdx: index("organization_api_key_org_idx").on(table.organizationId),
		apiKeyIdx: unique("organization_api_key_api_key_idx").on(table.apiKeyId),
		createdByIdx: index("organization_api_key_created_by_idx").on(
			table.createdByUserId,
		),
	}),
);
