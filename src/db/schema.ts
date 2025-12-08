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
} from 'drizzle-orm/pg-core'

export const todos = pgTable(
  'todos',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    organizationId: text('organizationId').references(() => organization.id, {
      onDelete: 'cascade',
    }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    orgIdx: index('todos_organization_idx').on(table.organizationId),
  }),
)

// Better Auth tables
export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('emailVerified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index('user_email_idx').on(table.email),
  }),
)

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
})

// Organization plugin tables
export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const member = pgTable(
  'member',
  {
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.organizationId, table.userId] }),
  }),
)

export const invitation = pgTable('invitation', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  organizationId: text('organizationId')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  status: text('status').notNull().default('pending'),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

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
  'tenant_organization',
  {
    id: text('id').primaryKey(),
    // The support staff organization this tenant belongs to
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // Basic info
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    logo: text('logo'),
    website: text('website'),
    industry: text('industry'),
    // Subscription info
    subscriptionPlan: text('subscriptionPlan').default('free'),
    subscriptionStatus: text('subscriptionStatus').default('active'), // active, canceled, past_due, trialing
    // Billing info
    billingEmail: text('billingEmail'),
    billingAddress: text('billingAddress'),
    // CRM fields
    tags: text('tags'), // JSON array of tags, e.g., ["enterprise", "high-value"]
    assignedToUserId: text('assignedToUserId')
      .references(() => user.id, { onDelete: 'set null' }),
    // Metadata
    notes: text('notes'),
    metadata: text('metadata'), // JSON object for custom properties/fields
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('tenant_org_organization_idx').on(table.organizationId),
    slugIdx: index('tenant_org_slug_idx').on(table.organizationId, table.slug),
    assignedIdx: index('tenant_org_assigned_idx').on(table.assignedToUserId),
  })
)

/**
 * Tenant User - Individual customers within tenant organizations
 * These users do NOT have login accounts - they are customers being supported
 */
export const tenantUser = pgTable(
  'tenant_user',
  {
    id: text('id').primaryKey(),
    // The tenant organization this user belongs to
    tenantOrganizationId: text('tenantOrganizationId')
      .notNull()
      .references(() => tenantOrganization.id, { onDelete: 'cascade' }),
    // Basic info
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    avatarUrl: text('avatarUrl'),
    title: text('title'), // Job title, e.g., "CEO", "VP of Sales"
    // Role within their organization
    role: text('role').notNull().default('user'), // owner, admin, user, viewer
    isOwner: boolean('isOwner').notNull().default(false),
    // Status
    status: text('status').notNull().default('active'), // active, suspended, invited
    // Activity tracking
    lastActivityAt: timestamp('lastActivityAt'),
    // Metadata
    notes: text('notes'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    tenantOrgIdx: index('tenant_user_tenant_org_idx').on(table.tenantOrganizationId),
    emailIdx: index('tenant_user_email_idx').on(table.tenantOrganizationId, table.email),
  })
)

// ============================================================================
// Audit Log Tables
// ============================================================================

/**
 * Audit Log - Tracks important changes to tenant data
 * Used for security, compliance, and activity tracking
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    // The support staff organization this audit log belongs to
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // The tenant organization affected (if applicable)
    tenantOrganizationId: text('tenantOrganizationId')
      .references(() => tenantOrganization.id, { onDelete: 'cascade' }),
    // Who performed the action
    performedByUserId: text('performedByUserId')
      .references(() => user.id, { onDelete: 'set null' }),
    performedByName: text('performedByName').notNull(), // Denormalized for display
    // What was changed
    entityType: text('entityType').notNull(), // tenant_user, ticket, subscription, etc.
    entityId: text('entityId').notNull(), // ID of the entity that was changed
    // Action performed
    action: text('action').notNull(), // role_changed, status_changed, created, deleted, etc.
    // Change details
    fieldName: text('fieldName'), // e.g., 'role', 'status'
    oldValue: text('oldValue'), // Previous value (JSON if complex)
    newValue: text('newValue'), // New value (JSON if complex)
    // Additional context
    metadata: text('metadata'), // JSON object for additional context
    // When it happened
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('audit_log_organization_idx').on(table.organizationId),
    tenantOrgIdx: index('audit_log_tenant_org_idx').on(table.tenantOrganizationId),
    entityIdx: index('audit_log_entity_idx').on(table.entityType, table.entityId),
    performedByIdx: index('audit_log_performed_by_idx').on(table.performedByUserId),
    createdAtIdx: index('audit_log_created_at_idx').on(table.createdAt),
  })
)

// ============================================================================
// Support Ticket Tables
// ============================================================================

/**
 * Ticket - Support tickets created by or for tenant users
 * Scoped to a support staff organization
 */
