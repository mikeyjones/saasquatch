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
