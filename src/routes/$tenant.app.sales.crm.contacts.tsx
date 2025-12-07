import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Download, Plus, RefreshCw, Search, ArrowLeft, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CRMContactsList, type Contact } from '@/components/CRMContactsList'
import { CreateContactDialog } from '@/components/CreateContactDialog'

export const Route = createFileRoute('/$tenant/app/sales/crm/contacts')({
  component: ContactsPage,
})

interface ContactsApiResponse {
  contacts: Contact[]
  total: number
  roles: { role: string; count: number }[]
  error?: string
}

interface Customer {
  id: string
  name: string
}

function ContactsPage() {
  const params = useParams({ strict: false }) as { tenant?: string }
  const tenant = params.tenant || ''

  const [contacts, setContacts] = useState<Contact[]>([])
  const [roles, setRoles] = useState<{ role: string; count: number }[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!tenant) return

    setIsLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()
      if (search) queryParams.set('search', search)
      if (roleFilter) queryParams.set('role', roleFilter)
      if (statusFilter) queryParams.set('status', statusFilter)

      const response = await fetch(
        `/api/tenant/${tenant}/crm/contacts?${queryParams.toString()}`
      )
      const data: ContactsApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch contacts')
      }

      setContacts(data.contacts)
      setRoles(data.roles || [])
    } catch (err) {
      console.error('Error fetching contacts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load contacts')
    } finally {
      setIsLoading(false)
    }
  }, [tenant, search, roleFilter, statusFilter])

  // Fetch customers for the create dialog
  const fetchCustomers = useCallback(async () => {
    if (!tenant) return

    try {
      const response = await fetch(`/api/tenant/${tenant}/crm/customers?segment=all`)
      const data = await response.json()

      if (response.ok && data.customers) {
        setCustomers(data.customers.map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        })))
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
    }
  }, [tenant])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  // Clear selection when contacts change
  useEffect(() => {
    setSelectedIds([])
  }, [contacts])

  const handleDelete = async (contact: Contact) => {
    if (!confirm(`Are you sure you want to delete ${contact.name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/tenant/${tenant}/crm/contacts/${contact.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete contact')
      }

      fetchContacts()
    } catch (err) {
      console.error('Error deleting contact:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete contact')
    }
  }

  const handleRefresh = () => {
    fetchContacts()
  }

  const handleExport = () => {
    console.log('Export contacts')
    // TODO: Implement CSV export
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              to={`/${tenant}/app/sales/crm`}
              className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
            >
              <ArrowLeft size={16} />
              Back to CRM
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage all contacts across your customer organizations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw size={18} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download size={18} className="mr-1" />
            Export
          </Button>
          <Button
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <UserPlus size={18} className="mr-1" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Create Contact Dialog */}
      <CreateContactDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (!open) {
            setSelectedCustomerId('')
          }
        }}
        onContactCreated={() => {
          setIsCreateDialogOpen(false)
          setSelectedCustomerId('')
          fetchContacts()
        }}
        customerId={selectedCustomerId}
        customerName={customers.find((c) => c.id === selectedCustomerId)?.name}
      />

      {/* Edit Contact Dialog */}
      <CreateContactDialog
        open={!!editingContact}
        onOpenChange={(open) => {
          if (!open) setEditingContact(null)
        }}
        onContactCreated={() => {
          setEditingContact(null)
          fetchContacts()
        }}
        contactId={editingContact?.id || null}
        contact={editingContact}
        customerId={editingContact?.customer?.id}
        customerName={editingContact?.customer?.name}
      />

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Contacts</p>
          <p className="text-2xl font-semibold text-gray-900">
            {isLoading ? '...' : contacts.length}
          </p>
        </div>
        {roles.slice(0, 3).map((r) => (
          <div key={r.role} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500 capitalize">{r.role}s</p>
            <p className="text-2xl font-semibold text-gray-900">{r.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Customer Select for Creating Contact */}
          <Select
            value={selectedCustomerId}
            onValueChange={setSelectedCustomerId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select customer..." />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Role Filter */}
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Roles</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(search || roleFilter || statusFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('')
                setRoleFilter('')
                setStatusFilter('')
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-indigo-700 text-sm font-medium">
            {selectedIds.length} contact{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Export Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              Delete Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center text-gray-500">
            <RefreshCw size={32} className="animate-spin mb-4" />
            <p>Loading contacts...</p>
          </div>
        </div>
      ) : (
        /* Contacts List */
        <CRMContactsList
          contacts={contacts}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onEdit={(contact) => setEditingContact(contact)}
          onDelete={handleDelete}
          showCustomer={true}
        />
      )}
    </main>
  )
}


