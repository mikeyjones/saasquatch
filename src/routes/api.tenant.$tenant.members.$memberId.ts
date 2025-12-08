import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import { tenantUser, tenantOrganization, organization, auditLog, member } from '@/db/schema'
import { eq, and, ne, count } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { nanoid } from 'nanoid'

export const Route = createFileRoute('/api/tenant/$tenant/members/$memberId')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/members/:memberId
       * Fetch a single member with full details including organization info
       */
      GET: async ({ request, params }) => {
        try {
          // Get session from Better Auth
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

          // Fetch member with organization details
          const member = await db
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
              lastActivityAt: tenantUser.lastActivityAt,
              notes: tenantUser.notes,
              createdAt: tenantUser.createdAt,
              updatedAt: tenantUser.updatedAt,
              // Organization info
              organizationId: tenantOrganization.id,
              organizationName: tenantOrganization.name,
              organizationSlug: tenantOrganization.slug,
              organizationLogo: tenantOrganization.logo,
              organizationIndustry: tenantOrganization.industry,
              organizationWebsite: tenantOrganization.website,
              organizationSubscriptionStatus: tenantOrganization.subscriptionStatus,
              organizationSubscriptionPlan: tenantOrganization.subscriptionPlan,
            })
            .from(tenantUser)
            .innerJoin(
              tenantOrganization,
              eq(tenantUser.tenantOrganizationId, tenantOrganization.id)
            )
            .where(
              and(
                eq(tenantUser.id, params.memberId),
                eq(tenantOrganization.organizationId, orgId)
              )
            )
            .limit(1)

          if (member.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Member not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const m = member[0]

          return new Response(
            JSON.stringify({
              member: {
                id: m.id,
                name: m.name,
                email: m.email,
                phone: m.phone,
                avatarUrl: m.avatarUrl,
                title: m.title,
                role: m.role,
                isOwner: m.isOwner,
                status: m.status,
                lastActivityAt: m.lastActivityAt?.toISOString() || null,
                notes: m.notes,
                createdAt: m.createdAt.toISOString(),
                updatedAt: m.updatedAt.toISOString(),
              },
              organization: {
                id: m.organizationId,
                name: m.organizationName,
                slug: m.organizationSlug,
                logo: m.organizationLogo,
                industry: m.organizationIndustry,
                website: m.organizationWebsite,
                subscriptionStatus: m.organizationSubscriptionStatus,
                subscriptionPlan: m.organizationSubscriptionPlan,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error fetching member:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * PUT /api/tenant/:tenant/members/:memberId
       * Update member details with role management, authorization, and audit logging
       */
      PUT: async ({ request, params }) => {
        try {
          // Get session from Better Auth
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

          // Check if current user is a support staff member of this organization
          const supportMember = await db
            .select({ role: member.role })
            .from(member)
            .where(
              and(
                eq(member.organizationId, orgId),
                eq(member.userId, session.user.id)
              )
            )
            .limit(1)

          if (supportMember.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Forbidden: Not a support staff member' }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Fetch existing member with organization details
          const existingMemberData = await db
            .select({
              id: tenantUser.id,
              name: tenantUser.name,
              email: tenantUser.email,
              phone: tenantUser.phone,
              title: tenantUser.title,
              role: tenantUser.role,
              isOwner: tenantUser.isOwner,
              status: tenantUser.status,
              notes: tenantUser.notes,
              tenantOrganizationId: tenantUser.tenantOrganizationId,
            })
            .from(tenantUser)
            .innerJoin(
              tenantOrganization,
              eq(tenantUser.tenantOrganizationId, tenantOrganization.id)
            )
            .where(
              and(
                eq(tenantUser.id, params.memberId),
                eq(tenantOrganization.organizationId, orgId)
              )
            )
            .limit(1)

          if (existingMemberData.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Member not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const existingMember = existingMemberData[0]

          // Parse request body
          const body = await request.json()
          const {
            name,
            email,
            phone,
            title,
            role,
            status,
            notes,
          } = body as {
            name?: string
            email?: string
            phone?: string
            title?: string
            role?: string
            status?: string
            notes?: string
          }

          // Build update object with only provided fields
          const updateData: {
            name?: string
            email?: string
            phone?: string | null
            title?: string | null
            role?: string
            isOwner?: boolean
            status?: string
            notes?: string | null
            updatedAt: Date
          } = {
            updatedAt: new Date(),
          }

          // Track changes for audit log
          const auditLogs: Array<{
            fieldName: string
            oldValue: string | null
            newValue: string | null
          }> = []

          if (name !== undefined && typeof name === 'string' && name.trim().length > 0) {
            const newName = name.trim()
            if (newName !== existingMember.name) {
              updateData.name = newName
              auditLogs.push({
                fieldName: 'name',
                oldValue: existingMember.name,
                newValue: newName,
              })
            }
          }

          if (email !== undefined && typeof email === 'string' && email.trim().length > 0) {
            const newEmail = email.trim().toLowerCase()
            if (newEmail !== existingMember.email) {
              updateData.email = newEmail
              auditLogs.push({
                fieldName: 'email',
                oldValue: existingMember.email,
                newValue: newEmail,
              })
            }
          }

          if (phone !== undefined) {
            const newPhone = phone && phone.trim().length > 0 ? phone.trim() : null
            if (newPhone !== existingMember.phone) {
              updateData.phone = newPhone
              auditLogs.push({
                fieldName: 'phone',
                oldValue: existingMember.phone,
                newValue: newPhone,
              })
            }
          }

          if (title !== undefined) {
            const newTitle = title && title.trim().length > 0 ? title.trim() : null
            if (newTitle !== existingMember.title) {
              updateData.title = newTitle
              auditLogs.push({
                fieldName: 'title',
                oldValue: existingMember.title,
                newValue: newTitle,
              })
            }
          }

          // Role change validation and synchronization
          if (role !== undefined && ['owner', 'admin', 'user', 'viewer'].includes(role)) {
            if (role !== existingMember.role) {
              // If changing FROM owner role, ensure at least one other owner exists
              if (existingMember.isOwner || existingMember.role === 'owner') {
                // Count other owners in the same tenant organization
                const ownerCount = await db
                  .select({ count: count() })
                  .from(tenantUser)
                  .where(
                    and(
                      eq(tenantUser.tenantOrganizationId, existingMember.tenantOrganizationId),
                      eq(tenantUser.isOwner, true),
                      ne(tenantUser.id, params.memberId)
                    )
                  )

                if (ownerCount[0].count === 0) {
                  return new Response(
                    JSON.stringify({
                      error: 'Cannot change role: This is the last owner. At least one owner must remain.'
                    }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                  )
                }
              }

              // Update role and synchronize isOwner flag
              updateData.role = role
              updateData.isOwner = role === 'owner'

              auditLogs.push({
                fieldName: 'role',
                oldValue: existingMember.role,
                newValue: role,
              })

              // Track isOwner change if it differs
              if (updateData.isOwner !== existingMember.isOwner) {
                auditLogs.push({
                  fieldName: 'isOwner',
                  oldValue: existingMember.isOwner ? 'true' : 'false',
                  newValue: updateData.isOwner ? 'true' : 'false',
                })
              }
            }
          }

          if (status !== undefined && ['active', 'suspended', 'invited'].includes(status)) {
            if (status !== existingMember.status) {
              updateData.status = status
              auditLogs.push({
                fieldName: 'status',
                oldValue: existingMember.status,
                newValue: status,
              })
            }
          }

          if (notes !== undefined) {
            const newNotes = notes && notes.trim().length > 0 ? notes.trim() : null
            if (newNotes !== existingMember.notes) {
              updateData.notes = newNotes
              auditLogs.push({
                fieldName: 'notes',
                oldValue: existingMember.notes,
                newValue: newNotes,
              })
            }
          }

          // Only update if there are changes
          if (Object.keys(updateData).length > 1) { // > 1 because updatedAt is always present
            // Update member
            await db
              .update(tenantUser)
              .set(updateData)
              .where(eq(tenantUser.id, params.memberId))

            // Create audit log entries
            for (const log of auditLogs) {
              await db.insert(auditLog).values({
                id: nanoid(),
                organizationId: orgId,
                tenantOrganizationId: existingMember.tenantOrganizationId,
                performedByUserId: session.user.id,
                performedByName: session.user.name,
                entityType: 'tenant_user',
                entityId: params.memberId,
                action: `${log.fieldName}_changed`,
                fieldName: log.fieldName,
                oldValue: log.oldValue,
                newValue: log.newValue,
              })
            }
          }

          // Fetch updated member
          const updatedMember = await db
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
              lastActivityAt: tenantUser.lastActivityAt,
              notes: tenantUser.notes,
              createdAt: tenantUser.createdAt,
              updatedAt: tenantUser.updatedAt,
            })
            .from(tenantUser)
            .where(eq(tenantUser.id, params.memberId))
            .limit(1)

          const m = updatedMember[0]

          return new Response(
            JSON.stringify({
              success: true,
              member: {
                id: m.id,
                name: m.name,
                email: m.email,
                phone: m.phone,
                avatarUrl: m.avatarUrl,
                title: m.title,
                role: m.role,
                isOwner: m.isOwner,
                status: m.status,
                lastActivityAt: m.lastActivityAt?.toISOString() || null,
                notes: m.notes,
                createdAt: m.createdAt.toISOString(),
                updatedAt: m.updatedAt.toISOString(),
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error updating member:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})