export const ticket = pgTable(
  'ticket',
  {
    id: text('id').primaryKey(),
    // The support staff organization this ticket belongs to
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // Ticket number (human-readable, auto-incremented per org)
    ticketNumber: integer('ticketNumber').notNull(),
    // The tenant user who submitted/is associated with this ticket
    tenantUserId: text('tenantUserId')
      .references(() => tenantUser.id, { onDelete: 'set null' }),
    // Ticket details
    title: text('title').notNull(),
    status: text('status').notNull().default('open'), // open, pending, waiting_on_customer, escalated, closed
    priority: text('priority').notNull().default('normal'), // low, normal, high, urgent
    // Assignment
    assignedToUserId: text('assignedToUserId')
      .references(() => user.id, { onDelete: 'set null' }),
    assignedToAI: boolean('assignedToAI').notNull().default(false),
    // Channel info
    channel: text('channel').notNull().default('web'), // web, email, api
    // SLA tracking
    slaDeadline: timestamp('slaDeadline'),
    firstResponseAt: timestamp('firstResponseAt'),
    resolvedAt: timestamp('resolvedAt'),
    // Metadata
    tags: text('tags'), // JSON array of tags
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('ticket_organization_idx').on(table.organizationId),
    statusIdx: index('ticket_status_idx').on(table.organizationId, table.status),
    priorityIdx: index('ticket_priority_idx').on(table.organizationId, table.priority),
    assignedIdx: index('ticket_assigned_idx').on(table.assignedToUserId),
    tenantUserIdx: index('ticket_tenant_user_idx').on(table.tenantUserId),
    ticketNumberIdx: index('ticket_number_idx').on(table.organizationId, table.ticketNumber),
  })
)

/**
 * Ticket Message - Individual messages within a ticket thread
 */
export const ticketMessage = pgTable(
  'ticket_message',
  {
    id: text('id').primaryKey(),
    ticketId: text('ticketId')
      .notNull()
      .references(() => ticket.id, { onDelete: 'cascade' }),
    // Message type: customer, agent (support staff), ai, system
    messageType: text('messageType').notNull().default('customer'),
    // Author info - can be tenant user, support staff, or AI
    authorTenantUserId: text('authorTenantUserId')
      .references(() => tenantUser.id, { onDelete: 'set null' }),
    authorUserId: text('authorUserId')
      .references(() => user.id, { onDelete: 'set null' }),
    authorName: text('authorName').notNull(), // Denormalized for display
    // Content
    content: text('content').notNull(),
    // For internal notes (not visible to customer)
    isInternal: boolean('isInternal').notNull().default(false),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    ticketIdx: index('ticket_message_ticket_idx').on(table.ticketId),
    createdAtIdx: index('ticket_message_created_idx').on(table.ticketId, table.createdAt),
  })
)

/**
 * Ticket AI Triage - AI-generated analysis and suggestions for tickets
 */
export const ticketAiTriage = pgTable(
  'ticket_ai_triage',
  {
    id: text('id').primaryKey(),
    ticketId: text('ticketId')
      .notNull()
      .references(() => ticket.id, { onDelete: 'cascade' })
      .unique(), // One triage per ticket
    // AI Analysis
    category: text('category'), // e.g., "Authentication / SSO", "Billing", "General"
    sentiment: text('sentiment'), // e.g., "Negative (Urgency Detected)", "Neutral", "Positive"
    urgencyScore: integer('urgencyScore'), // 1-10 score
    // Suggestions
    suggestedAction: text('suggestedAction'),
    suggestedPlaybook: text('suggestedPlaybook'),
    suggestedPlaybookLink: text('suggestedPlaybookLink'),
    // AI-generated summary
    summary: text('summary'),
    // Draft response (if AI generated one)
    draftResponse: text('draftResponse'),
    // Confidence score
    confidence: integer('confidence'), // 0-100
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    ticketIdx: index('ticket_ai_triage_ticket_idx').on(table.ticketId),
  })
)

