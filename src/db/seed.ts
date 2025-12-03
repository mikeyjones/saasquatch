/**
 * Database seed script for multi-tenant testing
 * 
 * Creates two types of data:
 * 1. Support Staff Organizations - Users who CAN log in (with Better Auth accounts)
 *    - Stored in: organization, user, member, account tables
 * 2. Tenant Customer Organizations - Customers being supported (NO login)
 *    - Stored in: tenant_organization, tenant_user tables
 *    - Scoped to a support staff organization
 *
 * Run with: bun run db:seed
 */

import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq } from 'drizzle-orm'
import * as schema from './schema'
import { hashPassword } from 'better-auth/crypto'

// ============================================================================
// Configuration
// ============================================================================

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

// Validate required environment variables
function validateEnv(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required')
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 24)
}

/**
 * Generate initials from a name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

/**
 * Log a success message
 */
function logSuccess(message: string): void {
  console.log(`   ✓ ${message}`)
}

/**
 * Log an info message
 */
function logInfo(message: string): void {
  console.log(`   ℹ ${message}`)
}

/**
 * Log a section header
 */
function logSection(message: string): void {
  console.log(`\n📦 ${message}`)
}

// ============================================================================
// Type Definitions
// ============================================================================

interface SupportStaffOrg {
  name: string
  slug: string
  description: string
  users: {
    name: string
    email: string
    role: 'owner' | 'admin' | 'member'
  }[]
}

interface TenantOrgData {
  name: string
  slug: string
  description: string
  industry?: string
  subscriptionPlan?: string
  subscriptionStatus?: string
  website?: string
  users: {
    name: string
    email: string
    role: 'owner' | 'admin' | 'user' | 'viewer'
    isOwner?: boolean
    status?: 'active' | 'suspended' | 'invited'
    phone?: string
  }[]
}

interface TicketSeedData {
  title: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'open' | 'pending' | 'waiting_on_customer' | 'escalated' | 'closed'
  tenantOrgSlug: string // Which tenant org's user submitted this
  tenantUserEmail: string // Which user submitted
  messages: {
    type: 'customer' | 'agent' | 'ai' | 'system'
    authorEmail?: string // For agent messages
    content: string
    isInternal?: boolean
    hoursAgo: number // How many hours ago this message was sent
  }[]
  aiTriage?: {
    category: string
    sentiment: string
    urgencyScore: number
    suggestedAction: string
    suggestedPlaybook?: string
  }
  hasAI?: boolean
}

// ============================================================================
// Seed Data
// ============================================================================

/**
 * Support Staff Organizations
 * These users CAN log in to the system (have Better Auth accounts)
 * They are the employees/agents who use the support platform
 */
const supportStaffOrgs: SupportStaffOrg[] = [
  {
    name: 'Acme Corporation',
    slug: 'acme',
    description: 'Primary test organization for support staff',
    users: [
      { name: 'Alice Admin', email: 'alice@acme.test', role: 'owner' },
      { name: 'Bob Builder', email: 'bob@acme.test', role: 'admin' },
      { name: 'Carol Support', email: 'carol@acme.test', role: 'member' },
    ],
  },
  {
    name: 'Globex Industries',
    slug: 'globex',
    description: 'Secondary test organization for support staff',
    users: [
      { name: 'Charlie CEO', email: 'charlie@globex.test', role: 'owner' },
      { name: 'Diana Dev', email: 'diana@globex.test', role: 'member' },
    ],
  },
]

/**
 * Tenant Customer Organizations (per support staff org)
 * These are the customers that each support staff organization helps
 * 
 * Key: support staff org slug
 * Value: array of tenant organizations for that support staff org
 */
/**
 * Sample tickets for testing
 * Key: support staff org slug
 */
