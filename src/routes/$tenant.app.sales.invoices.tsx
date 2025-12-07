import { createFileRoute, useParams, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { RefreshCw, Loader2, FileText, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoiceList, type Invoice } from '@/components/InvoiceList'
import { InvoiceDetailDialog } from '@/components/InvoiceDetailDialog'

export const Route = createFileRoute('/$tenant/app/sales/invoices')({
  component: InvoicesPage,
})

interface InvoicesResponse {
  invoices: Invoice[]
  error?: string
}

type InvoiceStatus = 'all' | 'draft' | 'paid' | 'overdue' | 'canceled'

const statusFilters: { value: InvoiceStatus; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All Invoices', icon: FileText },
  { value: 'draft', label: 'Draft', icon: Clock },
  { value: 'paid', label: 'Paid', icon: CheckCircle },
  { value: 'overdue', label: 'Overdue', icon: AlertTriangle },
  { value: 'canceled', label: 'Canceled', icon: XCircle },
]

function InvoicesPage() {
  const { tenant } = useParams({ from: '/$tenant/app/sales/invoices' })
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus>('all')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<InvoicesResponse>({
    queryKey: ['invoices', tenant, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      const response = await fetch(`/api/tenant/${tenant}/invoices?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch invoices')
      }
      return response.json()
    },
  })

  const markAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await fetch(`/api/tenant/${tenant}/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to mark invoice as paid')
      }
      return response.json()
    },
    onSuccess: () => {
      // Invalidate both invoices and subscriptions queries
      queryClient.invalidateQueries({ queryKey: ['invoices', tenant] })
      queryClient.invalidateQueries({ queryKey: ['subscriptions', tenant] })
      setIsDetailDialogOpen(false)
      setSelectedInvoice(null)
    },
  })

  const invoices = data?.invoices || []

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsDetailDialogOpen(true)
  }

  const handleMarkAsPaid = (invoice: Invoice) => {
    markAsPaidMutation.mutate(invoice.id)
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    if (!invoice.pdfPath) return
    
    try {
      const response = await fetch(`/api/tenant/${tenant}/invoices/${invoice.id}/pdf`)
      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error downloading PDF:', err)
    }
  }

  // Count invoices by status
  const statusCounts = invoices.reduce(
    (acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  if (isLoading) {
    return (
      <main className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex-1 overflow-auto p-6">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-red-500 mb-4">Failed to load invoices</p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Invoice Detail Dialog */}
      <InvoiceDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        invoice={selectedInvoice}
        onMarkAsPaid={handleMarkAsPaid}
        onDownloadPDF={handleDownloadPDF}
        isMarkingPaid={markAsPaidMutation.isPending}
      />

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage customer invoices and track payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw size={18} className="mr-1" />
            Refresh
          </Button>
          <Link to="/$tenant/app/sales/subscriptions" params={{ tenant }}>
            <Button variant="outline">
              View Subscriptions
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {statusFilters.map((filter) => {
          const Icon = filter.icon
          const count = filter.value === 'all' 
            ? invoices.length 
            : statusCounts[filter.value] || 0
          const isActive = statusFilter === filter.value
          
          return (
            <button
              type="button"
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              <Icon size={16} />
              {filter.label}
              {count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                  isActive ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Summary Stats */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Total Invoices</p>
            <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-amber-200 bg-amber-50">
            <p className="text-sm text-amber-600">Pending Payment</p>
            <p className="text-2xl font-bold text-amber-700">{statusCounts.draft || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-emerald-200 bg-emerald-50">
            <p className="text-sm text-emerald-600">Paid</p>
            <p className="text-2xl font-bold text-emerald-700">{statusCounts.paid || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">
              ${(invoices
                .filter(inv => inv.status === 'paid')
                .reduce((sum, inv) => sum + inv.total, 0) / 100
              ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* Invoice List */}
      <InvoiceList
        invoices={invoices}
        onViewInvoice={handleViewInvoice}
        onMarkAsPaid={handleMarkAsPaid}
        onDownloadPDF={handleDownloadPDF}
        isMarkingPaid={markAsPaidMutation.isPending ? markAsPaidMutation.variables : null}
      />

      {/* Mutation Error */}
      {markAsPaidMutation.isError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg">
          {markAsPaidMutation.error?.message || 'Failed to mark invoice as paid'}
        </div>
      )}
    </main>
  )
}