// ============================================================================
// Knowledge Base Tables
// Help articles and playbooks for support staff and AI agents
// ============================================================================

/**
 * Knowledge Article - Help center articles for self-service support
 * Scoped to a support staff organization
 */
export const knowledgeArticle = pgTable(
  'knowledge_article',
  {
    id: text('id').primaryKey(),
    // The support staff organization this article belongs to
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // Article content
    title: text('title').notNull(),
    content: text('content'), // Article body/content (markdown or HTML)
    slug: text('slug').notNull(), // URL-friendly identifier
    // Categorization
    category: text('category'), // AUTHENTICATION, BILLING, DEVELOPER, etc.
    tags: text('tags'), // JSON array of tags
    // Status workflow
    status: text('status').notNull().default('draft'), // draft, published, archived
    // Analytics
    views: integer('views').notNull().default(0),
    // Publishing info
    publishedAt: timestamp('publishedAt'),
    // Authorship
    createdByUserId: text('createdByUserId')
      .references(() => user.id, { onDelete: 'set null' }),
    updatedByUserId: text('updatedByUserId')
      .references(() => user.id, { onDelete: 'set null' }),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('knowledge_article_organization_idx').on(table.organizationId),
    statusIdx: index('knowledge_article_status_idx').on(table.organizationId, table.status),
    categoryIdx: index('knowledge_article_category_idx').on(table.organizationId, table.category),
    slugIdx: index('knowledge_article_slug_idx').on(table.organizationId, table.slug),
  })
)

/**
 * Playbook - Guided workflows for support agents (manual or automated)
 * Scoped to a support staff organization
 */
export const playbook = pgTable(
  'playbook',
  {
    id: text('id').primaryKey(),
    // The support staff organization this playbook belongs to
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // Playbook info
    name: text('name').notNull(),
    description: text('description'), // What the playbook does
    // Type determines how the playbook is used
    type: text('type').notNull().default('manual'), // manual, automated
    // For manual playbooks: step-by-step guide
    steps: text('steps'), // JSON array of step objects: { order, title, description, action? }
    // For automated playbooks: trigger conditions and actions
    triggers: text('triggers'), // JSON array of trigger conditions
    actions: text('actions'), // JSON array of actions to execute
    // Categorization
    category: text('category'),
    tags: text('tags'), // JSON array of tags
    // Status
    status: text('status').notNull().default('draft'), // draft, active, inactive
    // Authorship
    createdByUserId: text('createdByUserId')
      .references(() => user.id, { onDelete: 'set null' }),
    updatedByUserId: text('updatedByUserId')
      .references(() => user.id, { onDelete: 'set null' }),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('playbook_organization_idx').on(table.organizationId),
    typeIdx: index('playbook_type_idx').on(table.organizationId, table.type),
    statusIdx: index('playbook_status_idx').on(table.organizationId, table.status),
    categoryIdx: index('playbook_category_idx').on(table.organizationId, table.category),
  })
)

// ============================================================================
// Sales CRM Tables
// Pipelines, deals, and sales activities
// ============================================================================

/**
 * Pipeline - Sales pipeline definitions
 * Scoped to a tenant organization (customer company)
 */
export const pipeline = pgTable(
  'pipeline',
  {
    id: text('id').primaryKey(),
    // The tenant organization this pipeline belongs to
    tenantOrganizationId: text('tenantOrganizationId')
      .notNull()
      .references(() => tenantOrganization.id, { onDelete: 'cascade' }),
    // Pipeline info
    name: text('name').notNull(), // e.g., "Enterprise Pipeline", "SMB Pipeline"
    description: text('description'),
    // Default pipeline for the org
    isDefault: boolean('isDefault').notNull().default(false),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    tenantOrgIdx: index('pipeline_tenant_org_idx').on(table.tenantOrganizationId),
  })
)

/**
 * Pipeline Stage - Stages within a pipeline
 */
