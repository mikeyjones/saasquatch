import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  ticket,
  ticketMessage,
  ticketAiTriage,
  tenantUser,
  tenantOrganization,
  organization,
  user,
} from '@/db/schema'
import { eq, and, desc, or, ilike } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/tenant/$tenant/tickets')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/tickets
       * Fetch all tickets for the tenant organization
       */
      GET: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized', tickets: [] }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Get the organization by slug
          const org = await db
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.slug, params.tenant))
            .limit(1)

          if (org.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Organization not found', tickets: [] }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Parse query params
          const url = new URL(request.url)
          const status = url.searchParams.get('status')
          const priority = url.searchParams.get('priority')
          const search = url.searchParams.get('search')

          // Build query conditions
          const conditions = [eq(ticket.organizationId, orgId)]

          if (status && status !== 'all') {
            conditions.push(eq(ticket.status, status))
          }

          if (priority && priority !== 'all') {
            conditions.push(eq(ticket.priority, priority))
          }

          // Fetch tickets with tenant user info
          const tickets = await db
            .select({
              id: ticket.id,
              ticketNumber: ticket.ticketNumber,
              title: ticket.title,
              status: ticket.status,
              priority: ticket.priority,
              channel: ticket.channel,
              assignedToAI: ticket.assignedToAI,
              assignedToUserId: ticket.assignedToUserId,
              createdAt: ticket.createdAt,
              updatedAt: ticket.updatedAt,
              resolvedAt: ticket.resolvedAt,
              tenantUserId: ticket.tenantUserId,
              tenantUserName: tenantUser.name,
              tenantUserEmail: tenantUser.email,
              tenantOrgName: tenantOrganization.name,
            })
            .from(ticket)
            .leftJoin(tenantUser, eq(ticket.tenantUserId, tenantUser.id))
            .leftJoin(
              tenantOrganization,
              eq(tenantUser.tenantOrganizationId, tenantOrganization.id)
            )
            .where(and(...conditions))
            .orderBy(desc(ticket.createdAt))

          // Apply search filter if provided (in memory for simplicity)
          let filteredTickets = tickets
          if (search) {
            const searchLower = search.toLowerCase()
            filteredTickets = tickets.filter(
              (t) =>
                t.title.toLowerCase().includes(searchLower) ||
                t.tenantUserName?.toLowerCase().includes(searchLower) ||
                t.tenantOrgName?.toLowerCase().includes(searchLower) ||
                `#${t.ticketNumber}`.includes(searchLower)
            )
          }

          // Get first message for each ticket (for preview)
          const ticketIds = filteredTickets.map((t) => t.id)
          const messages =
            ticketIds.length > 0
              ? await db
                  .select({
                    ticketId: ticketMessage.ticketId,
                    content: ticketMessage.content,
                  })
                  .from(ticketMessage)
                  .where(
                    and(
                      or(...ticketIds.map((id) => eq(ticketMessage.ticketId, id))),
                      eq(ticketMessage.messageType, 'customer')
                    )
                  )
                  .orderBy(ticketMessage.createdAt)
              : []

          // Get AI triage for tickets
          const triages =
            ticketIds.length > 0
              ? await db
                  .select()
                  .from(ticketAiTriage)
                  .where(or(...ticketIds.map((id) => eq(ticketAiTriage.ticketId, id))))
              : []

          // Build response
          const response = filteredTickets.map((t) => {
            const firstMessage = messages.find((m) => m.ticketId === t.id)
            const triage = triages.find((tr) => tr.ticketId === t.id)

            return {
              id: t.id,
              ticketNumber: `#${t.ticketNumber}`,
              title: t.title,
              status: t.status,
              priority: t.priority,
              channel: t.channel,
              hasAI: t.assignedToAI,
              timeAgo: formatTimeAgo(t.createdAt),
              preview: firstMessage
                ? firstMessage.content.slice(0, 60) +
                  (firstMessage.content.length > 60 ? '...' : '')
                : '',
              company: t.tenantOrgName || 'Unknown',
              customer: {
                name: t.tenantUserName || 'Unknown',
                company: t.tenantOrgName || 'Unknown',
                initials: getInitials(t.tenantUserName || 'U'),
              },
              aiTriage: triage
                ? {
                    category: triage.category,
                    sentiment: triage.sentiment,
                    suggestedAction: triage.suggestedAction,
                    playbook: triage.suggestedPlaybook,
                    playbookLink: triage.suggestedPlaybookLink || '#',
                  }
                : undefined,
            }
          })

          return new Response(JSON.stringify({ tickets: response }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching tickets:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error', tickets: [] }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * POST /api/tenant/:tenant/tickets
       * Create a new ticket
       */
      POST: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // Get the organization by slug
          const org = await db
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.slug, params.tenant))
            .limit(1)

          if (org.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Organization not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Parse request body
          const body = await request.json()
          const { title, priority, message, customerId } = body as {
            title: string
            priority: 'low' | 'normal' | 'high' | 'urgent'
            message: string
            customerId: string
          }

          if (!title || !message || !customerId) {
            return new Response(
              JSON.stringify({ error: 'Missing required fields' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Get customer info
          const customer = await db
            .select({
              id: tenantUser.id,
              name: tenantUser.name,
              tenantOrgName: tenantOrganization.name,
            })
            .from(tenantUser)
            .leftJoin(
              tenantOrganization,
              eq(tenantUser.tenantOrganizationId, tenantOrganization.id)
            )
            .where(eq(tenantUser.id, customerId))
            .limit(1)

          if (customer.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Customer not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Get next ticket number
          const lastTicket = await db
            .select({ ticketNumber: ticket.ticketNumber })
            .from(ticket)
            .where(eq(ticket.organizationId, orgId))
            .orderBy(desc(ticket.ticketNumber))
            .limit(1)

          const nextNumber = (lastTicket[0]?.ticketNumber ?? 9900) + 1

          // Create ticket
          const ticketId = crypto.randomUUID().replace(/-/g, '').substring(0, 24)
          const now = new Date()

          await db.insert(ticket).values({
            id: ticketId,
            organizationId: orgId,
            ticketNumber: nextNumber,
            tenantUserId: customerId,
            title,
            status: 'open',
            priority: priority || 'normal',
            channel: 'web',
            createdAt: now,
            updatedAt: now,
          })

          // Create initial message
          const messageId = crypto.randomUUID().replace(/-/g, '').substring(0, 24)
          await db.insert(ticketMessage).values({
            id: messageId,
            ticketId,
            messageType: 'customer',
            authorTenantUserId: customerId,
            authorName: customer[0].name,
            content: message,
            isInternal: false,
            createdAt: now,
            updatedAt: now,
          })

          return new Response(
            JSON.stringify({
              success: true,
              ticket: {
                id: ticketId,
                ticketNumber: `#${nextNumber}`,
                title,
                status: 'open',
                priority,
                company: customer[0].tenantOrgName,
                customer: {
                  name: customer[0].name,
                  company: customer[0].tenantOrgName,
                  initials: getInitials(customer[0].name),
                },
              },
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error creating ticket:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}


