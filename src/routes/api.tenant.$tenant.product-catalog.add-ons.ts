import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  productAddOn,
  productAddOnPricing,
  organization,
} from '@/db/schema'
import { eq, and, desc, asc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/tenant/$tenant/product-catalog/add-ons')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/product-catalog/add-ons
       * Fetch all available add-ons for the organization
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
              JSON.stringify({ error: 'Unauthorized', addOns: [] }),
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
              JSON.stringify({ error: 'Organization not found', addOns: [] }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Parse query params
          const url = new URL(request.url)
          const status = url.searchParams.get('status')

          // Build query conditions
          const conditions = [eq(productAddOn.organizationId, orgId)]

          if (status && status !== 'all') {
            conditions.push(eq(productAddOn.status, status))
          }

          // Fetch add-ons
          const addOns = await db
            .select({
              id: productAddOn.id,
              name: productAddOn.name,
              description: productAddOn.description,
              pricingModel: productAddOn.pricingModel,
              status: productAddOn.status,
              createdAt: productAddOn.createdAt,
              updatedAt: productAddOn.updatedAt,
            })
            .from(productAddOn)
            .where(and(...conditions))
            .orderBy(asc(productAddOn.name))

          // Fetch base pricing for all add-ons
          const addOnIds = addOns.map((a) => a.id)
          type AddOnPricingResult = {
            productAddOnId: string
            amount: number
            currency: string
            interval: string | null
          }
          let allPricing: AddOnPricingResult[] = []

          if (addOnIds.length > 0) {
            const pricingPromises = addOnIds.map((addOnId) =>
              db
                .select({
                  productAddOnId: productAddOnPricing.productAddOnId,
                  amount: productAddOnPricing.amount,
                  currency: productAddOnPricing.currency,
                  interval: productAddOnPricing.interval,
                })
                .from(productAddOnPricing)
                .where(
                  and(
                    eq(productAddOnPricing.productAddOnId, addOnId),
                    eq(productAddOnPricing.pricingType, 'base')
                  )
                )
                .limit(1)
            )
            const pricingResults = await Promise.all(pricingPromises)
            allPricing = pricingResults.flat()
          }

          // Create pricing map
          const pricingByAddOn = new Map<string, AddOnPricingResult>()
          for (const p of allPricing) {
            pricingByAddOn.set(p.productAddOnId, p)
          }

          // Format response
          const response = addOns.map((addOn) => {
            const pricing = pricingByAddOn.get(addOn.id)
            return {
              id: addOn.id,
              name: addOn.name,
              description: addOn.description,
              pricingModel: addOn.pricingModel as 'flat' | 'seat' | 'usage',
              status: addOn.status as 'active' | 'draft' | 'archived',
              basePrice: pricing
                ? {
                    amount: pricing.amount / 100, // Convert cents to dollars
                    currency: pricing.currency,
                    interval: pricing.interval,
                  }
                : undefined,
              createdAt: addOn.createdAt,
              updatedAt: addOn.updatedAt,
            }
          })

          return new Response(JSON.stringify({ addOns: response }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching add-ons:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error', addOns: [] }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * POST /api/tenant/:tenant/product-catalog/add-ons
       * Create a new add-on for the organization
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
            pricingModel,
            status,
            basePrice,
          } = body as {
            name: string
            description?: string
            pricingModel?: 'flat' | 'seat' | 'usage'
            status?: 'active' | 'draft' | 'archived'
            basePrice?: {
              amount: number
              currency: string
              interval?: 'monthly' | 'yearly'
            }
          }

          if (!name) {
            return new Response(
              JSON.stringify({ error: 'Name is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const now = new Date()
          const addOnId = crypto.randomUUID().replace(/-/g, '').substring(0, 24)

          // Create add-on
          await db.insert(productAddOn).values({
            id: addOnId,
            organizationId: orgId,
            name,
            description: description || null,
            pricingModel: pricingModel || 'flat',
            status: status || 'draft',
            createdAt: now,
            updatedAt: now,
          })

          // Create base pricing if provided
          if (basePrice) {
            const pricingId = crypto.randomUUID().replace(/-/g, '').substring(0, 24)
            await db.insert(productAddOnPricing).values({
              id: pricingId,
              productAddOnId: addOnId,
              pricingType: 'base',
              currency: basePrice.currency,
              amount: Math.round(basePrice.amount * 100), // Convert to cents
              interval: basePrice.interval || null,
              createdAt: now,
              updatedAt: now,
            })
          }

          return new Response(
            JSON.stringify({
              success: true,
              addOn: {
                id: addOnId,
                name,
                description: description || null,
                pricingModel: pricingModel || 'flat',
                status: status || 'draft',
                basePrice: basePrice || undefined,
                createdAt: now,
                updatedAt: now,
              },
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error creating add-on:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * PUT /api/tenant/:tenant/product-catalog/add-ons
       * Update an existing add-on (id in body)
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
            pricingModel,
            status,
            basePrice,
          } = body as {
            id: string
            name?: string
            description?: string
            pricingModel?: 'flat' | 'seat' | 'usage'
            status?: 'active' | 'draft' | 'archived'
            basePrice?: {
              amount: number
              currency: string
              interval?: 'monthly' | 'yearly'
            }
          }

          if (!id) {
            return new Response(
              JSON.stringify({ error: 'Add-on ID is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Check add-on exists and belongs to org
          const existing = await db
            .select()
            .from(productAddOn)
            .where(
              and(eq(productAddOn.id, id), eq(productAddOn.organizationId, orgId))
            )
            .limit(1)

          if (existing.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Add-on not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const now = new Date()

          // Update add-on fields
          const updateData: Record<string, unknown> = {
            updatedAt: now,
          }

          if (name !== undefined) updateData.name = name
          if (description !== undefined) updateData.description = description
          if (pricingModel !== undefined) updateData.pricingModel = pricingModel
          if (status !== undefined) updateData.status = status

          await db
            .update(productAddOn)
            .set(updateData)
            .where(eq(productAddOn.id, id))

          // Update base pricing if provided
          if (basePrice !== undefined) {
            // Delete existing base pricing
            await db
              .delete(productAddOnPricing)
              .where(
                and(
                  eq(productAddOnPricing.productAddOnId, id),
                  eq(productAddOnPricing.pricingType, 'base')
                )
              )

            // Insert new base pricing
            if (basePrice) {
              const pricingId = crypto.randomUUID().replace(/-/g, '').substring(0, 24)
              await db.insert(productAddOnPricing).values({
                id: pricingId,
                productAddOnId: id,
                pricingType: 'base',
                currency: basePrice.currency,
                amount: Math.round(basePrice.amount * 100),
                interval: basePrice.interval || null,
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
          console.error('Error updating add-on:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * DELETE /api/tenant/:tenant/product-catalog/add-ons
       * Delete an add-on (id in query param)
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

          // Get add-on ID from query params
          const url = new URL(request.url)
          const id = url.searchParams.get('id')

          if (!id) {
            return new Response(
              JSON.stringify({ error: 'Add-on ID is required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Check add-on exists and belongs to org
          const existing = await db
            .select({ id: productAddOn.id })
            .from(productAddOn)
            .where(
              and(eq(productAddOn.id, id), eq(productAddOn.organizationId, orgId))
            )
            .limit(1)

          if (existing.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Add-on not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Delete the add-on (cascades to pricing and plan associations)
          await db.delete(productAddOn).where(eq(productAddOn.id, id))

          return new Response(
            JSON.stringify({ success: true, id }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error deleting add-on:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})