export const pipelineStage = pgTable(
  'pipeline_stage',
  {
    id: text('id').primaryKey(),
    // The pipeline this stage belongs to
    pipelineId: text('pipelineId')
      .notNull()
      .references(() => pipeline.id, { onDelete: 'cascade' }),
    // Stage info
    name: text('name').notNull(), // e.g., "Lead", "Meeting", "Negotiation"
    order: integer('order').notNull(), // Display order
    color: text('color').notNull().default('gray'), // Color code for UI
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    pipelineIdx: index('pipeline_stage_pipeline_idx').on(table.pipelineId),
    orderIdx: index('pipeline_stage_order_idx').on(table.pipelineId, table.order),
  })
)

/**
 * Deal - Sales deals/opportunities
 * Scoped to support staff organization but linked to tenant organization (customer)
 */
export const deal = pgTable(
  'deal',
  {
    id: text('id').primaryKey(),
    // The support staff organization managing this deal
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // The customer organization this deal is for
    tenantOrganizationId: text('tenantOrganizationId')
      .notNull()
      .references(() => tenantOrganization.id, { onDelete: 'cascade' }),
    // Pipeline and stage
    pipelineId: text('pipelineId')
      .notNull()
      .references(() => pipeline.id, { onDelete: 'cascade' }),
    stageId: text('stageId')
      .notNull()
      .references(() => pipelineStage.id, { onDelete: 'cascade' }),
    // Deal info
    name: text('name').notNull(), // Deal name/description
    value: integer('value').notNull().default(0), // Deal value in cents
    // Assignment
    assignedToUserId: text('assignedToUserId')
      .references(() => user.id, { onDelete: 'set null' }),
    assignedToAI: boolean('assignedToAI').notNull().default(false),
    // Linked records
    linkedSubscriptionId: text('linkedSubscriptionId'),
    linkedTrialId: text('linkedTrialId'),
    // Scoring
    manualScore: integer('manualScore'), // Manual deal score (1-100)
    aiScore: integer('aiScore'), // AI predicted score (1-100)
    // Additional data
    badges: text('badges'), // JSON array of badges (e.g., ["Hot", "Enterprise"])
    customFields: text('customFields'), // JSON object for custom fields
    nextTask: text('nextTask'),
    notes: text('notes'),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('deal_organization_idx').on(table.organizationId),
    tenantOrgIdx: index('deal_tenant_org_idx').on(table.tenantOrganizationId),
    pipelineIdx: index('deal_pipeline_idx').on(table.pipelineId),
    stageIdx: index('deal_stage_idx').on(table.stageId),
    assignedIdx: index('deal_assigned_idx').on(table.assignedToUserId),
  })
)

/**
 * Deal Contact - Contacts associated with deals (many-to-many)
 */
export const dealContact = pgTable(
  'deal_contact',
  {
    // The deal
    dealId: text('dealId')
      .notNull()
      .references(() => deal.id, { onDelete: 'cascade' }),
    // The tenant user (contact)
    tenantUserId: text('tenantUserId')
      .notNull()
      .references(() => tenantUser.id, { onDelete: 'cascade' }),
    // Role in the deal
    role: text('role').notNull().default('contact'), // decision_maker, influencer, user, contact
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.dealId, table.tenantUserId] }),
    dealIdx: index('deal_contact_deal_idx').on(table.dealId),
    tenantUserIdx: index('deal_contact_tenant_user_idx').on(table.tenantUserId),
  })
)

/**
 * Deal Activity - Activity timeline for deals
 */
export const dealActivity = pgTable(
  'deal_activity',
  {
    id: text('id').primaryKey(),
    // The deal
    dealId: text('dealId')
      .notNull()
      .references(() => deal.id, { onDelete: 'cascade' }),
    // Activity info
    activityType: text('activityType').notNull(), // stage_change, note_added, email_sent, task_completed, etc.
    description: text('description').notNull(),
    // Actor info
    userId: text('userId')
      .references(() => user.id, { onDelete: 'set null' }),
    aiAgentId: text('aiAgentId'), // If done by AI agent
    // Additional data
    metadata: text('metadata'), // JSON object for additional data (e.g., old stage, new stage)
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    dealIdx: index('deal_activity_deal_idx').on(table.dealId),
    createdAtIdx: index('deal_activity_created_idx').on(table.dealId, table.createdAt),
  })
)

// ============================================================================
// Product Catalog Tables
// Plans, pricing, features, add-ons, and coupons for subscription products
// ============================================================================

/**
 * Product Family - Optional grouping of products
 * Scoped to a support staff organization
 */
