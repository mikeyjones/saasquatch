import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  index,
  primaryKey,
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
