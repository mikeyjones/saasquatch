import { createFileRoute } from '@tanstack/react-router'
import {
  FileText,
  Globe,
  Mail,
  Tag,
  Edit,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/$tenant/app/marketing/content')({
  component: ContentPage,
})

type ContentType = 'blog_post' | 'landing_page' | 'email_template'
type ContentStatus = 'published' | 'draft'

interface ContentItem {
  id: string
  type: ContentType
  title: string
  author: string
  date: string
  status: ContentStatus
}

// Mock content data
const mockContent: ContentItem[] = [
  {
    id: 'content-1',
    type: 'blog_post',
    title: '10 Ways to Scale SaaS Revenue',
    author: 'Sarah C.',
    date: 'Oct 20, 2023',
    status: 'published',
  },
  {
    id: 'content-2',
    type: 'landing_page',
    title: 'Enterprise Feature Landing Page',
    author: 'Mike R.',
    date: 'Oct 25, 2023',
    status: 'draft',
  },
  {
    id: 'content-3',
    type: 'email_template',
    title: 'Welcome Email Template',
    author: 'System',
    date: 'Jan 15, 2023',
    status: 'published',
  },
  {
    id: 'content-4',
    type: 'blog_post',
    title: 'Customer Success Best Practices',
    author: 'Emma L.',
    date: 'Nov 5, 2023',
    status: 'published',
  },
  {
    id: 'content-5',
    type: 'landing_page',
    title: 'Pricing Page Redesign',
    author: 'Sarah C.',
    date: 'Nov 10, 2023',
    status: 'draft',
  },
  {
    id: 'content-6',
    type: 'email_template',
    title: 'Monthly Newsletter Template',
    author: 'Mike R.',
    date: 'Sep 1, 2023',
    status: 'published',
  },
]

const contentTypeConfig: Record<ContentType, { label: string; icon: typeof Tag; color: string }> = {
  blog_post: {
    label: 'BLOG POST',
    icon: Tag,
    color: 'text-rose-500',
  },
  landing_page: {
    label: 'LANDING PAGE',
    icon: Globe,
    color: 'text-emerald-500',
  },
  email_template: {
    label: 'EMAIL TEMPLATE',
    icon: Mail,
    color: 'text-rose-500',
  },
}

const statusStyles: Record<ContentStatus, string> = {
  published: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-gray-100 text-gray-600',
}

function ContentPage() {
  const handleEdit = (content: ContentItem) => {
    console.log('Edit content:', content.title)
  }

  const handlePreview = (content: ContentItem) => {
    console.log('Preview content:', content.title)
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Content & CMS</h1>
          <p className="text-gray-500 text-sm mt-1">
            Create landing pages, blogs, and email templates.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <FileText size={18} className="mr-1" />
            Manage Assets
          </Button>
          <Button className="bg-rose-500 hover:bg-rose-600 text-white">
            <Edit size={18} className="mr-1" />
            Create Content
          </Button>
        </div>
      </div>

      {/* Content Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockContent.map((content) => (
          <ContentCard
            key={content.id}
            content={content}
            onEdit={() => handleEdit(content)}
            onPreview={() => handlePreview(content)}
          />
        ))}
      </div>
    </main>
  )
}

interface ContentCardProps {
  content: ContentItem
  onEdit: () => void
  onPreview: () => void
}

function ContentCard({ content, onEdit, onPreview }: ContentCardProps) {
  const typeConfig = contentTypeConfig[content.type]
  const TypeIcon = typeConfig.icon

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TypeIcon size={16} className={typeConfig.color} />
          <span className={`text-xs font-medium ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${
            statusStyles[content.status]
          }`}
        >
          {content.status}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 mb-2">{content.title}</h3>

      {/* Meta */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span>By {content.author}</span>
        <span>{content.date}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-gray-600 hover:text-gray-900"
          onClick={onEdit}
        >
          <Edit size={14} className="mr-1.5" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-gray-600 hover:text-gray-900"
          onClick={onPreview}
        >
          <Eye size={14} className="mr-1.5" />
          Preview
        </Button>
      </div>
    </div>
  )
}






