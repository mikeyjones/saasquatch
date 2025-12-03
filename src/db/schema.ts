import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  index,
  primaryKey,
  integer,
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
    // Metadata
    notes: text('notes'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('tenant_org_organization_idx').on(table.organizationId),
    slugIdx: index('tenant_org_slug_idx').on(table.organizationId, table.slug),
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
