import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  deal,
  dealActivity,
  pipelineStage,
  organization,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 24)
}

export const Route = createFileRoute('/api/tenant/$tenant/deals/$dealId')({
  server: {
    handlers: {
      /**
       * PUT /api/tenant/:tenant/deals/:dealId
       * Update a deal (stage, value, assigned user, etc.)
       */
      PUT: async ({ request, params }) => {
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

          // Get the deal
          const existingDeal = await db
            .select()
            .from(deal)
            .where(
              and(
                eq(deal.id, params.dealId),
                eq(deal.organizationId, orgId)
              )
            )
            .limit(1)

          if (existingDeal.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Deal not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const currentDeal = existingDeal[0]

          // Parse request body
          const body = await request.json()
          const {
            name,
            value,
            stageId,
            assignedToUserId,
            notes,
            badges,
            nextTask,
            manualScore,
          } = body

          const now = new Date()
          const updates: Partial<typeof deal.$inferInsert> = {
            updatedAt: now,
          }

          // Track what changed for activity log
          const changes: string[] = []

          if (name !== undefined && name !== currentDeal.name) {
            updates.name = name
            changes.push(`name changed to "${name}"`)
          }

          if (value !== undefined && value !== currentDeal.value) {
            updates.value = value
            changes.push(`value changed to $${(value / 100).toLocaleString()}`)
          }

          if (stageId !== undefined && stageId !== currentDeal.stageId) {
            // Get old and new stage names
            const [oldStage, newStage] = await Promise.all([
              db
                .select({ name: pipelineStage.name })
                .from(pipelineStage)
                .where(eq(pipelineStage.id, currentDeal.stageId))
                .limit(1),
              db
                .select({ name: pipelineStage.name })
                .from(pipelineStage)
                .where(eq(pipelineStage.id, stageId))
                .limit(1),
            ])

            updates.stageId = stageId
            const oldStageName = oldStage[0]?.name || 'Unknown'
            const newStageName = newStage[0]?.name || 'Unknown'
            changes.push(`stage moved from "${oldStageName}" to "${newStageName}"`)

            // Create stage change activity
            await db.insert(dealActivity).values({
              id: generateId(),
              dealId: params.dealId,
              activityType: 'stage_change',
              description: `Deal moved from "${oldStageName}" to "${newStageName}"`,
              userId: session.user.id,
              metadata: JSON.stringify({
                oldStageId: currentDeal.stageId,
                oldStageName,
                newStageId: stageId,
                newStageName,
              }),
              createdAt: now,
            })
          }

          if (assignedToUserId !== undefined && assignedToUserId !== currentDeal.assignedToUserId) {
            updates.assignedToUserId = assignedToUserId || null
            changes.push('assignment changed')
          }

          if (notes !== undefined && notes !== currentDeal.notes) {
            updates.notes = notes
            changes.push('notes updated')
          }

          if (badges !== undefined) {
            updates.badges = JSON.stringify(badges)
            changes.push('badges updated')
          }

          if (nextTask !== undefined && nextTask !== currentDeal.nextTask) {
            updates.nextTask = nextTask
            changes.push('next task updated')
          }

          if (manualScore !== undefined && manualScore !== currentDeal.manualScore) {
            updates.manualScore = manualScore
            changes.push(`manual score set to ${manualScore}`)
          }

          // Apply updates
          if (Object.keys(updates).length > 1) {
            // More than just updatedAt
            await db
              .update(deal)
              .set(updates)
              .where(eq(deal.id, params.dealId))

            // Create general update activity if there were non-stage changes
            const nonStageChanges = changes.filter(
              (c) => !c.startsWith('stage moved')
            )
            if (nonStageChanges.length > 0) {
              await db.insert(dealActivity).values({
                id: generateId(),
                dealId: params.dealId,
                activityType: 'deal_updated',
                description: `Deal updated: ${nonStageChanges.join(', ')}`,
                userId: session.user.id,
                metadata: JSON.stringify({ changes: nonStageChanges }),
                createdAt: now,
              })
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              changes,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error updating deal:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * DELETE /api/tenant/:tenant/deals/:dealId
       * Delete a deal
       */
      DELETE: async ({ request, params }) => {
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

          // Delete the deal (cascades to contacts and activities)
          const result = await db
            .delete(deal)
            .where(
              and(
                eq(deal.id, params.dealId),
                eq(deal.organizationId, orgId)
              )
            )

          return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error deleting deal:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})




