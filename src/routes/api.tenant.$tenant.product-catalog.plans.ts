import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  productPlan,
  productPricing,
  productFeature,
  organization,
} from '@/db/schema'
import { eq, and, desc, asc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/tenant/$tenant/product-catalog/plans')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/product-catalog/plans
       * Fetch all product plans for the organization with pricing and features
       *
       * Query params:
       * - status: Filter by status (active, draft, archived)
       */
      GET: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized', plans: [] }),
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
              JSON.stringify({ error: 'Organization not found', plans: [] }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Parse query params
          const url = new URL(request.url)
          const status = url.searchParams.get('status')

          // Build query conditions
          const conditions = [eq(productPlan.organizationId, orgId)]

          if (status && status !== 'all') {
            conditions.push(eq(productPlan.status, status))
          }

          // Fetch plans
          const plans = await db
            .select({
              id: productPlan.id,
              name: productPlan.name,
              description: productPlan.description,
              status: productPlan.status,
              pricingModel: productPlan.pricingModel,
              productFamilyId: productPlan.productFamilyId,
              createdAt: productPlan.createdAt,
              updatedAt: productPlan.updatedAt,
            })
            .from(productPlan)
            .where(and(...conditions))
            .orderBy(desc(productPlan.createdAt))

          // Fetch pricing for all plans
          const planIds = plans.map((p) => p.id)
          const pricing =
            planIds.length > 0
              ? await db
                  .select()
                  .from(productPricing)
                  .where(
                    planIds.length === 1
                      ? eq(productPricing.productPlanId, planIds[0])
                      : eq(productPricing.productPlanId, planIds[0]) // Need to use inArray for multiple
                  )
              : []

          // Fetch features for all plans
          const features =
            planIds.length > 0
              ? await db
                  .select()
                  .from(productFeature)
                  .where(
                    planIds.length === 1
                      ? eq(productFeature.productPlanId, planIds[0])
                      : eq(productFeature.productPlanId, planIds[0]) // Need to use inArray for multiple
                  )
                  .orderBy(asc(productFeature.order))
              : []

          // For multiple plans, we need to fetch all pricing and features
          let allPricing = pricing
          let allFeatures = features

          if (planIds.length > 1) {
            // Fetch all pricing for all plans
            const pricingPromises = planIds.map((planId) =>
              db.select().from(productPricing).where(eq(productPricing.productPlanId, planId))
            )
            const pricingResults = await Promise.all(pricingPromises)
            allPricing = pricingResults.flat()

            // Fetch all features for all plans
            const featurePromises = planIds.map((planId) =>
              db
                .select()
                .from(productFeature)
                .where(eq(productFeature.productPlanId, planId))
                .orderBy(asc(productFeature.order))
            )
            const featureResults = await Promise.all(featurePromises)
            allFeatures = featureResults.flat()
          }

          // Group pricing and features by plan
          const pricingByPlan = new Map<string, typeof allPricing>()
          const featuresByPlan = new Map<string, typeof allFeatures>()

          for (const p of allPricing) {
            const existing = pricingByPlan.get(p.productPlanId) || []
            existing.push(p)
            pricingByPlan.set(p.productPlanId, existing)
          }

          for (const f of allFeatures) {
            const existing = featuresByPlan.get(f.productPlanId) || []
            existing.push(f)
            featuresByPlan.set(f.productPlanId, existing)
          }

          // Format response to match ProductTier interface
          const response = plans.map((plan) => {
            const planPricing = pricingByPlan.get(plan.id) || []
            const planFeatures = featuresByPlan.get(plan.id) || []

            // Find base pricing (default to first base pricing or monthly)
            const basePricing = planPricing.find(
              (p) => p.pricingType === 'base' && p.interval === 'monthly'
            ) ||
              planPricing.find((p) => p.pricingType === 'base') ||
              planPricing[0]

            // Get regional pricing
            const regionalPricing = planPricing
              .filter((p) => p.pricingType === 'regional' && p.region)
              .map((p) => ({
                region: p.region!,
                currency: p.currency,
                amount: p.amount / 100, // Convert cents to dollars for display
              }))

            return {
              id: plan.id,
              name: plan.name,
              description: plan.description || '',
              status: plan.status,
              pricingModel: plan.pricingModel,
              basePrice: basePricing
                ? {
                    amount: basePricing.amount / 100, // Convert cents to dollars
                    currency: basePricing.currency,
                    interval: (basePricing.interval as 'monthly' | 'yearly') || 'monthly',
                  }
                : {
                    amount: 0,
                    currency: 'USD',
                    interval: 'monthly' as const,
                  },
              regionalPricing,
              features: planFeatures.map((f) => f.name),
              createdAt: plan.createdAt,
              updatedAt: plan.updatedAt,
            }
          })

          return new Response(JSON.stringify({ plans: response }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching plans:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error', plans: [] }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * POST /api/tenant/:tenant/product-catalog/plans
       * Create a new product plan with pricing and features
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
          const {
            name,
            description,
            status,
            pricingModel,
            basePrice,
            regionalPricing,
            features,
          } = body as {
            name: string
            description?: string
            status?: 'active' | 'draft' | 'archived'
            pricingModel?: 'flat' | 'seat' | 'usage' | 'hybrid'
            basePrice?: {
              amount: number
              currency: string
              interval: 'monthly' | 'yearly'
            }
            regionalPricing?: Array<{
              region: string
              currency: string
              amount: number
            }>
            features?: string[]
          }

          if (!name) {
            return new Response(
              JSON.stringify({ error: 'Name is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const now = new Date()
          const planId = crypto.randomUUID().replace(/-/g, '').substring(0, 24)

          // Create plan
          await db.insert(productPlan).values({
            id: planId,
            organizationId: orgId,
            name,
            description: description || null,
            status: status || 'draft',
            pricingModel: pricingModel || 'flat',
            createdAt: now,
            updatedAt: now,
          })

          // Create base pricing if provided
          if (basePrice) {
            const pricingId = crypto.randomUUID().replace(/-/g, '').substring(0, 24)
            await db.insert(productPricing).values({
              id: pricingId,
              productPlanId: planId,
              pricingType: 'base',
              currency: basePrice.currency,
              amount: Math.round(basePrice.amount * 100), // Convert to cents
              interval: basePrice.interval,
              createdAt: now,
              updatedAt: now,
            })
          }

          // Create regional pricing if provided
          if (regionalPricing && regionalPricing.length > 0) {
            const regionalPricingValues = regionalPricing.map((rp) => ({
              id: crypto.randomUUID().replace(/-/g, '').substring(0, 24),
              productPlanId: planId,
              pricingType: 'regional',
              region: rp.region,
              currency: rp.currency,
              amount: Math.round(rp.amount * 100), // Convert to cents
              interval: basePrice?.interval || 'monthly',
              createdAt: now,
              updatedAt: now,
            }))

            for (const value of regionalPricingValues) {
              await db.insert(productPricing).values(value)
            }
          }

          // Create features if provided
          if (features && features.length > 0) {
            const featureValues = features.map((featureName, index) => ({
              id: crypto.randomUUID().replace(/-/g, '').substring(0, 24),
              productPlanId: planId,
              name: featureName,
              order: index,
              createdAt: now,
              updatedAt: now,
            }))

            for (const value of featureValues) {
              await db.insert(productFeature).values(value)
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              plan: {
                id: planId,
                name,
                description: description || '',
                status: status || 'draft',
                pricingModel: pricingModel || 'flat',
                basePrice: basePrice || { amount: 0, currency: 'USD', interval: 'monthly' },
                regionalPricing: regionalPricing || [],
                features: features || [],
                createdAt: now,
                updatedAt: now,
              },
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error creating plan:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * PUT /api/tenant/:tenant/product-catalog/plans
       * Update an existing product plan (id in body)
       */
      PUT: async ({ request, params }) => {
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
          const {
            id,
            name,
            description,
            status,
            pricingModel,
            basePrice,
            regionalPricing,
            features,
          } = body as {
            id: string
            name?: string
            description?: string
            status?: 'active' | 'draft' | 'archived'
            pricingModel?: 'flat' | 'seat' | 'usage' | 'hybrid'
            basePrice?: {
              amount: number
              currency: string
              interval: 'monthly' | 'yearly'
            }
            regionalPricing?: Array<{
              region: string
              currency: string
              amount: number
            }>
            features?: string[]
          }

          if (!id) {
            return new Response(
              JSON.stringify({ error: 'Plan ID is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Check plan exists and belongs to org
          const existing = await db
            .select()
            .from(productPlan)
            .where(
              and(eq(productPlan.id, id), eq(productPlan.organizationId, orgId))
            )
            .limit(1)

          if (existing.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Plan not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const now = new Date()

          // Update plan fields
          const updateData: Record<string, unknown> = {
            updatedAt: now,
          }

          if (name !== undefined) updateData.name = name
          if (description !== undefined) updateData.description = description
          if (status !== undefined) updateData.status = status
          if (pricingModel !== undefined) updateData.pricingModel = pricingModel

          await db
            .update(productPlan)
            .set(updateData)
            .where(eq(productPlan.id, id))

          // Update base pricing if provided
          if (basePrice !== undefined) {
            // Delete existing base pricing
            await db
              .delete(productPricing)
              .where(
                and(
                  eq(productPricing.productPlanId, id),
                  eq(productPricing.pricingType, 'base')
                )
              )

            // Insert new base pricing
            const pricingId = crypto.randomUUID().replace(/-/g, '').substring(0, 24)
            await db.insert(productPricing).values({
              id: pricingId,
              productPlanId: id,
              pricingType: 'base',
              currency: basePrice.currency,
              amount: Math.round(basePrice.amount * 100),
              interval: basePrice.interval,
              createdAt: now,
              updatedAt: now,
            })
          }

          // Update regional pricing if provided
          if (regionalPricing !== undefined) {
            // Delete existing regional pricing
            await db
              .delete(productPricing)
              .where(
                and(
                  eq(productPricing.productPlanId, id),
                  eq(productPricing.pricingType, 'regional')
                )
              )

            // Insert new regional pricing
            for (const rp of regionalPricing) {
              const pricingId = crypto.randomUUID().replace(/-/g, '').substring(0, 24)
              await db.insert(productPricing).values({
                id: pricingId,
                productPlanId: id,
                pricingType: 'regional',
                region: rp.region,
                currency: rp.currency,
                amount: Math.round(rp.amount * 100),
                interval: basePrice?.interval || 'monthly',
                createdAt: now,
                updatedAt: now,
              })
            }
          }

          // Update features if provided
          if (features !== undefined) {
            // Delete existing features
            await db
              .delete(productFeature)
              .where(eq(productFeature.productPlanId, id))

            // Insert new features
            for (let i = 0; i < features.length; i++) {
              const featureId = crypto.randomUUID().replace(/-/g, '').substring(0, 24)
              await db.insert(productFeature).values({
                id: featureId,
                productPlanId: id,
                name: features[i],
                order: i,
                createdAt: now,
                updatedAt: now,
              })
            }
          }

          return new Response(
            JSON.stringify({ success: true, id }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error updating plan:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * DELETE /api/tenant/:tenant/product-catalog/plans
       * Delete a product plan (id in query param)
       */
      DELETE: async ({ request, params }) => {
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

          // Get plan ID from query params
          const url = new URL(request.url)
          const id = url.searchParams.get('id')

          if (!id) {
            return new Response(
              JSON.stringify({ error: 'Plan ID is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Check plan exists and belongs to org
          const existing = await db
            .select({ id: productPlan.id })
            .from(productPlan)
            .where(
              and(eq(productPlan.id, id), eq(productPlan.organizationId, orgId))
            )
            .limit(1)

          if (existing.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Plan not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Delete the plan (cascades to pricing and features)
          await db.delete(productPlan).where(eq(productPlan.id, id))

          return new Response(
            JSON.stringify({ success: true, id }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error deleting plan:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})


