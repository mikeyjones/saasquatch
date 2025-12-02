import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Search, Building, Settings, MoreVertical, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { fetchMembers, type Member } from '@/data/members'

export const Route = createFileRoute('/$tenant/app/support/members')({
  component: MembersPage,
})

function MembersPage() {
  const { tenant } = useParams({ from: '/$tenant/app/support/members' })
  const [searchQuery, setSearchQuery] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch members on mount and when search changes
  useEffect(() => {
    const loadMembers = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchMembers(tenant, searchQuery || undefined)
        setMembers(data)
      } catch (err) {
        setError('Failed to load members')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(loadMembers, 300)
    return () => clearTimeout(timeoutId)
  }, [tenant, searchQuery])

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const data = await fetchMembers(tenant, searchQuery || undefined)
      setMembers(data)
    } catch (err) {
      setError('Failed to refresh members')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Members & Organizations
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage customer accounts, access, and organization settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <div className="w-64">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <Input
                type="text"
                placeholder="Search by name, email, or org..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-gray-50 border-gray-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organization
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Activity
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                  Loading members...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {searchQuery ? 'No members found matching your search.' : 'No members found.'}
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <MemberRow key={member.id} member={member} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      {!isLoading && members.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Showing {members.length} member{members.length !== 1 ? 's' : ''}
        </div>
      )}
    </main>
  )
}

function MemberRow({ member }: { member: Member }) {
  const roleStyles = {
    Admin: 'bg-blue-50 text-blue-700 border-blue-200',
    User: 'bg-gray-100 text-gray-700 border-gray-200',
    Viewer: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  const statusStyles = {
    Active: 'text-emerald-600',
    Suspended: 'text-red-500',
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* User */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-medium">
              {member.initials}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{member.name}</p>
            <p className="text-gray-500 text-xs">{member.email}</p>
          </div>
        </div>
      </td>

      {/* Organization */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <Building size={16} className="text-gray-400" />
          <span className="text-gray-700 text-sm">{member.organization}</span>
        </div>
      </td>

      {/* Role */}
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border ${roleStyles[member.role]}`}
        >
          {member.isOwner && <Settings size={12} />}
          {member.isOwner ? 'Owner · ' : ''}
          {member.role}
        </span>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <span className={`text-sm font-medium ${statusStyles[member.status]}`}>
          {member.status}
        </span>
      </td>

      {/* Last Activity */}
      <td className="px-6 py-4">
        <span className="text-gray-500 text-sm">{member.lastLogin}</span>
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
          <MoreVertical size={18} />
        </button>
      </td>
    </tr>
  )
}
