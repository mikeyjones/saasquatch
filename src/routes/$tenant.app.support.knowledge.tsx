import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Search, FileText, Zap, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  knowledgeItems,
  categories,
  type KnowledgeItem,
  type KnowledgeCategory,
} from '@/data/knowledge'

export const Route = createFileRoute('/$tenant/app/support/knowledge')({
  component: KnowledgePage,
})

type TabType = 'articles' | 'playbooks'

function KnowledgePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('articles')

  const filteredItems = knowledgeItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType =
      activeTab === 'articles' ? item.type === 'article' : item.type === 'playbook'
    return matchesSearch && matchesType
  })

  const itemsByCategory = categories.reduce(
    (acc, category) => {
      acc[category] = filteredItems.filter((item) => item.category === category)
      return acc
    },
    {} as Record<KnowledgeCategory, KnowledgeItem[]>
  )

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
        <div className="w-64">
          <div className="relative">
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
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('articles')}
          className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'articles'
              ? 'text-emerald-600 border-emerald-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <FileText size={18} />
          Help Articles
        </button>
        <button
          onClick={() => setActiveTab('playbooks')}
          className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'playbooks'
              ? 'text-emerald-600 border-emerald-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <Zap size={18} />
          Playbooks
        </button>
      </div>

      {/* Content by Category */}
      {activeTab === 'articles' && (
        <div className="space-y-8">
          {categories.map((category) => {
            const categoryItems = itemsByCategory[category]
            return (
              <div key={category}>
                <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
                  {category}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryItems.map((item) => (
                    <ArticleCard key={item.id} item={item} />
                  ))}
                  {category === 'AUTHENTICATION' && (
                    <WriteNewArticleCard />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'playbooks' && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No playbooks created yet. Create your first playbook to get started.</p>
        </div>
      )}
    </main>
  )
}

function ArticleCard({ item }: { item: KnowledgeItem }) {
  const statusStyles = {
    Published: 'text-emerald-600',
    Draft: 'text-amber-600',
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {item.category}
        </span>
        <span className={`text-xs font-medium ${statusStyles[item.status]}`}>
          {item.status}
        </span>
      </div>
      <h3 className="font-medium text-gray-900 mb-3">{item.title}</h3>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          <span>{item.views} views</span>
          <span className="mx-2">•</span>
          <span>Updated {item.updatedAt}</span>
        </div>
        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
          <Pencil size={14} />
        </button>
      </div>
    </div>
  )
}

function WriteNewArticleCard() {
  return (
    <button className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-8 text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors min-h-[140px]">
      <Pencil size={24} />
      <span className="text-sm font-medium">Write New Article</span>
    </button>
  )
}

