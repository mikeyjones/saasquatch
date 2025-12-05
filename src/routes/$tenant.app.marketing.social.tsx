import { createFileRoute } from '@tanstack/react-router'
import {
  Calendar,
  Linkedin,
  Twitter,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/$tenant/app/marketing/social')({
  component: SocialPage,
})

type Platform = 'linkedin' | 'twitter' | 'facebook' | 'instagram'
type PostStatus = 'scheduled' | 'posted' | 'draft'

interface SocialPost {
  id: string
  platform: Platform
  title: string
  content: string
  status: PostStatus
  scheduledTime: string
  engagement?: string
}

// Mock social posts data
const mockPosts: SocialPost[] = [
  {
    id: 'post-1',
    platform: 'linkedin',
    title: 'LinkedIn Post',
    content: 'Excited to announce our new Q4 features! Check out the blog post below.',
    status: 'scheduled',
    scheduledTime: 'Tomorrow, 9:00 AM',
  },
  {
    id: 'post-2',
    platform: 'twitter',
    title: 'Twitter Post',
    content: 'Downtime resolved! Thanks for your patience everyone. #SaaS #Update',
    status: 'posted',
    scheduledTime: 'Yesterday, 2:30 PM',
    engagement: '142 likes engagement',
  },
  {
    id: 'post-3',
    platform: 'linkedin',
    title: 'LinkedIn Post',
    content: 'We\'re hiring! Join our growing team and help shape the future of SaaS.',
    status: 'scheduled',
    scheduledTime: 'Dec 5, 10:00 AM',
  },
  {
    id: 'post-4',
    platform: 'twitter',
    title: 'Twitter Post',
    content: 'New case study: How Acme Corp increased revenue by 40% using our platform 🚀',
    status: 'posted',
    scheduledTime: 'Nov 28, 3:00 PM',
    engagement: '89 likes engagement',
  },
]

const platformConfig: Record<Platform, { icon: typeof Linkedin; bgColor: string; iconColor: string }> = {
  linkedin: {
    icon: Linkedin,
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  twitter: {
    icon: Twitter,
    bgColor: 'bg-sky-100',
    iconColor: 'text-sky-500',
  },
  facebook: {
    icon: Linkedin, // placeholder
    bgColor: 'bg-blue-100',
    iconColor: 'text-blue-700',
  },
  instagram: {
    icon: Linkedin, // placeholder
    bgColor: 'bg-pink-100',
    iconColor: 'text-pink-600',
  },
}

const statusStyles: Record<PostStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  posted: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-gray-100 text-gray-600',
}

function SocialPage() {
  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Social Publishing</h1>
          <p className="text-gray-500 text-sm mt-1">
            Schedule and manage social media content.
          </p>
        </div>
        <Button className="bg-rose-500 hover:bg-rose-600 text-white">
          <Calendar size={18} className="mr-1" />
          Schedule Post
        </Button>
      </div>

      {/* Upcoming Queue */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Queue Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Upcoming Queue</h2>
          <button className="text-rose-500 hover:text-rose-600 text-sm font-medium transition-colors">
            View Calendar
          </button>
        </div>

        {/* Posts List */}
        <div className="divide-y divide-gray-100">
          {mockPosts.map((post) => (
            <SocialPostItem key={post.id} post={post} />
          ))}
        </div>

        {mockPosts.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">No posts scheduled yet.</p>
          </div>
        )}
      </div>
    </main>
  )
}

interface SocialPostItemProps {
  post: SocialPost
}

function SocialPostItem({ post }: SocialPostItemProps) {
  const config = platformConfig[post.platform]
  const PlatformIcon = config.icon

  return (
    <div className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
      {/* Platform Icon */}
      <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
        <PlatformIcon size={20} className={config.iconColor} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{post.title}</h3>
            <p className="text-gray-600 text-sm mt-0.5">{post.content}</p>
            <div className="flex items-center gap-3 mt-2">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${
                  statusStyles[post.status]
                }`}
              >
                {post.status}
              </span>
              {post.engagement && (
                <span className="text-xs text-gray-500">{post.engagement}</span>
              )}
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 flex-shrink-0">
            <Clock size={14} />
            <span>{post.scheduledTime}</span>
          </div>
        </div>
      </div>
    </div>
  )
}




