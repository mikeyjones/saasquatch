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
import { eq, and, asc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/tenant/$tenant/tickets/$ticketId')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/tickets/:ticketId
       * Fetch a single ticket with all messages
       */
      GET: async ({ request, params }) => {
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

          // Fetch ticket with tenant user info
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
              slaDeadline: ticket.slaDeadline,
              firstResponseAt: ticket.firstResponseAt,
              tenantUserId: ticket.tenantUserId,
              tenantUserName: tenantUser.name,
              tenantUserEmail: tenantUser.email,
              tenantOrgName: tenantOrganization.name,
              tenantOrgSubscriptionPlan: tenantOrganization.subscriptionPlan,
              tenantOrgSubscriptionStatus: tenantOrganization.subscriptionStatus,
            })
            .from(ticket)
            .leftJoin(tenantUser, eq(ticket.tenantUserId, tenantUser.id))
            .leftJoin(
              tenantOrganization,
              eq(tenantUser.tenantOrganizationId, tenantOrganization.id)
            )
            .where(
              and(eq(ticket.organizationId, orgId), eq(ticket.id, params.ticketId))
            )
            .limit(1)

          if (tickets.length === 0) {
            return new Response(JSON.stringify({ error: 'Ticket not found' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const t = tickets[0]

          // Fetch all messages for this ticket
          const messages = await db
            .select({
              id: ticketMessage.id,
              messageType: ticketMessage.messageType,
              authorName: ticketMessage.authorName,
              authorTenantUserId: ticketMessage.authorTenantUserId,
              authorUserId: ticketMessage.authorUserId,
              content: ticketMessage.content,
              isInternal: ticketMessage.isInternal,
              createdAt: ticketMessage.createdAt,
            })
            .from(ticketMessage)
            .where(eq(ticketMessage.ticketId, params.ticketId))
            .orderBy(asc(ticketMessage.createdAt))

          // Fetch AI triage
          const triages = await db
            .select()
            .from(ticketAiTriage)
            .where(eq(ticketAiTriage.ticketId, params.ticketId))
            .limit(1)

          const triage = triages[0]

          // Get assigned user info if assigned
          let assignedTo = null
          if (t.assignedToUserId) {
            const assignedUsers = await db
              .select({ id: user.id, name: user.name, email: user.email })
              .from(user)
              .where(eq(user.id, t.assignedToUserId))
              .limit(1)
            if (assignedUsers.length > 0) {
              assignedTo = assignedUsers[0]
            }
          }

          // Build response
          const response = {
            id: t.id,
            ticketNumber: `#${t.ticketNumber}`,
            title: t.title,
            status: t.status,
            priority: t.priority,
            channel: t.channel,
            hasAI: t.assignedToAI,
            timeAgo: formatTimeAgo(t.createdAt),
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString(),
            resolvedAt: t.resolvedAt?.toISOString(),
            slaDeadline: t.slaDeadline?.toISOString(),
            firstResponseAt: t.firstResponseAt?.toISOString(),
            company: t.tenantOrgName || 'Unknown',
            customer: {
              id: t.tenantUserId,
              name: t.tenantUserName || 'Unknown',
              email: t.tenantUserEmail || '',
              company: t.tenantOrgName || 'Unknown',
              initials: getInitials(t.tenantUserName || 'U'),
              subscriptionPlan: t.tenantOrgSubscriptionPlan,
              subscriptionStatus: t.tenantOrgSubscriptionStatus,
            },
            assignedTo: assignedTo
              ? {
                  id: assignedTo.id,
                  name: assignedTo.name,
                  email: assignedTo.email,
                  initials: getInitials(assignedTo.name),
                }
              : null,
            messages: messages.map((m) => ({
              id: m.id,
              type: m.messageType as 'customer' | 'agent' | 'ai' | 'system',
              author: m.authorName,
              timestamp: formatTimeAgo(m.createdAt),
              createdAt: m.createdAt.toISOString(),
              content: m.content,
              isInternal: m.isInternal,
            })),
            aiTriage: triage
              ? {
                  category: triage.category,
                  sentiment: triage.sentiment,
                  urgencyScore: triage.urgencyScore,
                  suggestedAction: triage.suggestedAction,
                  playbook: triage.suggestedPlaybook,
                  playbookLink: triage.suggestedPlaybookLink || '#',
                  summary: triage.summary,
                  draftResponse: triage.draftResponse,
                  confidence: triage.confidence,
                }
              : undefined,
          }

          return new Response(JSON.stringify({ ticket: response }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching ticket:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * PATCH /api/tenant/:tenant/tickets/:ticketId
       * Update ticket status, priority, or assignment
       */
      PATCH: async ({ request, params }) => {
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
          const { status, priority, assignedToUserId } = body as {
            status?: string
            priority?: string
            assignedToUserId?: string | null
          }

          // Build update object
          const updates: Record<string, unknown> = {
            updatedAt: new Date(),
          }

          if (status) {
            updates.status = status
            if (status === 'closed') {
              updates.resolvedAt = new Date()
            }
          }

          if (priority) {
            updates.priority = priority
          }

          if (assignedToUserId !== undefined) {
            updates.assignedToUserId = assignedToUserId
          }

          // Update ticket
          await db
            .update(ticket)
            .set(updates)
            .where(
              and(eq(ticket.organizationId, orgId), eq(ticket.id, params.ticketId))
            )

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error updating ticket:', error)
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

