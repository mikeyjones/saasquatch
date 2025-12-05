import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MoreHorizontal,
  ExternalLink,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CRMActivityTimeline, type Activity } from './CRMActivityTimeline'

export interface CRMCustomer {
  id: string
  name: string
  industry: string
  logo?: string
  website?: string
  status: 'customer' | 'prospect' | 'inactive'
  subscriptionStatus?: 'active' | 'trialing' | 'canceled' | 'past_due'
  subscriptionPlan?: string
  realizedValue: number
  potentialValue: number
  lastActivity: string
  dealCount: number
  contactCount: number
  assignedTo?: {
    id: string
    name: string
  }
  tags?: string[]
  activities?: Activity[]
}

interface CRMCustomerTableProps {
  customers: CRMCustomer[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onEdit?: (customer: CRMCustomer) => void
  onCreateSubscription?: (customer: CRMCustomer) => void
}

const statusStyles = {
  customer: 'bg-emerald-100 text-emerald-700',
  prospect: 'bg-blue-100 text-blue-700',
  inactive: 'bg-gray-100 text-gray-600',
}

const subscriptionStyles = {
  active: 'bg-emerald-100 text-emerald-700',
  trialing: 'bg-amber-100 text-amber-700',
  canceled: 'bg-red-100 text-red-700',
  past_due: 'bg-orange-100 text-orange-700',
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toLocaleString()}`
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) {
    return `${diffMins}m ago`
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }
  return date.toLocaleDateString()
}

export function CRMCustomerTable({
  customers,
  selectedIds,
  onSelectionChange,
  onEdit,
  onCreateSubscription,
}: CRMCustomerTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleRowSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const toggleAllSelection = () => {
    if (selectedIds.length === customers.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(customers.map((c) => c.id))
    }
  }

  const columns = useMemo<ColumnDef<CRMCustomer>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={selectedIds.length === customers.length && customers.length > 0}
            onChange={toggleAllSelection}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.includes(row.original.id)}
            onChange={() => toggleRowSelection(row.original.id)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        ),
        size: 40,
      },
      {
        id: 'expand',
        header: () => null,
        cell: ({ row }) => (
          <button
            onClick={() => toggleRowExpanded(row.original.id)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {expandedRows.has(row.original.id) ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )}
          </button>
        ),
        size: 40,
      },
      {
        accessorKey: 'name',
        header: 'Company',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
              {row.original.logo ? (
                <img
                  src={row.original.logo}
                  alt={row.original.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Building2 size={18} className="text-white" />
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900">{row.original.name}</div>
              {row.original.website && (
                <a
                  href={row.original.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1"
                >
                  {row.original.website.replace(/^https?:\/\//, '')}
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'industry',
        header: 'Industry',
        cell: ({ row }) => (
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
            {row.original.industry}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full w-fit ${
                statusStyles[row.original.status]
              }`}
            >
              {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
            </span>
            {row.original.subscriptionStatus && (
              <span
                className={`px-2 py-0.5 text-xs rounded-full w-fit ${
                  subscriptionStyles[row.original.subscriptionStatus]
                }`}
              >
                {row.original.subscriptionStatus.replace('_', ' ')}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'realizedValue',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 font-medium"
          >
            Realized Value
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp size={14} />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown size={14} />
            ) : null}
          </button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-medium text-emerald-600">
            {formatCurrency(row.original.realizedValue)}
          </div>
        ),
      },
      {
        accessorKey: 'potentialValue',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 font-medium"
          >
            Potential Value
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp size={14} />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown size={14} />
            ) : null}
          </button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-medium text-blue-600">
            {formatCurrency(row.original.potentialValue)}
          </div>
        ),
      },
      {
        accessorKey: 'lastActivity',
        header: 'Last Activity',
        cell: ({ row }) => (
          <span className="text-gray-500 text-sm">
            {formatRelativeTime(row.original.lastActivity)}
          </span>
        ),
      },
      {
        accessorKey: 'dealCount',
        header: 'Deals',
        cell: ({ row }) => (
          <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
            {row.original.dealCount}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(row.original)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {row.original.subscriptionStatus !== 'active' && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onCreateSubscription?.(row.original)
                  }}
                >
                  Create Subscription
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>Add Deal</DropdownMenuItem>
              <DropdownMenuItem>Add Contact</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        size: 50,
      },
    ],
    [selectedIds, customers.length, expandedRows]
  )

  const table = useReactTable({
    data: customers,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => (
            <>
              <tr
                key={row.id}
                className={`hover:bg-gray-50 transition-colors ${
                  selectedIds.includes(row.original.id) ? 'bg-indigo-50' : ''
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
              {expandedRows.has(row.original.id) && row.original.activities && (
                <tr key={`${row.id}-expanded`}>
                  <td colSpan={columns.length} className="px-4 py-2 bg-gray-50">
                    <div className="pl-20 pr-4 py-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Recent Activity
                      </h4>
                      <CRMActivityTimeline activities={row.original.activities} />
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>

      {customers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No customers found</p>
          <p className="text-sm">Try adjusting your filters or add a new customer</p>
        </div>
      )}
    </div>
  )
}


