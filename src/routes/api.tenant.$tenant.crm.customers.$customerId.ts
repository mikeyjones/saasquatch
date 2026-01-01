import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import {
  tenantOrganization,
  organization,
  user,
  subscription,
  productPlan,
  productFamily,
  tenantUser,
  invoice,
  deal,
  dealActivity,
  pipelineStage,
  quote,
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/api/tenant/$tenant/crm/customers/$customerId')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/crm/customers/:customerId
       * Fetch a single customer with full details
       */
      GET: async ({ request, params }) => {
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

          // Fetch customer
          const customer = await db
            .select({
              id: tenantOrganization.id,
              name: tenantOrganization.name,
              slug: tenantOrganization.slug,
              logo: tenantOrganization.logo,
              industry: tenantOrganization.industry,
              website: tenantOrganization.website,
              billingEmail: tenantOrganization.billingEmail,
              billingAddress: tenantOrganization.billingAddress,
              assignedToUserId: tenantOrganization.assignedToUserId,
              importance: tenantOrganization.importance,
              tags: tenantOrganization.tags,
              notes: tenantOrganization.notes,
              metadata: tenantOrganization.metadata,
              subscriptionPlan: tenantOrganization.subscriptionPlan,
              subscriptionStatus: tenantOrganization.subscriptionStatus,
              createdAt: tenantOrganization.createdAt,
              updatedAt: tenantOrganization.updatedAt,
            })
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

          const c = customer[0]
          const parsedTags = c.tags ? JSON.parse(c.tags) : []
          const parsedMetadata = c.metadata ? JSON.parse(c.metadata) : {}

          // Fetch ALL subscriptions for this customer (not just active)
          const subscriptions = await db
            .select({
              id: subscription.id,
              subscriptionNumber: subscription.subscriptionNumber,
              productPlanId: subscription.productPlanId,
              planName: productPlan.name,
              productId: productFamily.id,
              productName: productFamily.name,
              productStatus: productFamily.status,
              status: subscription.status,
              billingCycle: subscription.billingCycle,
              seats: subscription.seats,
              mrr: subscription.mrr,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              createdAt: subscription.createdAt,
            })
            .from(subscription)
            .innerJoin(productPlan, eq(subscription.productPlanId, productPlan.id))
            .leftJoin(productFamily, eq(productPlan.productFamilyId, productFamily.id))
            .where(
              and(
                eq(subscription.tenantOrganizationId, params.customerId),
                eq(subscription.organizationId, orgId)
              )
            )
            .orderBy(desc(subscription.createdAt))

          const subscriptionsData = subscriptions.map(s => ({
            id: s.id,
            subscriptionNumber: s.subscriptionNumber,
            productPlanId: s.productPlanId,
            planName: s.planName,
            productId: s.productId,
            productName: s.productName,
            productStatus: s.productStatus,
            status: s.status,
            billingCycle: s.billingCycle,
            seats: s.seats,
            mrr: s.mrr,
            currentPeriodStart: s.currentPeriodStart.toISOString(),
            currentPeriodEnd: s.currentPeriodEnd.toISOString(),
            createdAt: s.createdAt.toISOString(),
          }))

          // Fetch all contacts for this customer
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
              lastActivityAt: tenantUser.lastActivityAt,
              notes: tenantUser.notes,
              createdAt: tenantUser.createdAt,
            })
            .from(tenantUser)
            .where(eq(tenantUser.tenantOrganizationId, params.customerId))
            .orderBy(desc(tenantUser.createdAt))

          const contactsData = contacts.map(contact => ({
            id: contact.id,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            avatarUrl: contact.avatarUrl,
            title: contact.title,
            role: contact.role,
            isOwner: contact.isOwner,
            status: contact.status,
            lastActivityAt: contact.lastActivityAt?.toISOString() || null,
            notes: contact.notes,
            createdAt: contact.createdAt.toISOString(),
          }))

          // Fetch all invoices for this customer
          const invoices = await db
            .select({
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              status: invoice.status,
              subtotal: invoice.subtotal,
              tax: invoice.tax,
              total: invoice.total,
              currency: invoice.currency,
              issueDate: invoice.issueDate,
              dueDate: invoice.dueDate,
              paidAt: invoice.paidAt,
              subscriptionId: invoice.subscriptionId,
              createdAt: invoice.createdAt,
            })
            .from(invoice)
            .where(eq(invoice.tenantOrganizationId, params.customerId))
            .orderBy(desc(invoice.createdAt))

          const invoicesData = invoices.map(inv => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            status: inv.status,
            subtotal: inv.subtotal,
            tax: inv.tax,
            total: inv.total,
            currency: inv.currency,
            issueDate: inv.issueDate.toISOString(),
            dueDate: inv.dueDate.toISOString(),
            paidAt: inv.paidAt?.toISOString() || null,
            subscriptionId: inv.subscriptionId,
            createdAt: inv.createdAt.toISOString(),
          }))

          // Fetch all deals for this customer
          const deals = await db
            .select({
              id: deal.id,
              name: deal.name,
              value: deal.value,
              stageId: deal.stageId,
              stageName: pipelineStage.name,
              stageColor: pipelineStage.color,
              assignedToUserId: deal.assignedToUserId,
              badges: deal.badges,
              nextTask: deal.nextTask,
              notes: deal.notes,
              createdAt: deal.createdAt,
              updatedAt: deal.updatedAt,
            })
            .from(deal)
            .innerJoin(pipelineStage, eq(deal.stageId, pipelineStage.id))
            .where(eq(deal.tenantOrganizationId, params.customerId))
            .orderBy(desc(deal.createdAt))

          const dealsData = deals.map(d => {
            const parsedBadges = d.badges ? JSON.parse(d.badges) : []
            return {
              id: d.id,
              name: d.name,
              value: d.value,
              stageId: d.stageId,
              stageName: d.stageName,
              stageColor: d.stageColor,
              assignedToUserId: d.assignedToUserId,
              badges: parsedBadges,
              nextTask: d.nextTask,
              notes: d.notes,
              createdAt: d.createdAt.toISOString(),
              updatedAt: d.updatedAt.toISOString(),
            }
          })

          // Fetch recent activity from deals
          const activities = await db
            .select({
              id: dealActivity.id,
              dealId: dealActivity.dealId,
              activityType: dealActivity.activityType,
              description: dealActivity.description,
              userId: dealActivity.userId,
              metadata: dealActivity.metadata,
              createdAt: dealActivity.createdAt,
            })
            .from(dealActivity)
            .innerJoin(deal, eq(dealActivity.dealId, deal.id))
            .where(eq(deal.tenantOrganizationId, params.customerId))
            .orderBy(desc(dealActivity.createdAt))
            .limit(50)

          const activitiesData = activities.map(a => ({
            id: a.id,
            dealId: a.dealId,
            activityType: a.activityType,
            description: a.description,
            userId: a.userId,
            metadata: a.metadata ? JSON.parse(a.metadata) : null,
            createdAt: a.createdAt.toISOString(),
          }))

          // Fetch all quotes for this customer
          const quotes = await db
            .select({
              id: quote.id,
              quoteNumber: quote.quoteNumber,
              status: quote.status,
              version: quote.version,
              subtotal: quote.subtotal,
              tax: quote.tax,
              total: quote.total,
              currency: quote.currency,
              validUntil: quote.validUntil,
              lineItems: quote.lineItems,
              pdfPath: quote.pdfPath,
              billingName: quote.billingName,
              billingEmail: quote.billingEmail,
              notes: quote.notes,
              sentAt: quote.sentAt,
              acceptedAt: quote.acceptedAt,
              rejectedAt: quote.rejectedAt,
              dealId: quote.dealId,
              dealName: deal.name,
              productPlanId: quote.productPlanId,
              planName: productPlan.name,
              convertedToInvoiceId: quote.convertedToInvoiceId,
              invoiceNumber: invoice.invoiceNumber,
              createdAt: quote.createdAt,
              updatedAt: quote.updatedAt,
            })
            .from(quote)
            .leftJoin(deal, eq(quote.dealId, deal.id))
            .leftJoin(productPlan, eq(quote.productPlanId, productPlan.id))
            .leftJoin(invoice, eq(quote.convertedToInvoiceId, invoice.id))
            .where(
              and(
                eq(quote.tenantOrganizationId, params.customerId),
                eq(quote.organizationId, orgId)
              )
            )
            .orderBy(desc(quote.createdAt))

          const quotesData = quotes.map(q => ({
            id: q.id,
            quoteNumber: q.quoteNumber,
            status: q.status,
            version: q.version,
            subtotal: q.subtotal,
            tax: q.tax,
            total: q.total,
            currency: q.currency,
            validUntil: q.validUntil?.toISOString() || null,
            lineItems: JSON.parse(q.lineItems),
            pdfPath: q.pdfPath,
            billingName: q.billingName,
            billingEmail: q.billingEmail,
            notes: q.notes,
            sentAt: q.sentAt?.toISOString() || null,
            acceptedAt: q.acceptedAt?.toISOString() || null,
            rejectedAt: q.rejectedAt?.toISOString() || null,
            tenantOrganization: {
              id: c.id,
              name: c.name,
            },
            deal: q.dealId
              ? {
                  id: q.dealId,
                  name: q.dealName,
                }
              : null,
            productPlan: q.productPlanId
              ? {
                  id: q.productPlanId,
                  name: q.planName,
                }
              : null,
            convertedInvoice: q.convertedToInvoiceId
              ? {
                  id: q.convertedToInvoiceId,
                  invoiceNumber: q.invoiceNumber,
                }
              : null,
            createdAt: q.createdAt.toISOString(),
            updatedAt: q.updatedAt.toISOString(),
          }))

          // Calculate metrics
          const totalMRR = subscriptionsData
            .filter(s => s.status === 'active')
            .reduce((sum, s) => sum + s.mrr, 0)

          const lifetimeIncome = invoicesData
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + inv.total, 0)

          return new Response(
            JSON.stringify({
              customer: {
                id: c.id,
                name: c.name,
                slug: c.slug,
                logo: c.logo,
                industry: c.industry,
                website: c.website,
                billingEmail: c.billingEmail,
                billingAddress: c.billingAddress,
                assignedToUserId: c.assignedToUserId,
                tags: parsedTags,
                notes: c.notes,
                metadata: parsedMetadata,
                subscriptionPlan: c.subscriptionPlan,
                subscriptionStatus: c.subscriptionStatus,
                createdAt: c.createdAt.toISOString(),
                updatedAt: c.updatedAt.toISOString(),
              },
              subscriptions: subscriptionsData,
              contacts: contactsData,
              invoices: invoicesData,
              deals: dealsData,
              quotes: quotesData,
              activities: activitiesData,
              metrics: {
                totalMRR,
                lifetimeIncome,
                contactCount: contactsData.length,
                dealCount: dealsData.length,
                invoiceCount: invoicesData.length,
                quoteCount: quotesData.length,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error fetching customer:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },

      /**
       * PUT /api/tenant/:tenant/crm/customers/:customerId
       * Update an existing customer (tenant organization)
       * Body:
       * - name (optional) - Company name
       * - industry (optional)
       * - website (optional)
       * - billingEmail (optional)
       * - billingAddress (optional)
       * - assignedToUserId (optional) - Sales rep assignment (null to unassign)
       * - tags (optional) - Array of tags
       * - notes (optional)
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

          // Verify customer exists and belongs to this organization
          const existingCustomer = await db
            .select({
              id: tenantOrganization.id,
              name: tenantOrganization.name,
            })
            .from(tenantOrganization)
            .where(
              and(
                eq(tenantOrganization.id, params.customerId),
                eq(tenantOrganization.organizationId, orgId)
              )
            )
            .limit(1)

          if (existingCustomer.length === 0) {
            return new Response(
              JSON.stringify({ error: 'Customer not found' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Parse request body
          const body = await request.json()
          const {
            name,
            industry,
            website,
            billingEmail,
            billingAddress,
            assignedToUserId,
            importance,
            tags,
            notes,
            metadata,
          } = body as {
            name?: string
            industry?: string
            website?: string
            billingEmail?: string
            billingAddress?: string
            assignedToUserId?: string | null
            importance?: string
            tags?: string[]
            notes?: string
            metadata?: Record<string, unknown>
          }

          // Build update object with only provided fields
          const updateData: {
            name?: string
            industry?: string | null
            website?: string | null
            billingEmail?: string | null
            billingAddress?: string | null
            assignedToUserId?: string | null
            importance?: string | null
            tags?: string | null
            notes?: string | null
            metadata?: string | null
            updatedAt: Date
          } = {
            updatedAt: new Date(),
          }

          if (name !== undefined && typeof name === 'string' && name.trim().length > 0) {
            updateData.name = name.trim()
          }

          if (industry !== undefined) {
            updateData.industry = industry || null
          }

          if (website !== undefined) {
            updateData.website = website || null
          }

          if (billingEmail !== undefined) {
            updateData.billingEmail = billingEmail || null
          }

          if (billingAddress !== undefined) {
            updateData.billingAddress = billingAddress || null
          }

          if (importance !== undefined) {
            updateData.importance = importance || 'normal'
          }

          if (assignedToUserId !== undefined) {
            if (assignedToUserId === null || assignedToUserId === '' || assignedToUserId === 'unassigned') {
              updateData.assignedToUserId = null
            } else {
              // Validate assignedToUserId if provided
              const assignedUser = await db
                .select({ id: user.id })
                .from(user)
                .where(eq(user.id, assignedToUserId))
                .limit(1)

              if (assignedUser.length === 0) {
                return new Response(
                  JSON.stringify({ error: 'Assigned user not found' }),
                  { status: 404, headers: { 'Content-Type': 'application/json' } }
                )
              }
              updateData.assignedToUserId = assignedToUserId
            }
          }

          if (tags !== undefined) {
            updateData.tags = tags && tags.length > 0 ? JSON.stringify(tags) : null
          }

          if (notes !== undefined) {
            updateData.notes = notes || null
          }

          if (metadata !== undefined) {
            updateData.metadata = metadata && Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null
          }

          // Update tenant organization
          await db
            .update(tenantOrganization)
            .set(updateData)
            .where(eq(tenantOrganization.id, params.customerId))

          // Fetch updated customer
          const updatedCustomer = await db
            .select({
              id: tenantOrganization.id,
              name: tenantOrganization.name,
              slug: tenantOrganization.slug,
              industry: tenantOrganization.industry,
              website: tenantOrganization.website,
              billingEmail: tenantOrganization.billingEmail,
              billingAddress: tenantOrganization.billingAddress,
              assignedToUserId: tenantOrganization.assignedToUserId,
              tags: tenantOrganization.tags,
              notes: tenantOrganization.notes,
              metadata: tenantOrganization.metadata,
              subscriptionPlan: tenantOrganization.subscriptionPlan,
              subscriptionStatus: tenantOrganization.subscriptionStatus,
            })
            .from(tenantOrganization)
            .where(eq(tenantOrganization.id, params.customerId))
            .limit(1)

          const customer = updatedCustomer[0]
          const parsedTags = customer.tags ? JSON.parse(customer.tags) : []
          const parsedMetadata = customer.metadata ? JSON.parse(customer.metadata) : {}

          return new Response(
            JSON.stringify({
              success: true,
              customer: {
                id: customer.id,
                name: customer.name,
                slug: customer.slug,
                industry: customer.industry,
                website: customer.website,
                billingEmail: customer.billingEmail,
                billingAddress: customer.billingAddress,
                assignedToUserId: customer.assignedToUserId,
                tags: parsedTags,
                notes: customer.notes,
                metadata: parsedMetadata,
                subscriptionPlan: customer.subscriptionPlan,
                subscriptionStatus: customer.subscriptionStatus,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error) {
          console.error('Error updating customer:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})

