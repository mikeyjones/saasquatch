/**
 * Knowledge Base Data Layer
 *
 * Provides data fetching and mutations for knowledge articles and playbooks.
 */

// ============================================================================
// Types
// ============================================================================

export type KnowledgeCategory = 'AUTHENTICATION' | 'BILLING' | 'DEVELOPER' | 'GENERAL' | 'ONBOARDING' | 'AUTOMATION'

export interface KnowledgeArticle {
  id: string
  title: string
  content: string | null
  slug: string
  category: string | null
  tags: string[]
  status: 'draft' | 'published' | 'archived'
  views: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  timeAgo: string
  createdBy: string | null
  updatedBy: string | null
}

export interface Playbook {
  id: string
  name: string
  description: string | null
  type: 'manual' | 'automated'
  steps: PlaybookStep[]
  triggers: PlaybookTrigger[]
  actions: PlaybookAction[]
  category: string | null
  tags: string[]
  status: 'draft' | 'active' | 'inactive'
  createdAt: string
  updatedAt: string
  timeAgo: string
  createdBy: string | null
  updatedBy: string | null
}

export interface PlaybookStep {
  order: number
  title: string
  description: string
  action?: string
}

export interface PlaybookTrigger {
  type: string
  condition: string
}

export interface PlaybookAction {
  type: string
  config: Record<string, unknown>
}

export interface SearchResult {
  id: string
  type: 'article' | 'playbook'
  title: string
  description: string | null
  category: string | null
  status: string
  tags: string[]
  score: number
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Article API
// ============================================================================

export async function fetchArticles(
  tenantSlug: string,
  filters?: { status?: string; category?: string }
): Promise<KnowledgeArticle[]> {
  try {
    const url = new URL(`/api/tenant/${tenantSlug}/knowledge/articles`, window.location.origin)

    if (filters?.status) url.searchParams.set('status', filters.status)
    if (filters?.category) url.searchParams.set('category', filters.category)

    const response = await fetch(url.toString(), {
      credentials: 'include',
    })

    if (!response.ok) {
      console.error('Failed to fetch articles:', response.statusText)
      return []
    }

    const data = await response.json()
    return data.articles || []
  } catch (error) {
    console.error('Error fetching articles:', error)
    return []
  }
}

export interface CreateArticleInput {
  title: string
  content?: string
  category?: string
  tags?: string[]
  status?: 'draft' | 'published' | 'archived'
}

export async function createArticle(
  tenantSlug: string,
  input: CreateArticleInput
): Promise<{ success: boolean; article?: KnowledgeArticle; error?: string }> {
  try {
    const response = await fetch(`/api/tenant/${tenantSlug}/knowledge/articles`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create article' }
    }

    return { success: true, article: data.article }
  } catch (error) {
    console.error('Error creating article:', error)
    return { success: false, error: 'Network error' }
  }
}

export interface UpdateArticleInput {
  id: string
  title?: string
  content?: string
  category?: string
  tags?: string[]
  status?: 'draft' | 'published' | 'archived'
}

export async function updateArticle(
  tenantSlug: string,
  input: UpdateArticleInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/tenant/${tenantSlug}/knowledge/articles`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to update article' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating article:', error)
    return { success: false, error: 'Network error' }
  }
}

export async function deleteArticle(
  tenantSlug: string,
  articleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `/api/tenant/${tenantSlug}/knowledge/articles?id=${articleId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete article' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting article:', error)
    return { success: false, error: 'Network error' }
  }
}

// ============================================================================
// Playbook API
// ============================================================================

export async function fetchPlaybooks(
  tenantSlug: string,
  filters?: { type?: string; status?: string; category?: string }
): Promise<Playbook[]> {
  try {
    const url = new URL(`/api/tenant/${tenantSlug}/knowledge/playbooks`, window.location.origin)

    if (filters?.type) url.searchParams.set('type', filters.type)
    if (filters?.status) url.searchParams.set('status', filters.status)
    if (filters?.category) url.searchParams.set('category', filters.category)

    const response = await fetch(url.toString(), {
      credentials: 'include',
    })

    if (!response.ok) {
      console.error('Failed to fetch playbooks:', response.statusText)
      return []
    }

    const data = await response.json()
    return data.playbooks || []
  } catch (error) {
    console.error('Error fetching playbooks:', error)
    return []
  }
}

export interface CreatePlaybookInput {
  name: string
  description?: string
  type?: 'manual' | 'automated'
  steps?: PlaybookStep[]
  triggers?: PlaybookTrigger[]
  actions?: PlaybookAction[]
  category?: string
  tags?: string[]
  status?: 'draft' | 'active' | 'inactive'
}

export async function createPlaybook(
  tenantSlug: string,
  input: CreatePlaybookInput
): Promise<{ success: boolean; playbook?: Playbook; error?: string }> {
  try {
    const response = await fetch(`/api/tenant/${tenantSlug}/knowledge/playbooks`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to create playbook' }
    }

    return { success: true, playbook: data.playbook }
  } catch (error) {
    console.error('Error creating playbook:', error)
    return { success: false, error: 'Network error' }
  }
}

export interface UpdatePlaybookInput {
  id: string
  name?: string
  description?: string
  type?: 'manual' | 'automated'
  steps?: PlaybookStep[]
  triggers?: PlaybookTrigger[]
  actions?: PlaybookAction[]
  category?: string
  tags?: string[]
  status?: 'draft' | 'active' | 'inactive'
}

export async function updatePlaybook(
  tenantSlug: string,
  input: UpdatePlaybookInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/tenant/${tenantSlug}/knowledge/playbooks`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to update playbook' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating playbook:', error)
    return { success: false, error: 'Network error' }
  }
}

export async function deletePlaybook(
  tenantSlug: string,
  playbookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `/api/tenant/${tenantSlug}/knowledge/playbooks?id=${playbookId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete playbook' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting playbook:', error)
    return { success: false, error: 'Network error' }
  }
}

// ============================================================================
// Search API
// ============================================================================

export async function searchKnowledge(
  tenantSlug: string,
  query: string,
  options?: {
    type?: 'article' | 'playbook' | 'all'
    status?: string
    category?: string
    limit?: number
  }
): Promise<SearchResult[]> {
  try {
    const url = new URL(`/api/tenant/${tenantSlug}/knowledge/search`, window.location.origin)

    url.searchParams.set('q', query)
    if (options?.type) url.searchParams.set('type', options.type)
    if (options?.status) url.searchParams.set('status', options.status)
    if (options?.category) url.searchParams.set('category', options.category)
    if (options?.limit) url.searchParams.set('limit', String(options.limit))

    const response = await fetch(url.toString(), {
      credentials: 'include',
    })

    if (!response.ok) {
      console.error('Failed to search knowledge:', response.statusText)
      return []
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('Error searching knowledge:', error)
    return []
  }
}

// ============================================================================
// Constants
// ============================================================================

export const categories: KnowledgeCategory[] = [
  'AUTHENTICATION',
  'BILLING',
  'DEVELOPER',
  'GENERAL',
  'ONBOARDING',
  'AUTOMATION',
]

export const categoryOptions = categories.map((cat) => ({
  label: cat.charAt(0) + cat.slice(1).toLowerCase(),
  value: cat,
}))

export const articleStatusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' },
]

export const playbookStatusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
]

export const playbookTypeOptions = [
  { label: 'Manual', value: 'manual' },
  { label: 'Automated', value: 'automated' },
]