export const productFamily = pgTable(
  'product_family',
  {
    id: text('id').primaryKey(),
    // The support staff organization this family belongs to
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // Family info
    name: text('name').notNull(),
    description: text('description'),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('product_family_organization_idx').on(table.organizationId),
  })
)

/**
 * Product Plan - Main product plans/tiers
 * Scoped to a support staff organization
 */
export const productPlan = pgTable(
  'product_plan',
  {
    id: text('id').primaryKey(),
    // The support staff organization this plan belongs to
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // Optional product family
    productFamilyId: text('productFamilyId')
      .references(() => productFamily.id, { onDelete: 'set null' }),
    // Plan info
    name: text('name').notNull(),
    description: text('description'),
    // Status: active, draft, archived
    status: text('status').notNull().default('draft'),
    // Pricing model: flat, seat, usage, hybrid
    pricingModel: text('pricingModel').notNull().default('flat'),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('product_plan_organization_idx').on(table.organizationId),
    familyIdx: index('product_plan_family_idx').on(table.productFamilyId),
    statusIdx: index('product_plan_status_idx').on(table.organizationId, table.status),
  })
)

/**
 * Product Pricing - Flexible pricing structure for plans
 * Supports base pricing, regional pricing, seat-based, and usage-based
 */
export const productPricing = pgTable(
  'product_pricing',
  {
    id: text('id').primaryKey(),
    // The plan this pricing belongs to
    productPlanId: text('productPlanId')
      .notNull()
      .references(() => productPlan.id, { onDelete: 'cascade' }),
    // Pricing type: base, regional, seat, usage
    pricingType: text('pricingType').notNull().default('base'),
    // Region code (for regional pricing, e.g., "US", "GB", "DE")
    region: text('region'),
    // Currency code (e.g., "USD", "EUR", "GBP")
    currency: text('currency').notNull().default('USD'),
    // Amount in cents (for base/regional/flat pricing)
    amount: integer('amount').notNull().default(0),
    // Billing interval: monthly, yearly (null for usage-based)
    interval: text('interval'), // monthly, yearly
    // Per-seat amount (for seat-based pricing, in cents)
    perSeatAmount: integer('perSeatAmount'),
    // Usage meter reference (for usage-based pricing)
    usageMeterId: text('usageMeterId'),
    // Usage tier pricing (JSON for tiered usage pricing)
    usageTiers: text('usageTiers'), // JSON: [{ upTo: 1000, unitPrice: 10 }, { upTo: null, unitPrice: 5 }]
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    planIdx: index('product_pricing_plan_idx').on(table.productPlanId),
    typeIdx: index('product_pricing_type_idx').on(table.productPlanId, table.pricingType),
    regionIdx: index('product_pricing_region_idx').on(table.productPlanId, table.region),
  })
)

/**
 * Product Feature - Features included in a plan
 */
export const productFeature = pgTable(
  'product_feature',
  {
    id: text('id').primaryKey(),
    // The plan this feature belongs to
    productPlanId: text('productPlanId')
      .notNull()
      .references(() => productPlan.id, { onDelete: 'cascade' }),
    // Feature info
    name: text('name').notNull(),
    description: text('description'),
    // Display order
    order: integer('order').notNull().default(0),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    planIdx: index('product_feature_plan_idx').on(table.productPlanId),
    orderIdx: index('product_feature_order_idx').on(table.productPlanId, table.order),
  })
)

/**
 * Product Add-On - Add-ons available for plans
 * Scoped to a support staff organization
 */
export const productAddOn = pgTable(
  'product_add_on',
  {
    id: text('id').primaryKey(),
    // The support staff organization this add-on belongs to
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // Add-on info
    name: text('name').notNull(),
    description: text('description'),
    // Pricing model: flat, seat, usage
    pricingModel: text('pricingModel').notNull().default('flat'),
    // Status: active, draft, archived
    status: text('status').notNull().default('draft'),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('product_add_on_organization_idx').on(table.organizationId),
    statusIdx: index('product_add_on_status_idx').on(table.organizationId, table.status),
  })
)

/**
 * Product Add-On Pricing - Pricing for add-ons
 * Similar structure to productPricing
 */