const ticketsPerStaff: Record<string, TicketSeedData[]> = {
  acme: [
    {
      title: 'Login Failure on SSO',
      priority: 'urgent',
      status: 'open',
      tenantOrgSlug: 'acme-corp',
      tenantUserEmail: 'john@acme.com',
      messages: [
        {
          type: 'customer',
          content: `Hi Team,

We are unable to login using our Okta SSO integration on the staging environment. It was working yesterday. Getting a 500 error.

This is blocking our UAT testing. Please help ASAP.`,
          hoursAgo: 2,
        },
      ],
      aiTriage: {
        category: 'Authentication / SSO',
        sentiment: 'Negative (Urgency Detected)',
        urgencyScore: 9,
        suggestedAction: "Check Error Logs for 'Okta Connection Timeout'.",
        suggestedPlaybook: 'SSO Troubleshooting Guide',
      },
    },
    {
      title: 'Billing question for Nov invoice',
      priority: 'normal',
      status: 'open',
      tenantOrgSlug: 'techflow',
      tenantUserEmail: 'sarah@techflow.io',
      messages: [
        {
          type: 'customer',
          content: `Hello,

I have a question about our November invoice. There seems to be a discrepancy in the number of users billed vs our actual usage.

Can someone review this?`,
          hoursAgo: 4,
        },
      ],
    },
    {
      title: 'How to add new users?',
      priority: 'low',
      status: 'open',
      tenantOrgSlug: 'startup-inc',
      tenantUserEmail: 'mike@startup.io',
      hasAI: true,
      messages: [
        {
          type: 'customer',
          content: `Hi there,

I'm a new admin and trying to figure out how to add new users to our account. Can you point me to the right documentation?

Thanks!`,
          hoursAgo: 24,
        },
        {
          type: 'ai',
          content: `Hi Mike,

I can help you with adding new users! Here's how:

1. Go to Settings → Team Members
2. Click "Invite User"
3. Enter their email and select a role

You can also check out our documentation: [Adding Team Members](https://docs.example.com/team-members)

Let me know if you have any questions!`,
          hoursAgo: 23,
        },
      ],
      aiTriage: {
        category: 'Onboarding / How-to',
        sentiment: 'Neutral',
        urgencyScore: 2,
        suggestedAction: 'Provide documentation link for user management',
        suggestedPlaybook: 'New Admin Onboarding',
      },
    },
    {
      title: 'API Rate Limit increase request',
      priority: 'high',
      status: 'open',
      tenantOrgSlug: 'dataminds',
      tenantUserEmail: 'alex@dataminds.com',
      messages: [
        {
          type: 'customer',
          content: `Hello Support,

We're hitting our API rate limits frequently now that we've scaled up our integration. We'd like to request an increase to our current limits.

Our current plan is Enterprise and we're willing to discuss pricing for higher limits.`,
          hoursAgo: 48,
        },
        {
          type: 'agent',
          authorEmail: 'bob@acme.test',
          content: `Hi Alex,

Thanks for reaching out. I can see you're on our Enterprise plan and have been hitting the 10,000 requests/minute limit.

I've escalated this to our API team to review your usage patterns and discuss options. They'll be in touch within 24 hours.

In the meantime, I've temporarily increased your limit to 15,000 requests/minute.`,
          hoursAgo: 46,
        },
        {
          type: 'customer',
          content: `Thank you Bob! The temporary increase helps a lot. Looking forward to hearing from the API team.`,
          hoursAgo: 45,
        },
      ],
      aiTriage: {
        category: 'API / Technical',
        sentiment: 'Neutral',
        urgencyScore: 6,
        suggestedAction: 'Review API usage and escalate to API team for limit increase',
      },
    },
    {
      title: 'Feature request: Dark mode',
      priority: 'low',
      status: 'closed',
      tenantOrgSlug: 'global-logistics',
      tenantUserEmail: 'emily@logistics.global',
      messages: [
        {
          type: 'customer',
          content: `Hi,

Would love to see a dark mode option in the dashboard. Our team works late nights and it would really help with eye strain.

Thanks for considering!`,
          hoursAgo: 168, // 7 days ago
        },
        {
          type: 'agent',
          authorEmail: 'carol@acme.test',
          content: `Hi Emily,

Thank you for the feature suggestion! I've added this to our product roadmap.

Dark mode is actually something we're actively working on and expect to release in Q1 next year. I'll make sure you're notified when it's available.

Is there anything else I can help you with?`,
          hoursAgo: 166,
        },
        {
          type: 'customer',
          content: `That's great news! Thanks for the quick response. Nothing else for now.`,
          hoursAgo: 165,
        },
        {
          type: 'system',
          content: 'Ticket closed by Carol Support',
          hoursAgo: 165,
        },
      ],
    },
  ],
  globex: [
    {
      title: 'Cannot export reports to PDF',
      priority: 'normal',
      status: 'pending',
      tenantOrgSlug: 'megacorp',
      tenantUserEmail: 'robert@megacorp.com',
      messages: [
        {
          type: 'customer',
          content: `Hello,

When I try to export our monthly reports to PDF, the download starts but the file is corrupted. This happens in both Chrome and Firefox.

Can you help?`,
          hoursAgo: 12,
        },
        {
          type: 'agent',
          authorEmail: 'charlie@globex.test',
          content: `Hi Robert,

Sorry to hear you're having trouble with PDF exports. I've tested this on our end and can reproduce the issue.

I've reported this to our engineering team as a bug. They're investigating and I'll update you as soon as we have a fix.

In the meantime, you can export to CSV as a workaround.`,
          hoursAgo: 10,
        },
      ],
    },
  ],
}

