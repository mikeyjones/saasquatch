import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  productPlan,
  productPricing,
  productFeature,
  productFeatureFlag,
  organization,
} from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute(
  '/api/tenant/$tenant/product-catalog/plans/$planId'
)({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/product-catalog/plans/:planId
       * Fetch a single product plan with full details including pricing, features, and feature flags
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

          // Fetch the plan
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
            .where(
              and(
                eq(productPlan.id, params.planId),
                eq(productPlan.organizationId, orgId)
              )
            )
            .limit(1)

          if (plans.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Plan not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const plan = plans[0]

          // Fetch all pricing for this plan
          const pricing = await db
            .select()
            .from(productPricing)
            .where(eq(productPricing.productPlanId, plan.id))

          // Fetch all features for this plan
          const features = await db
            .select()
            .from(productFeature)
            .where(eq(productFeature.productPlanId, plan.id))
            .orderBy(asc(productFeature.order))

          // Fetch all feature flags for this plan
          const featureFlags = await db
            .select()
            .from(productFeatureFlag)
            .where(eq(productFeatureFlag.productPlanId, plan.id))

          // Find base pricing
          const basePricing = pricing.find(
            (p) => p.pricingType === 'base' && p.interval === 'monthly'
          ) ||
            pricing.find((p) => p.pricingType === 'base') ||
            pricing[0]

          // Find yearly pricing
          const yearlyPricing = pricing.find(
            (p) => p.pricingType === 'base' && p.interval === 'yearly'
          )

          // Get regional pricing
          const regionalPricing = pricing
            .filter((p) => p.pricingType === 'regional' && p.region)
            .map((p) => ({
              id: p.id,
              region: p.region!,
              currency: p.currency,
              amount: p.amount / 100, // Convert cents to dollars
              interval: p.interval,
            }))

          // Get seat-based pricing
          const seatPricing = pricing.find((p) => p.pricingType === 'seat')

          // Get usage-based pricing
          const usagePricing = pricing.filter((p) => p.pricingType === 'usage')

          // Format feature flags
          const formattedFeatureFlags = featureFlags.map((ff) => ({
            id: ff.id,
            flagKey: ff.flagKey,
            flagValue: JSON.parse(ff.flagValue),
          }))

          // Format response with full details
          const response = {
            id: plan.id,
            name: plan.name,
            description: plan.description || '',
            status: plan.status,
            pricingModel: plan.pricingModel,
            productFamilyId: plan.productFamilyId,
            basePrice: basePricing
              ? {
                  id: basePricing.id,
                  amount: basePricing.amount / 100,
                  currency: basePricing.currency,
                  interval: (basePricing.interval as 'monthly' | 'yearly') || 'monthly',
                }
              : {
                  amount: 0,
                  currency: 'USD',
                  interval: 'monthly' as const,
                },
            yearlyPrice: yearlyPricing
              ? {
                  id: yearlyPricing.id,
                  amount: yearlyPricing.amount / 100,
                  currency: yearlyPricing.currency,
                }
              : null,
            regionalPricing,
            seatPricing: seatPricing
              ? {
                  id: seatPricing.id,
                  perSeatAmount: (seatPricing.perSeatAmount || 0) / 100,
                  currency: seatPricing.currency,
                  interval: seatPricing.interval,
                }
              : null,
            usagePricing: usagePricing.map((up) => ({
              id: up.id,
              usageMeterId: up.usageMeterId,
              usageTiers: up.usageTiers ? JSON.parse(up.usageTiers) : null,
              currency: up.currency,
            })),
            features: features.map((f) => ({
              id: f.id,
              name: f.name,
              description: f.description,
              order: f.order,
            })),
            featureFlags: formattedFeatureFlags,
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt,
          }

          return new Response(JSON.stringify({ plan: response }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('Error fetching plan:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})