export const productAddOnPricing = pgTable(
  'product_add_on_pricing',
  {
    id: text('id').primaryKey(),
    // The add-on this pricing belongs to
    productAddOnId: text('productAddOnId')
      .notNull()
      .references(() => productAddOn.id, { onDelete: 'cascade' }),
    // Pricing type: base, regional, seat, usage
    pricingType: text('pricingType').notNull().default('base'),
    // Region code (for regional pricing)
    region: text('region'),
    // Currency code
    currency: text('currency').notNull().default('USD'),
    // Amount in cents
    amount: integer('amount').notNull().default(0),
    // Billing interval
    interval: text('interval'), // monthly, yearly
    // Per-seat amount (for seat-based pricing)
    perSeatAmount: integer('perSeatAmount'),
    // Usage meter reference
    usageMeterId: text('usageMeterId'),
    // Usage tier pricing (JSON)
    usageTiers: text('usageTiers'),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    addOnIdx: index('product_add_on_pricing_add_on_idx').on(table.productAddOnId),
    typeIdx: index('product_add_on_pricing_type_idx').on(table.productAddOnId, table.pricingType),
  })
)

/**
 * Coupon - Discounts and promotional codes
 * Scoped to a support staff organization
 */
export const coupon = pgTable(
  'coupon',
  {
    id: text('id').primaryKey(),
    // The support staff organization this coupon belongs to
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // Coupon code
    code: text('code').notNull(),
    // Discount type: percentage, fixed_amount, free_months, trial_extension
    discountType: text('discountType').notNull(),
    // Discount value (percentage 0-100, or cents for fixed_amount, or months for free_months/trial_extension)
    discountValue: integer('discountValue').notNull(),
    // Applicable plan IDs (JSON array, null means all plans)
    applicablePlanIds: text('applicablePlanIds'), // JSON array of plan IDs
    // Maximum redemptions (null for unlimited)
    maxRedemptions: integer('maxRedemptions'),
    // Current redemption count
    redemptionCount: integer('redemptionCount').notNull().default(0),
    // Status: active, expired, disabled
    status: text('status').notNull().default('active'),
    // Expiration date
    expiresAt: timestamp('expiresAt'),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('coupon_organization_idx').on(table.organizationId),
    codeIdx: index('coupon_code_idx').on(table.organizationId, table.code),
    statusIdx: index('coupon_status_idx').on(table.organizationId, table.status),
  })
)

/**
 * Product Feature Flag - Feature flags per plan
 * Used to enable/disable specific features for a plan
 */
export const productFeatureFlag = pgTable(
  'product_feature_flag',
  {
    id: text('id').primaryKey(),
    // The plan this feature flag belongs to
    productPlanId: text('productPlanId')
      .notNull()
      .references(() => productPlan.id, { onDelete: 'cascade' }),
    // Flag key (e.g., "api_access", "advanced_analytics", "custom_branding")
    flagKey: text('flagKey').notNull(),
    // Flag value (JSON for flexibility - boolean, number, or object)
    flagValue: text('flagValue').notNull().default('true'), // JSON value
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    planIdx: index('product_feature_flag_plan_idx').on(table.productPlanId),
    keyIdx: index('product_feature_flag_key_idx').on(table.productPlanId, table.flagKey),
  })
)

/**
 * Product Plan Add-On - Junction table linking product plans to available add-ons
 * Allows configuring which add-ons are available for each plan
 */
export const productPlanAddOn = pgTable(
  'product_plan_add_on',
  {
    id: text('id').primaryKey(),
    // The plan this add-on is available for
    productPlanId: text('productPlanId')
      .notNull()
      .references(() => productPlan.id, { onDelete: 'cascade' }),
    // The add-on available for this plan
    productAddOnId: text('productAddOnId')
      .notNull()
      .references(() => productAddOn.id, { onDelete: 'cascade' }),
    // Billing type: 'billed_with_main' (recurring with subscription) or 'consumable' (usage-based)
    billingType: text('billingType').notNull().default('billed_with_main'),
    // Display order for UI
    displayOrder: integer('displayOrder').notNull().default(0),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    planIdx: index('product_plan_add_on_plan_idx').on(table.productPlanId),
    addOnIdx: index('product_plan_add_on_add_on_idx').on(table.productAddOnId),
    // Unique constraint: one add-on can only be added once per plan
    uniquePlanAddOn: unique().on(table.productPlanId, table.productAddOnId),
  })
)