const tenantOrgsPerStaff: Record<string, TenantOrgData[]> = {
  // Tenant customers for Acme Corporation support staff
  acme: [
    {
      name: 'Acme Corp',
      slug: 'acme-corp',
      description: 'Large enterprise customer - SSO issues',
      industry: 'Technology',
      subscriptionPlan: 'enterprise',
      subscriptionStatus: 'active',
      website: 'https://acme-corp.example.com',
      users: [
        { name: 'John Doe', email: 'john@acme.com', role: 'owner', isOwner: true, status: 'active' },
        { name: 'Jane Smith', email: 'jane@acme.com', role: 'admin', status: 'active' },
        { name: 'Tom Wilson', email: 'tom@acme.com', role: 'user', status: 'active' },
      ],
    },
    {
      name: 'TechFlow',
      slug: 'techflow',
      description: 'Mid-size tech company - Billing questions',
      industry: 'Software',
      subscriptionPlan: 'professional',
      subscriptionStatus: 'active',
      website: 'https://techflow.io',
      users: [
        { name: 'Sarah Miller', email: 'sarah@techflow.io', role: 'owner', isOwner: true, status: 'active' },
        { name: 'Mike Ross', email: 'mike@techflow.io', role: 'admin', status: 'suspended' },
        { name: 'Lisa Chen', email: 'lisa@techflow.io', role: 'user', status: 'active' },
      ],
    },
    {
      name: 'StartUp Inc',
      slug: 'startup-inc',
      description: 'Small startup - General questions',
      industry: 'Startup',
      subscriptionPlan: 'starter',
      subscriptionStatus: 'trialing',
      website: 'https://startup.io',
      users: [
        { name: 'Mike Chen', email: 'mike@startup.io', role: 'owner', isOwner: true, status: 'active' },
        { name: 'Amy Lee', email: 'amy@startup.io', role: 'user', status: 'active' },
      ],
    },
    {
      name: 'DataMinds',
      slug: 'dataminds',
      description: 'Data analytics company - API rate limits',
      industry: 'Analytics',
      subscriptionPlan: 'enterprise',
      subscriptionStatus: 'active',
      website: 'https://dataminds.com',
      users: [
        { name: 'Alex Johnson', email: 'alex@dataminds.com', role: 'owner', isOwner: true, status: 'active' },
        { name: 'Ryan Park', email: 'ryan@dataminds.com', role: 'admin', status: 'active' },
        { name: 'Emma Davis', email: 'emma@dataminds.com', role: 'user', status: 'active' },
      ],
    },
    {
      name: 'Global Logistics',
      slug: 'global-logistics',
      description: 'International shipping company',
      industry: 'Logistics',
      subscriptionPlan: 'professional',
      subscriptionStatus: 'active',
      website: 'https://logistics.global',
      users: [
        { name: 'Emily Blunt', email: 'emily@logistics.global', role: 'owner', isOwner: true, status: 'active' },
        { name: 'James Bond', email: 'james@logistics.global', role: 'admin', status: 'active' },
      ],
    },
  ],
  // Tenant customers for Globex Industries support staff
  globex: [
    {
      name: 'MegaCorp International',
      slug: 'megacorp',
      description: 'Global corporation',
      industry: 'Conglomerate',
      subscriptionPlan: 'enterprise',
      subscriptionStatus: 'active',
      users: [
        { name: 'Robert CEO', email: 'robert@megacorp.com', role: 'owner', isOwner: true, status: 'active' },
        { name: 'Susan CFO', email: 'susan@megacorp.com', role: 'admin', status: 'active' },
      ],
    },
    {
      name: 'SmallBiz LLC',
      slug: 'smallbiz',
      description: 'Small business customer',
      industry: 'Retail',
      subscriptionPlan: 'starter',
      subscriptionStatus: 'active',
      users: [
        { name: 'Pat Owner', email: 'pat@smallbiz.com', role: 'owner', isOwner: true, status: 'active' },
      ],
    },
  ],
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Create or get a support staff organization
 */
async function ensureOrganization(
  db: ReturnType<typeof drizzle>,
  name: string,
  slug: string
): Promise<string> {
  const existing = await db.query.organization.findFirst({
    where: eq(schema.organization.slug, slug),
  })

  if (existing) {
    logInfo(`Organization already exists: ${slug}`)
    return existing.id
  }

  const id = generateId()
  await db.insert(schema.organization).values({
    id,
    name,
    slug,
    logo: null,
  })
  logSuccess(`Organization created: ${name} (${slug})`)
  return id
}

/**
 * Create a support staff user WITH Better Auth account (can log in)
 */
async function ensureSupportStaffUser(
  db: ReturnType<typeof drizzle>,
  orgId: string,
  userData: SupportStaffOrg['users'][0]
): Promise<string> {
  const existing = await db.query.user.findFirst({
    where: eq(schema.user.email, userData.email),
  })

  let userId: string

  if (existing) {
    userId = existing.id
    logInfo(`Support user already exists: ${userData.email}`)

    // Update password if account exists
    const existingAccount = await db.query.account.findFirst({
      where: (account, { and, eq: eqFn }) =>
        and(
          eqFn(account.userId, userId),
          eqFn(account.providerId, 'credential')
        ),
    })

    if (existingAccount) {
      const hashedPassword = await hashPassword('password123')
      await db
        .update(schema.account)
        .set({ password: hashedPassword })
        .where(eq(schema.account.id, existingAccount.id))
      logSuccess(`Password updated for: ${userData.email}`)
    }
  } else {
    userId = generateId()
    const hashedPassword = await hashPassword('password123')

    // Create user record
    await db.insert(schema.user).values({
      id: userId,
      name: userData.name,
      email: userData.email,
      emailVerified: true,
    })

    // Create Better Auth account for login
    await db.insert(schema.account).values({
      id: generateId(),
      accountId: userId,
      providerId: 'credential',
      userId: userId,
      password: hashedPassword,
    })

    logSuccess(`Support user created: ${userData.email} (${userData.role}) [CAN LOGIN]`)
  }

  // Ensure membership exists
  await ensureMembership(db, orgId, userId, userData.role)

  return userId
}

/**
 * Ensure a membership record exists
 */
async function ensureMembership(
  db: ReturnType<typeof drizzle>,
  orgId: string,
  userId: string,
  role: string
): Promise<void> {
  const existing = await db.query.member.findFirst({
    where: (member, { and, eq: eqFn }) =>
      and(eqFn(member.organizationId, orgId), eqFn(member.userId, userId)),
  })

  if (!existing) {
    await db.insert(schema.member).values({
      organizationId: orgId,
      userId: userId,
      role: role,
    })
    logSuccess(`Membership created: ${role}`)
  }
}

/**
 * Create sample todos for an organization
 */
async function ensureSampleTodos(
  db: ReturnType<typeof drizzle>,
  orgId: string,
  orgName: string
): Promise<void> {
  const existing = await db.query.todos.findFirst({
    where: eq(schema.todos.organizationId, orgId),
  })

  if (existing) {
    logInfo('Sample todos already exist')
    return
  }

  const sampleTodos = [
    `Review Q4 reports for ${orgName}`,
    `Schedule team meeting`,
    `Update documentation`,
  ]

  for (const title of sampleTodos) {
    await db.insert(schema.todos).values({
      title,
      organizationId: orgId,
    })
  }
  logSuccess(`Created ${sampleTodos.length} sample todos`)
}

/**
 * Create or get a tenant organization (customer company)
 */
async function ensureTenantOrganization(
  db: ReturnType<typeof drizzle>,
  staffOrgId: string,
  tenantData: TenantOrgData
): Promise<string> {
  const existing = await db.query.tenantOrganization.findFirst({
    where: (to, { and, eq: eqFn }) =>
      and(
        eqFn(to.organizationId, staffOrgId),
        eqFn(to.slug, tenantData.slug)
      ),
  })

  if (existing) {
    logInfo(`Tenant org already exists: ${tenantData.slug}`)
    return existing.id
  }

  const id = generateId()
  await db.insert(schema.tenantOrganization).values({
    id,
    organizationId: staffOrgId,
    name: tenantData.name,
    slug: tenantData.slug,
    industry: tenantData.industry,
    subscriptionPlan: tenantData.subscriptionPlan,
    subscriptionStatus: tenantData.subscriptionStatus,
    website: tenantData.website,
    notes: tenantData.description,
  })
  logSuccess(`Tenant org created: ${tenantData.name} (${tenantData.slug})`)
  return id
}

/**
 * Create a tenant user (customer - NO login)
 */
async function ensureTenantUser(
  db: ReturnType<typeof drizzle>,
  tenantOrgId: string,
  userData: TenantOrgData['users'][0]
): Promise<string> {
  const existing = await db.query.tenantUser.findFirst({
    where: (tu, { and, eq: eqFn }) =>
      and(
        eqFn(tu.tenantOrganizationId, tenantOrgId),
        eqFn(tu.email, userData.email)
      ),
  })

  if (existing) {
    logInfo(`Tenant user already exists: ${userData.email}`)
    return existing.id
  }

  const id = generateId()
  await db.insert(schema.tenantUser).values({
    id,
    tenantOrganizationId: tenantOrgId,
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
    role: userData.role,
    isOwner: userData.isOwner ?? false,
    status: userData.status ?? 'active',
  })
  logSuccess(`Tenant user created: ${userData.name} (${userData.email}) [NO LOGIN]`)
  return id
}

/**
 * Get the next ticket number for an organization
 */
async function getNextTicketNumber(
  db: ReturnType<typeof drizzle>,
  orgId: string
): Promise<number> {
  const result = await db.query.ticket.findFirst({
    where: eq(schema.ticket.organizationId, orgId),
    orderBy: (ticket, { desc }) => [desc(ticket.ticketNumber)],
  })
  return (result?.ticketNumber ?? 9900) + 1
}

/**
 * Create a ticket with messages and AI triage
 */
async function ensureTicket(
  db: ReturnType<typeof drizzle>,
  staffOrgId: string,
  ticketData: TicketSeedData,
  tenantUserMap: Map<string, { id: string; name: string; tenantOrgName: string }>,
  supportStaffMap: Map<string, { id: string; name: string }>
): Promise<void> {
  // Find the tenant user
  const tenantUserKey = `${ticketData.tenantOrgSlug}:${ticketData.tenantUserEmail}`
  const tenantUser = tenantUserMap.get(tenantUserKey)
  
  if (!tenantUser) {
    console.error(`   ⚠ Tenant user not found: ${tenantUserKey}`)
    return
  }

  // Check if ticket already exists (by title and tenant user)
  const existing = await db.query.ticket.findFirst({
    where: (t, { and, eq: eqFn }) =>
      and(
        eqFn(t.organizationId, staffOrgId),
        eqFn(t.title, ticketData.title),
        eqFn(t.tenantUserId, tenantUser.id)
      ),
  })

  if (existing) {
    logInfo(`Ticket already exists: ${ticketData.title}`)
    return
  }

  const ticketId = generateId()
  const ticketNumber = await getNextTicketNumber(db, staffOrgId)

  // Calculate timestamps based on hoursAgo
  const now = new Date()
  const oldestMessageHours = Math.max(...ticketData.messages.map(m => m.hoursAgo))
  const createdAt = new Date(now.getTime() - oldestMessageHours * 60 * 60 * 1000)

  // Create the ticket
  await db.insert(schema.ticket).values({
    id: ticketId,
    organizationId: staffOrgId,
    ticketNumber,
    tenantUserId: tenantUser.id,
    title: ticketData.title,
    status: ticketData.status,
    priority: ticketData.priority,
    assignedToAI: ticketData.hasAI ?? false,
    channel: 'web',
    createdAt,
    updatedAt: now,
    resolvedAt: ticketData.status === 'closed' ? now : null,
  })

  // Create messages
  for (const msg of ticketData.messages) {
    const messageId = generateId()
    const messageTime = new Date(now.getTime() - msg.hoursAgo * 60 * 60 * 1000)
    
    let authorName = ''
    let authorTenantUserId: string | null = null
    let authorUserId: string | null = null

    if (msg.type === 'customer') {
      authorName = tenantUser.name
      authorTenantUserId = tenantUser.id
    } else if (msg.type === 'agent' && msg.authorEmail) {
      const agent = supportStaffMap.get(msg.authorEmail)
      if (agent) {
        authorName = agent.name
        authorUserId = agent.id
      } else {
        authorName = 'Support Agent'
      }
    } else if (msg.type === 'ai') {
      authorName = 'AI Assistant'
    } else if (msg.type === 'system') {
      authorName = 'System'
    }

    await db.insert(schema.ticketMessage).values({
      id: messageId,
      ticketId,
      messageType: msg.type,
      authorTenantUserId,
      authorUserId,
      authorName,
      content: msg.content,
      isInternal: msg.isInternal ?? false,
      createdAt: messageTime,
      updatedAt: messageTime,
    })
  }

  // Create AI triage if present
  if (ticketData.aiTriage) {
    await db.insert(schema.ticketAiTriage).values({
      id: generateId(),
      ticketId,
      category: ticketData.aiTriage.category,
      sentiment: ticketData.aiTriage.sentiment,
      urgencyScore: ticketData.aiTriage.urgencyScore,
      suggestedAction: ticketData.aiTriage.suggestedAction,
      suggestedPlaybook: ticketData.aiTriage.suggestedPlaybook,
      confidence: 85,
    })
  }

  logSuccess(`Ticket #${ticketNumber}: ${ticketData.title} (${ticketData.status})`)
}

// ============================================================================
// Main Seed Function
// ============================================================================

async function seed(): Promise<void> {
  validateEnv()

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
  })
  const db = drizzle(pool, { schema })

  console.log('🌱 Starting database seed...')
  console.log('═'.repeat(60))

  try {
    // Store org IDs for later use
    const staffOrgIds: Record<string, string> = {}
    // Map support staff emails to their IDs and names
    const supportStaffMap = new Map<string, { id: string; name: string }>()
    // Map tenant user keys (orgSlug:email) to their IDs and info
    const tenantUserMap = new Map<string, { id: string; name: string; tenantOrgName: string }>()

    // ========================================================================
    // Seed Support Staff Organizations (with login)
    // ========================================================================
    console.log('\n📋 SUPPORT STAFF ORGANIZATIONS (can log in)')
    console.log('─'.repeat(60))

    for (const org of supportStaffOrgs) {
      logSection(`${org.name} (${org.slug})`)
      console.log(`   ${org.description}`)

      const orgId = await ensureOrganization(db, org.name, org.slug)
      staffOrgIds[org.slug] = orgId

      for (const user of org.users) {
        const userId = await ensureSupportStaffUser(db, orgId, user)
        supportStaffMap.set(user.email, { id: userId, name: user.name })
      }

      await ensureSampleTodos(db, orgId, org.name)
    }

    // ========================================================================
    // Seed Tenant Customer Organizations (no login)
    // ========================================================================
    console.log('\n\n📋 TENANT CUSTOMER ORGANIZATIONS (cannot log in)')
    console.log('─'.repeat(60))

    for (const staffOrgSlug of Object.keys(tenantOrgsPerStaff)) {
      const staffOrgId = staffOrgIds[staffOrgSlug]
      if (!staffOrgId) {
        console.error(`   ⚠ Staff org not found: ${staffOrgSlug}`)
        continue
      }

      console.log(`\n   For support staff: ${staffOrgSlug}`)
      console.log('   ' + '─'.repeat(40))

      for (const tenantOrg of tenantOrgsPerStaff[staffOrgSlug]) {
        logSection(`${tenantOrg.name} (${tenantOrg.slug})`)
        console.log(`   ${tenantOrg.description}`)

        const tenantOrgId = await ensureTenantOrganization(db, staffOrgId, tenantOrg)

        for (const user of tenantOrg.users) {
          const userId = await ensureTenantUser(db, tenantOrgId, user)
          tenantUserMap.set(`${tenantOrg.slug}:${user.email}`, {
            id: userId,
            name: user.name,
            tenantOrgName: tenantOrg.name,
          })
        }
      }
    }

    // ========================================================================
    // Seed Support Tickets
    // ========================================================================
    console.log('\n\n📋 SUPPORT TICKETS')
    console.log('─'.repeat(60))

    for (const staffOrgSlug of Object.keys(ticketsPerStaff)) {
      const staffOrgId = staffOrgIds[staffOrgSlug]
      if (!staffOrgId) {
        console.error(`   ⚠ Staff org not found for tickets: ${staffOrgSlug}`)
        continue
      }

      console.log(`\n   For support staff: ${staffOrgSlug}`)
      console.log('   ' + '─'.repeat(40))

      for (const ticketData of ticketsPerStaff[staffOrgSlug]) {
        await ensureTicket(db, staffOrgId, ticketData, tenantUserMap, supportStaffMap)
      }
    }

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n\n' + '═'.repeat(60))
    console.log('✅ Seed completed successfully!')
    console.log('═'.repeat(60))

    console.log('\n📋 SUPPORT STAFF CREDENTIALS (password: password123)')
    console.log('─'.repeat(60))
    for (const org of supportStaffOrgs) {
      console.log(`\n🏢 ${org.name} (/${org.slug}/app/support)`)
      for (const user of org.users) {
        console.log(`   • ${user.email} (${user.role})`)
      }
    }

    console.log('\n\n📋 TENANT CUSTOMER ORGANIZATIONS (for ticket testing)')
    console.log('─'.repeat(60))
    for (const staffOrgSlug of Object.keys(tenantOrgsPerStaff)) {
      console.log(`\n   Support Staff: ${staffOrgSlug}`)
      for (const org of tenantOrgsPerStaff[staffOrgSlug]) {
        console.log(`   🏢 ${org.name}`)
        console.log(`      Users: ${org.users.map((u) => u.name).join(', ')}`)
      }
    }

    console.log('\n\n📋 SAMPLE TICKETS')
    console.log('─'.repeat(60))
    for (const staffOrgSlug of Object.keys(ticketsPerStaff)) {
      console.log(`\n   Support Staff: ${staffOrgSlug}`)
      for (const ticket of ticketsPerStaff[staffOrgSlug]) {
        const statusIcon = ticket.status === 'closed' ? '✓' : ticket.status === 'open' ? '○' : '◐'
        console.log(`   ${statusIcon} ${ticket.title} (${ticket.priority}, ${ticket.status})`)
      }
    }

    console.log('\n')
  } catch (error) {
    console.error('\n❌ Seed failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the seed
seed()
