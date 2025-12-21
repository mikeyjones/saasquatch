import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/db'
import { organization } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { searchKnowledge } from '@/lib/knowledge-search'

export const Route = createFileRoute('/api/tenant/$tenant/knowledge/search')({
  server: {
    handlers: {
      /**
       * GET /api/tenant/:tenant/knowledge/search
       * Search knowledge articles and playbooks using fuzzy matching
       *
       * Query params:
       * - q: Search query string
       * - type: 'article' | 'playbook' | 'all' (default: 'all')
       * - status: Filter by status
       * - category: Filter by category
       * - limit: Max results (default: 20)
       */
      GET: async ({ request, params }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          })

          if (!session?.user) {
            return new Response(
              JSON.stringify({ error: 'Unauthorized', results: [] }),
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
              JSON.stringify({ error: 'Organization not found', results: [] }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const orgId = org[0].id

          // Parse query params
          const url = new URL(request.url)
          const query = url.searchParams.get('q') || ''
          const type = url.searchParams.get('type') as
            | 'article'
            | 'playbook'
            | 'all'
            | null
          const status = url.searchParams.get('status') || undefined
          const category = url.searchParams.get('category') || undefined
          const limit = Number.parseInt(
            url.searchParams.get('limit') || '20',
            10
          )

          // Perform search
          const results = await searchKnowledge({
            organizationId: orgId,
            query,
            type: type || 'all',
            status,
            category,
            limit: Math.min(limit, 100), // Cap at 100 results
          })

          return new Response(
            JSON.stringify({
              results,
              query,
              total: results.length,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        } catch (error) {
          console.error('Error searching knowledge:', error)
          return new Response(
            JSON.stringify({ error: 'Internal server error', results: [] }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})