// ============================================================================
// Subscription Management Tables
// Customer subscriptions, usage tracking, and subscription activities
// ============================================================================

/**
 * Usage Meter - Definition of usage-based billing meters
 * Scoped to a support staff organization
 */
export const usageMeter = pgTable(
  'usage_meter',
  {
    id: text('id').primaryKey(),
    // The support staff organization this meter belongs to
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // Meter info
    name: text('name').notNull(), // e.g., "API Calls", "Storage GB"
    unit: text('unit').notNull(), // e.g., "calls", "GB", "messages"
    description: text('description'),
    // Status
    status: text('status').notNull().default('active'), // active, archived
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('usage_meter_organization_idx').on(table.organizationId),
    statusIdx: index('usage_meter_status_idx').on(table.organizationId, table.status),
  })
)

/**
 * Subscription - Customer subscriptions to product plans
 * Scoped to support staff organization but linked to tenant organization (customer)
 */
export const subscription = pgTable(
  'subscription',
  {
    id: text('id').primaryKey(),
    // The support staff organization managing this subscription
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // The customer organization this subscription is for
    tenantOrganizationId: text('tenantOrganizationId')
      .notNull()
      .references(() => tenantOrganization.id, { onDelete: 'cascade' }),
    // Human-readable subscription ID (e.g., "SUB-992")
    subscriptionNumber: text('subscriptionNumber').notNull(),
    // The plan this subscription is for
    productPlanId: text('productPlanId')
      .notNull()
      .references(() => productPlan.id, { onDelete: 'restrict' }),
    // Subscription status
    status: text('status').notNull().default('draft'), // draft, active, trial, past_due, canceled, paused
    // Payment collection method
    // 'automatic' = self-service, auto-charge via Stripe/payment processor
    // 'send_invoice' = sales-led, manual invoice sent to customer
    collectionMethod: text('collectionMethod').notNull().default('send_invoice'), // automatic, send_invoice
    // Billing info
    billingCycle: text('billingCycle').notNull().default('monthly'), // monthly, yearly
    currentPeriodStart: timestamp('currentPeriodStart').notNull(),
    currentPeriodEnd: timestamp('currentPeriodEnd').notNull(), // renewsAt
    // Revenue
    mrr: integer('mrr').notNull().default(0), // Monthly recurring revenue in cents
    // Seat-based pricing
    seats: integer('seats').notNull().default(1),
    // Payment method reference (external)
    paymentMethodId: text('paymentMethodId'),
    // Linked deal (if created from a deal)
    linkedDealId: text('linkedDealId')
      .references(() => deal.id, { onDelete: 'set null' }),
    // Applied coupon/discount
    couponId: text('couponId')
      .references(() => coupon.id, { onDelete: 'set null' }),
    // Internal notes
    notes: text('notes'),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('subscription_organization_idx').on(table.organizationId),
    tenantOrgIdx: index('subscription_tenant_org_idx').on(table.tenantOrganizationId),
    subscriptionNumberIdx: index('subscription_number_idx').on(table.organizationId, table.subscriptionNumber),
    statusIdx: index('subscription_status_idx').on(table.organizationId, table.status),
    planIdx: index('subscription_plan_idx').on(table.productPlanId),
  })
)

/**
 * Subscription Add-On - Add-ons attached to a subscription
 */
export const subscriptionAddOn = pgTable(
  'subscription_add_on',
  {
    // The subscription
    subscriptionId: text('subscriptionId')
      .notNull()
      .references(() => subscription.id, { onDelete: 'cascade' }),
    // The add-on
    productAddOnId: text('productAddOnId')
      .notNull()
      .references(() => productAddOn.id, { onDelete: 'cascade' }),
    // Quantity (for seat-based add-ons)
    quantity: integer('quantity').notNull().default(1),
    // Override amount (if custom pricing, in cents)
    amount: integer('amount'),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.subscriptionId, table.productAddOnId] }),
    subscriptionIdx: index('subscription_add_on_subscription_idx').on(table.subscriptionId),
    addOnIdx: index('subscription_add_on_add_on_idx').on(table.productAddOnId),
  })
)

/**
 * Usage History - Tracks usage for usage-based billing
 */
