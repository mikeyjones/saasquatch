import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  tenantOrganization,
  organization,
  tenantUser,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

// Generate a unique ID
function generateId(): string {
  return `contact_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export const Route = createFileRoute('/api/tenant/$tenant/crm/customers/$customerId/contacts')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/crm/customers/:customerId/contacts
       * Fetch all contacts for a specific customer
       */
      GET: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized', contacts: [] }),
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
              JSON.stringify({ error: 'Organization not found', contacts: [] }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Verify customer exists and belongs to this organization
          const customer = await db
            .select({ id: tenantOrganization.id, name: tenantOrganization.name })
            .from(tenantOrganization)
            .where(
              and(
                eq(tenantOrganization.id, params.customerId),
                eq(tenantOrganization.organizationId, orgId)
              )
            )
            .limit(1)

          if (customer.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Customer not found', contacts: [] }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Fetch contacts for this customer
          const contacts = await db
            .select({
              id: tenantUser.id,
              name: tenantUser.name,
              email: tenantUser.email,
              phone: tenantUser.phone,
              avatarUrl: tenantUser.avatarUrl,
              title: tenantUser.title,
              role: tenantUser.role,
              isOwner: tenantUser.isOwner,
              status: tenantUser.status,
              notes: tenantUser.notes,
              lastActivityAt: tenantUser.lastActivityAt,
              createdAt: tenantUser.createdAt,
              updatedAt: tenantUser.updatedAt,
            })
            .from(tenantUser)
            .where(eq(tenantUser.tenantOrganizationId, params.customerId))

          const formattedContacts = contacts.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            avatarUrl: c.avatarUrl,
            title: c.title,
            role: c.role,
            isOwner: c.isOwner,
            status: c.status,
            notes: c.notes,
            lastActivityAt: c.lastActivityAt?.toISOString() || null,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
          }))

          return new Response(
            JSON.stringify({
              contacts: formattedContacts,
              customer: {
                id: customer[0].id,
                name: customer[0].name,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error fetching contacts:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error', contacts: [] }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * POST /api/tenant/:tenant/crm/customers/:customerId/contacts
       * Create a new contact for a customer
       * Body:
       * - name (required) - Contact name
       * - email (required) - Contact email
       * - phone (optional)
       * - title (optional) - Job title
       * - role (optional) - 'owner' | 'admin' | 'user' | 'viewer', defaults to 'user'
       * - avatarUrl (optional)
       * - notes (optional)
       * - isOwner (optional) - Boolean, defaults to false
       */
      POST: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized' }),
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
              JSON.stringify({ error: 'Organization not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Verify customer exists and belongs to this organization
          const customer = await db
            .select({ id: tenantOrganization.id, name: tenantOrganization.name })
            .from(tenantOrganization)
            .where(
              and(
                eq(tenantOrganization.id, params.customerId),
                eq(tenantOrganization.organizationId, orgId)
              )
            )
            .limit(1)

          if (customer.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Customer not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Parse request body
          const body = await request.json()
          const {
            name,
            email,
            phone,
            title,
            role,
            avatarUrl,
            notes,
            isOwner,
          } = body as {
            name?: string
            email?: string
            phone?: string
            title?: string
            role?: string
            avatarUrl?: string
            notes?: string
            isOwner?: boolean
          }

          // Validate required fields
          if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return new Response(
              JSON.stringify({ error: 'Name is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          if (!email || typeof email !== 'string' || email.trim().length === 0) {
            return new Response(
              JSON.stringify({ error: 'Email is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Basic email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(email.trim())) {
            return new Response(
              JSON.stringify({ error: 'Invalid email format' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Validate role if provided
          const validRoles = ['owner', 'admin', 'user', 'viewer']
          const contactRole = role && validRoles.includes(role) ? role : 'user'

          const now = new Date()
          const contactId = generateId()

          // Create the contact
          await db.insert(tenantUser).values({
            id: contactId,
            tenantOrganizationId: params.customerId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone?.trim() || null,
            title: title?.trim() || null,
            role: contactRole,
            avatarUrl: avatarUrl || null,
            notes: notes?.trim() || null,
            isOwner: isOwner || false,
            status: 'active',
            createdAt: now,
            updatedAt: now,
          })

          return new Response(
            JSON.stringify({
              success: true,
              contact: {
                id: contactId,
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone?.trim() || null,
                title: title?.trim() || null,
                role: contactRole,
                avatarUrl: avatarUrl || null,
                notes: notes?.trim() || null,
                isOwner: isOwner || false,
                status: 'active',
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
              },
              customer: {
                id: customer[0].id,
                name: customer[0].name,
              },
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error creating contact:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})



