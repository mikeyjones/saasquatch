import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  FileText,
  Zap,
  Pencil,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  fetchArticles,
  fetchPlaybooks,
  searchKnowledge,
  deleteArticle,
  deletePlaybook,
  categories,
  type KnowledgeArticle,
  type Playbook,
  type SearchResult,
} from '@/data/knowledge'
import { ArticleDialog } from '@/components/ArticleDialog'
import { PlaybookDialog } from '@/components/PlaybookDialog'

export const Route = createFileRoute('/$tenant/app/support/knowledge')({
  component: KnowledgePage,
})

type TabType = 'articles' | 'playbooks'

function KnowledgePage() {
  const params = useParams({ strict: false }) as { tenant?: string }
  const tenant = params.tenant || ''

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('articles')
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Dialog states
  const [articleDialogOpen, setArticleDialogOpen] = useState(false)
  const [playbookDialogOpen, setPlaybookDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(
    null
  )
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null)

  // Load data when tab changes or on mount
  useEffect(() => {
    if (!tenant) return

    const loadData = async () => {
      setIsLoading(true)
      try {
        if (activeTab === 'articles') {
          const data = await fetchArticles(tenant)
          setArticles(data)
        } else {
          const data = await fetchPlaybooks(tenant)
          setPlaybooks(data)
        }
      } finally {
        setIsLoading(false)
      }
    }

    // Only load if not searching
    if (!searchQuery) {
      loadData()
    }
  }, [tenant, activeTab])

  // Debounced search
  useEffect(() => {
    if (!tenant || !searchQuery) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchKnowledge(tenant, searchQuery, {
          type: activeTab === 'articles' ? 'article' : 'playbook',
        })
        setSearchResults(results)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [tenant, searchQuery, activeTab])

  // Group articles by category
  const articlesByCategory = useMemo(() => {
    const grouped: Record<string, KnowledgeArticle[]> = {}
    for (const category of categories) {
      grouped[category] = articles.filter((a) => a.category === category)
    }
    // Add uncategorized
    grouped['UNCATEGORIZED'] = articles.filter((a) => !a.category)
    return grouped
  }, [articles])

  // Group playbooks by type
  const playbooksByType = useMemo(() => {
    return {
      manual: playbooks.filter((p) => p.type === 'manual'),
      automated: playbooks.filter((p) => p.type === 'automated'),
    }
  }, [playbooks])

  const handleRefresh = async () => {
    if (!tenant) return
    setIsLoading(true)
    try {
      if (activeTab === 'articles') {
        const data = await fetchArticles(tenant)
        setArticles(data)
      } else {
        const data = await fetchPlaybooks(tenant)
        setPlaybooks(data)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateArticle = () => {
    setEditingArticle(null)
    setArticleDialogOpen(true)
  }

  const handleEditArticle = (article: KnowledgeArticle) => {
    setEditingArticle(article)
    setArticleDialogOpen(true)
  }

  const handleDeleteArticle = async (article: KnowledgeArticle) => {
    if (!tenant) return
    if (
      !confirm(`Are you sure you want to delete "${article.title}"?`)
    ) {
      return
    }

    const result = await deleteArticle(tenant, article.id)
    if (result.success) {
      handleRefresh()
    } else {
      alert(result.error || 'Failed to delete article')
    }
  }

  const handleCreatePlaybook = () => {
    setEditingPlaybook(null)
    setPlaybookDialogOpen(true)
  }

  const handleEditPlaybook = (playbook: Playbook) => {
    setEditingPlaybook(playbook)
    setPlaybookDialogOpen(true)
  }

  const handleDeletePlaybook = async (playbook: Playbook) => {
    if (!tenant) return
    if (
      !confirm(`Are you sure you want to delete "${playbook.name}"?`)
    ) {
      return
    }

    const result = await deletePlaybook(tenant, playbook.id)
    if (result.success) {
      handleRefresh()
    } else {
      alert(result.error || 'Failed to delete playbook')
    }
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Knowledge & Playbooks
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage help center content and automated agent workflows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <Input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-gray-50 border-gray-200"
            />
            {isSearching && (
              <RefreshCw
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
              />
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              size={14}
              className={isLoading ? 'animate-spin' : ''}
            />
          </Button>
          {activeTab === 'articles' ? (
            <Button
              size="sm"
              onClick={handleCreateArticle}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus size={14} />
              New Article
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleCreatePlaybook}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus size={14} />
              New Playbook
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab('articles')
            setSearchQuery('')
          }}
          className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'articles'
              ? 'text-emerald-600 border-emerald-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <FileText size={18} />
          Help Articles
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
            {articles.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('playbooks')
            setSearchQuery('')
          }}
          className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'playbooks'
              ? 'text-emerald-600 border-emerald-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <Zap size={18} />
          Playbooks
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
            {playbooks.length}
          </span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && !searchQuery && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={24} className="text-gray-400 animate-spin" />
        </div>
      )}

      {/* Search Results */}
      {searchQuery && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-gray-500">
            Search Results for "{searchQuery}"
            {searchResults.length > 0 && (
              <span className="ml-2 text-gray-400">
                ({searchResults.length} found)
              </span>
            )}
          </h2>
          {searchResults.length === 0 && !isSearching ? (
            <div className="text-center py-8 text-gray-500">
              No results found for "{searchQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((result) =>
                result.type === 'article' ? (
                  <SearchResultCard
                    key={result.id}
                    result={result}
                    onEdit={() => {
                      const article = articles.find((a) => a.id === result.id)
                      if (article) handleEditArticle(article)
                    }}
                  />
                ) : (
                  <SearchResultCard
                    key={result.id}
                    result={result}
                    onEdit={() => {
                      const playbook = playbooks.find((p) => p.id === result.id)
                      if (playbook) handleEditPlaybook(playbook)
                    }}
                  />
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Articles Content */}
      {!searchQuery && activeTab === 'articles' && !isLoading && (
        <div className="space-y-8">
          {articles.length === 0 ? (
            <EmptyState
              icon={<FileText size={48} className="text-gray-300" />}
              title="No articles yet"
              description="Create your first help article to get started."
              action={
                <Button onClick={handleCreateArticle}>
                  <Plus size={16} className="mr-1" />
                  Create Article
                </Button>
              }
            />
          ) : (
            categories.map((category) => {
              const categoryArticles = articlesByCategory[category]
              if (categoryArticles.length === 0) return null
              return (
                <div key={category}>
                  <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                    {category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryArticles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        onEdit={() => handleEditArticle(article)}
                        onDelete={() => handleDeleteArticle(article)}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          )}
          {/* Uncategorized articles */}
          {articlesByCategory['UNCATEGORIZED']?.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                Uncategorized
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {articlesByCategory['UNCATEGORIZED'].map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onEdit={() => handleEditArticle(article)}
                    onDelete={() => handleDeleteArticle(article)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Playbooks Content */}
      {!searchQuery && activeTab === 'playbooks' && !isLoading && (
        <div className="space-y-8">
          {playbooks.length === 0 ? (
            <EmptyState
              icon={<Zap size={48} className="text-gray-300" />}
              title="No playbooks yet"
              description="Create your first playbook to get started."
              action={
                <Button onClick={handleCreatePlaybook}>
                  <Plus size={16} className="mr-1" />
                  Create Playbook
                </Button>
              }
            />
          ) : (
            <>
              {/* Manual Playbooks */}
              {playbooksByType.manual.length > 0 && (
                <div>
                  <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText size={14} />
                    Manual Playbooks
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {playbooksByType.manual.map((playbook) => (
                      <PlaybookCard
                        key={playbook.id}
                        playbook={playbook}
                        onEdit={() => handleEditPlaybook(playbook)}
                        onDelete={() => handleDeletePlaybook(playbook)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Automated Playbooks */}
              {playbooksByType.automated.length > 0 && (
                <div>
                  <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Zap size={14} />
                    Automated Playbooks
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {playbooksByType.automated.map((playbook) => (
                      <PlaybookCard
                        key={playbook.id}
                        playbook={playbook}
                        onEdit={() => handleEditPlaybook(playbook)}
                        onDelete={() => handleDeletePlaybook(playbook)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Article Dialog */}
      <ArticleDialog
        open={articleDialogOpen}
        onOpenChange={setArticleDialogOpen}
        article={editingArticle}
        onSaved={handleRefresh}
      />

      {/* Playbook Dialog */}
      <PlaybookDialog
        open={playbookDialogOpen}
        onOpenChange={setPlaybookDialogOpen}
        playbook={editingPlaybook}
        onSaved={handleRefresh}
      />
    </main>
  )
}

function ArticleCard({
  article,
  onEdit,
  onDelete,
}: {
  article: KnowledgeArticle
  onEdit: () => void
  onDelete: () => void
}) {
  const statusStyles = {
    published: 'text-emerald-600 bg-emerald-50',
    draft: 'text-amber-600 bg-amber-50',
    archived: 'text-gray-600 bg-gray-100',
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow group">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {article.category || 'Uncategorized'}
        </span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[article.status]}`}
        >
          {article.status.charAt(0).toUpperCase() + article.status.slice(1)}
        </span>
      </div>
      <h3 className="font-medium text-gray-900 mb-3 line-clamp-2">
        {article.title}
      </h3>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {article.views}
          </span>
          <span>•</span>
          <span>{article.timeAgo}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function PlaybookCard({
  playbook,
  onEdit,
  onDelete,
}: {
  playbook: Playbook
  onEdit: () => void
  onDelete: () => void
}) {
  const statusStyles = {
    active: 'text-emerald-600 bg-emerald-50',
    draft: 'text-amber-600 bg-amber-50',
    inactive: 'text-gray-600 bg-gray-100',
  }

  const typeIcon =
    playbook.type === 'manual' ? (
      <FileText size={14} className="text-blue-500" />
    ) : (
      <Zap size={14} className="text-amber-500" />
    )

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {typeIcon}
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {playbook.type}
          </span>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[playbook.status]}`}
        >
          {playbook.status.charAt(0).toUpperCase() + playbook.status.slice(1)}
        </span>
      </div>
      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {playbook.name}
      </h3>
      {playbook.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
          {playbook.description}
        </p>
      )}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {playbook.type === 'manual' && playbook.steps?.length > 0 && (
            <span>{playbook.steps.length} steps</span>
          )}
          {playbook.type === 'automated' && (
            <span>
              {playbook.triggers?.length || 0} triggers
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function SearchResultCard({
  result,
  onEdit,
}: {
  result: SearchResult
  onEdit: () => void
}) {
  const typeIcon =
    result.type === 'article' ? (
      <FileText size={14} className="text-blue-500" />
    ) : (
      <Zap size={14} className="text-amber-500" />
    )

  return (
    <div
      onClick={onEdit}
      onKeyDown={(e) => e.key === 'Enter' && onEdit()}
      role="button"
      tabIndex={0}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm hover:border-emerald-300 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {typeIcon}
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {result.type}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {Math.round(result.score * 100)}% match
        </span>
      </div>
      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {result.title}
      </h3>
      {result.description && (
        <p className="text-xs text-gray-500 line-clamp-2">
          {result.description}
        </p>
      )}
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6 max-w-md">{description}</p>
      {action}
    </div>
  )
}
