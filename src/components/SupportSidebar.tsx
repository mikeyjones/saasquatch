import { Link, useLocation } from '@tanstack/react-router'
import {
  LayoutGrid,
  MessageSquare,
  Users,
  BookOpen,
  Bot,
  ChevronDown,
} from 'lucide-react'

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid, path: '/app/support' },
  { id: 'tickets', label: 'Tickets', icon: MessageSquare, path: '/app/support/tickets' },
  { id: 'members', label: 'Members & Orgs', icon: Users, path: '#' },
  { id: 'knowledge', label: 'Knowledge & Playbooks', icon: BookOpen, path: '#' },
  { id: 'agent', label: 'Agent Apollo', icon: Bot, path: '#' },
]

export function SupportSidebar() {
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => {
    if (path === '/app/support') {
      return currentPath === '/app/support' || currentPath === '/app/support/'
    }
    return currentPath.startsWith(path)
  }

  return (
    <aside className="w-56 bg-slate-800 flex flex-col">
      {/* Logo */}
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-white font-semibold">SaaSquatch</span>
        </div>
      </div>

      {/* Department Selector */}
      <div className="px-3 mb-2">
        <button className="w-full flex items-center justify-between px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-sm transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-emerald-400 rounded flex items-center justify-center">
              <span className="text-xs">⚡</span>
            </div>
            <span>Support Dept</span>
          </div>
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          
          if (item.path === '#') {
            return (
              <button
                key={item.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors text-left text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          }
          
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors text-left ${
                active
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
              alt="Jane Doe"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.parentElement!.innerHTML = '<span class="text-white text-sm font-medium">JD</span>'
              }}
            />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Jane Doe</p>
            <p className="text-slate-400 text-xs">Support Lead</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