export const usageHistory = pgTable(
  'usage_history',
  {
    id: text('id').primaryKey(),
    // The subscription
    subscriptionId: text('subscriptionId')
      .notNull()
      .references(() => subscription.id, { onDelete: 'cascade' }),
    // The usage meter
    usageMeterId: text('usageMeterId')
      .notNull()
      .references(() => usageMeter.id, { onDelete: 'cascade' }),
    // Usage period
    periodStart: timestamp('periodStart').notNull(),
    periodEnd: timestamp('periodEnd').notNull(),
    // Usage quantity
    quantity: integer('quantity').notNull().default(0),
    // When usage was recorded
    recordedAt: timestamp('recordedAt').notNull().defaultNow(),
    // Additional usage data (JSON)
    metadata: text('metadata'),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    subscriptionIdx: index('usage_history_subscription_idx').on(table.subscriptionId),
    meterIdx: index('usage_history_meter_idx').on(table.usageMeterId),
    periodIdx: index('usage_history_period_idx').on(table.subscriptionId, table.periodStart),
  })
)

/**
 * Subscription Activity - Activity timeline for subscriptions
 */
export const subscriptionActivity = pgTable(
  'subscription_activity',
  {
    id: text('id').primaryKey(),
    // The subscription
    subscriptionId: text('subscriptionId')
      .notNull()
      .references(() => subscription.id, { onDelete: 'cascade' }),
    // Activity type
    activityType: text('activityType').notNull(), // created, plan_changed, paused, resumed, canceled, seat_added, seat_removed, addon_added, addon_removed, coupon_applied
    // Human-readable description
    description: text('description').notNull(),
    // Actor info
    userId: text('userId')
      .references(() => user.id, { onDelete: 'set null' }),
    aiAgentId: text('aiAgentId'), // If done by AI agent
    // Additional data (JSON - old plan, new plan, etc.)
    metadata: text('metadata'),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  (table) => ({
    subscriptionIdx: index('subscription_activity_subscription_idx').on(table.subscriptionId),
    createdAtIdx: index('subscription_activity_created_idx').on(table.subscriptionId, table.createdAt),
  })
)

// ============================================================================
// Invoice Tables
// Invoices for subscription billing
// ============================================================================

/**
 * Invoice - Invoices for subscription payments
 * Subscriptions start as draft and become active when invoice is paid
 */
export const invoice = pgTable(
  'invoice',
  {
    id: text('id').primaryKey(),
    // The support staff organization this invoice belongs to
    organizationId: text('organizationId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    // The subscription this invoice is for
    subscriptionId: text('subscriptionId')
      .notNull()
      .references(() => subscription.id, { onDelete: 'cascade' }),
    // The customer organization
    tenantOrganizationId: text('tenantOrganizationId')
      .notNull()
      .references(() => tenantOrganization.id, { onDelete: 'cascade' }),
    // Human-readable invoice number (e.g., "INV-ACME-1001")
    invoiceNumber: text('invoiceNumber').notNull(),
    // Invoice status: draft, paid, overdue, canceled
    status: text('status').notNull().default('draft'),
    // Billing amounts (in cents)
    subtotal: integer('subtotal').notNull().default(0),
    tax: integer('tax').notNull().default(0),
    total: integer('total').notNull().default(0),
    // Currency
    currency: text('currency').notNull().default('USD'),
    // Invoice dates
    issueDate: timestamp('issueDate').notNull(),
    dueDate: timestamp('dueDate').notNull(),
    paidAt: timestamp('paidAt'),
    // Line items (JSON array)
    lineItems: text('lineItems').notNull(), // JSON: [{ description, quantity, unitPrice, total }]
    // PDF storage path
    pdfPath: text('pdfPath'),
    // Billing details (snapshot at time of invoice)
    billingName: text('billingName'),
    billingEmail: text('billingEmail'),
    billingAddress: text('billingAddress'),
    // Internal notes
    notes: text('notes'),
    // Metadata
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('invoice_organization_idx').on(table.organizationId),
    subscriptionIdx: index('invoice_subscription_idx').on(table.subscriptionId),
    tenantOrgIdx: index('invoice_tenant_org_idx').on(table.tenantOrganizationId),
    invoiceNumberIdx: index('invoice_number_idx').on(table.organizationId, table.invoiceNumber),
    statusIdx: index('invoice_status_idx').on(table.organizationId, table.status),
  })
)
