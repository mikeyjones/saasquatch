export type KnowledgeCategory = 'AUTHENTICATION' | 'BILLING' | 'DEVELOPER'

export interface KnowledgeItem {
  id: string
  title: string
  category: KnowledgeCategory
  status: 'Published' | 'Draft'
  views: number
  updatedAt: string
  type: 'article' | 'playbook'
}

export const knowledgeItems: KnowledgeItem[] = [
  {
    id: '1',
    title: 'Setting up Okta SSO',
    category: 'AUTHENTICATION',
    status: 'Published',
    views: 1240,
    updatedAt: '2 days ago',
    type: 'article',
  },
  {
    id: '2',
    title: 'Understanding Your Invoice',
    category: 'BILLING',
    status: 'Published',
    views: 850,
    updatedAt: '1 week ago',
    type: 'article',
  },
  {
    id: '3',
    title: 'API Rate Limits Explained',
    category: 'DEVELOPER',
    status: 'Draft',
    views: 0,
    updatedAt: 'Yesterday',
    type: 'article',
  },
]

export const categories: KnowledgeCategory[] = ['AUTHENTICATION', 'BILLING', 'DEVELOPER']

