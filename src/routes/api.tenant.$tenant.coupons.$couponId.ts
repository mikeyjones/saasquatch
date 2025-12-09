import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import { coupon, productPlan, organization } from '@/db/schema'
import { eq, and, or } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/tenant/$tenant/coupons/$couponId')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/coupons/:couponId
       * Get a single coupon by ID
       */
      GET: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const { tenant, couponId } = params

          // Get organization
          const org = await db
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.slug, tenant))
            .limit(1)

          if (org.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Organization not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Get coupon
          const result = await db
            .select({
              id: coupon.id,
              code: coupon.code,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              applicablePlanIds: coupon.applicablePlanIds,
              maxRedemptions: coupon.maxRedemptions,
              redemptionCount: coupon.redemptionCount,
              status: coupon.status,
              expiresAt: coupon.expiresAt,
              createdAt: coupon.createdAt,
              updatedAt: coupon.updatedAt,
            })
            .from(coupon)
            .where(
              and(
                eq(coupon.id, couponId),
                eq(coupon.organizationId, orgId)
              )
            )
            .limit(1)

          if (result.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Coupon not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const c = result[0]

          return new Response(
            JSON.stringify({
              coupon: {
                ...c,
                applicablePlanIds: c.applicablePlanIds ? JSON.parse(c.applicablePlanIds) : null,
                expiresAt: c.expiresAt?.toISOString() || null,
                createdAt: c.createdAt.toISOString(),
                updatedAt: c.updatedAt.toISOString(),
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error fetching coupon:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * PUT /api/tenant/:tenant/coupons/:couponId
       * Update a coupon
       * Body: Same as POST but all fields optional except those being updated
       */
      PUT: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const { tenant, couponId } = params

          // Get organization
          const org = await db
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.slug, tenant))
            .limit(1)

          if (org.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Organization not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Check coupon exists
          const existing = await db
            .select({ id: coupon.id })
            .from(coupon)
            .where(
              and(
                eq(coupon.id, couponId),
                eq(coupon.organizationId, orgId)
              )
            )
            .limit(1)

          if (existing.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Coupon not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Parse request body
          const body = await request.json()
          const {
            discountType,
            discountValue,
            applicablePlanIds,
            maxRedemptions,
            expiresAt,
            status,
          } = body as {
            discountType?: string
            discountValue?: number
            applicablePlanIds?: string[] | null
            maxRedemptions?: number | null
            expiresAt?: string | null
            status?: string
          }

          // Build update object
          const updateData: {
            discountType?: string
            discountValue?: number
            applicablePlanIds?: string | null
            maxRedemptions?: number | null
            expiresAt?: Date | null
            status?: string
            updatedAt: Date
          } = {
            updatedAt: new Date(),
          }

          if (discountType !== undefined) {
            if (!['percentage', 'fixed_amount', 'free_months', 'trial_extension'].includes(discountType)) {
              return new Response(
                JSON.stringify({ error: 'Invalid discount type' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
              )
            }
            updateData.discountType = discountType
          }

          if (discountValue !== undefined) {
            if (discountValue < 0) {
              return new Response(
                JSON.stringify({ error: 'Invalid discount value' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
              )
            }
            if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
              return new Response(
                JSON.stringify({ error: 'Percentage discount must be between 0 and 100' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
              )
            }
            updateData.discountValue = discountValue
          }

          if (applicablePlanIds !== undefined) {
            if (applicablePlanIds && applicablePlanIds.length > 0) {
              // Validate plan IDs
              const plans = await db
                .select({ id: productPlan.id })
                .from(productPlan)
                .where(
                  and(
                    eq(productPlan.organizationId, orgId),
                    or(...applicablePlanIds.map((id) => eq(productPlan.id, id)))
                  )
                )

              if (plans.length !== applicablePlanIds.length) {
                return new Response(
                  JSON.stringify({ error: 'One or more plan IDs are invalid' }),
                  { status: 400, headers: { 'Content-Type': 'application/json' } }
                )
              }
              updateData.applicablePlanIds = JSON.stringify(applicablePlanIds)
            } else {
              updateData.applicablePlanIds = null
            }
          }

          if (maxRedemptions !== undefined) {
            updateData.maxRedemptions = maxRedemptions
          }

          if (expiresAt !== undefined) {
            updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
          }

          if (status !== undefined) {
            if (!['active', 'disabled'].includes(status)) {
              return new Response(
                JSON.stringify({ error: 'Invalid status' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
              )
            }
            updateData.status = status
          }

          // Update coupon
          await db
            .update(coupon)
            .set(updateData)
            .where(
              and(
                eq(coupon.id, couponId),
                eq(coupon.organizationId, orgId)
              )
            )

          return new Response(
            JSON.stringify({ message: 'Coupon updated successfully' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error updating coupon:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * DELETE /api/tenant/:tenant/coupons/:couponId
       * Disable a coupon (soft delete)
       */
      DELETE: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const { tenant, couponId } = params

          // Get organization
          const org = await db
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.slug, tenant))
            .limit(1)

          if (org.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Organization not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Check coupon exists
          const existing = await db
            .select({ id: coupon.id })
            .from(coupon)
            .where(
              and(
                eq(coupon.id, couponId),
                eq(coupon.organizationId, orgId)
              )
            )
            .limit(1)

          if (existing.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Coupon not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Disable coupon (soft delete)
          await db
            .update(coupon)
            .set({ status: 'disabled', updatedAt: new Date() })
            .where(
              and(
                eq(coupon.id, couponId),
                eq(coupon.organizationId, orgId)
              )
            )

          return new Response(
            JSON.stringify({ message: 'Coupon disabled successfully' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error deleting coupon:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})
