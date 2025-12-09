import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, Edit, Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface Coupon {
  id: string
  code: string
  discountType: string
  discountValue: number
  applicablePlanIds: string[] | null
  maxRedemptions: number | null
  redemptionCount: number
  status: string
  actualStatus: string
  expiresAt: string | null
  createdAt: string
}

interface CouponTableProps {
  coupons: Coupon[]
  onEdit: (coupon: Coupon) => void
  onDelete: (couponId: string) => void
}

export function CouponTable({ coupons, onEdit, onDelete }: CouponTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}%`
    } else if (type === 'fixed_amount') {
      return `$${(value / 100).toFixed(2)}`
    } else if (type === 'free_months') {
      return `${value} ${value === 1 ? 'month' : 'months'} free`
    } else if (type === 'trial_extension') {
      return `+${value} ${value === 1 ? 'day' : 'days'} trial`
    }
    return `${value}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      // TODO: Add toast notification
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const columns = useMemo<ColumnDef<Coupon>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">{row.original.code}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(row.original.code)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Copy size={14} />
            </button>
          </div>
        ),
      },
      {
        accessorKey: 'discountType',
        header: 'Discount',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">
              {formatDiscount(row.original.discountType, row.original.discountValue)}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.discountType.replace('_', ' ')}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'applicablePlanIds',
        header: 'Applies To',
        cell: ({ row }) => {
          const planIds = row.original.applicablePlanIds
          if (!planIds || planIds.length === 0) {
            return <span className="text-muted-foreground">All plans</span>
          }
          return (
            <span className="text-sm">
              {planIds.length} {planIds.length === 1 ? 'plan' : 'plans'}
            </span>
          )
        },
      },
      {
        accessorKey: 'redemptionCount',
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 font-medium"
          >
            Redemptions
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp size={14} />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown size={14} />
            ) : null}
          </button>
        ),
        cell: ({ row }) => {
          const max = row.original.maxRedemptions
          const current = row.original.redemptionCount
          return (
            <div>
              <div className="font-medium">
                {current} {max ? `/ ${max}` : ''}
              </div>
              {max && (
                <div className="text-xs text-muted-foreground">
                  {Math.round((current / max) * 100)}% used
                </div>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'actualStatus',
        header: 'Status',
        cell: ({ row }) => {
          const statusStyles = {
            active: 'bg-green-100 text-green-700',
            expired: 'bg-yellow-100 text-yellow-700',
            disabled: 'bg-gray-100 text-gray-700',
          }
          return (
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                statusStyles[row.original.actualStatus as keyof typeof statusStyles]
              }`}
            >
              {row.original.actualStatus.toUpperCase()}
            </span>
          )
        },
      },
      {
        accessorKey: 'expiresAt',
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 font-medium"
          >
            Expires
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp size={14} />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown size={14} />
            ) : null}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.expiresAt)}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting()}
            className="flex items-center gap-1 font-medium"
          >
            Created
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp size={14} />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown size={14} />
            ) : null}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                •••
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <Edit size={14} className="mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(row.original.id)}
                className="text-destructive"
              >
                <Trash2 size={14} className="mr-2" />
                Disable
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onEdit, onDelete]
  )

  const table = useReactTable({
    data: coupons,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-muted/50 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
