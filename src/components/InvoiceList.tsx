import { FileText, Download, CheckCircle, Clock, AlertTriangle, XCircle, Eye, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
  /** Optional product plan ID - if present, a subscription will be created when invoice is paid */
  productPlanId?: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  status: 'draft' | 'final' | 'paid' | 'overdue' | 'canceled'
  subtotal: number
  tax: number
  total: number
  currency: string
  issueDate: string
  dueDate: string
  paidAt: string | null
  lineItems: InvoiceLineItem[]
  pdfPath: string | null
  billingName: string | null
  billingEmail: string | null
  notes: string | null
  subscription: {
    id: string
    subscriptionNumber: string
    status: string
    plan: string
  } | null
  tenantOrganization: {
    id: string
    name: string
  }
  createdAt: string
  updatedAt: string
}

interface InvoiceListProps {
  invoices: Invoice[]
  onViewInvoice?: (invoice: Invoice) => void
  onMarkAsPaid?: (invoice: Invoice) => void
  onDownloadPDF?: (invoice: Invoice) => void
  isMarkingPaid?: string | null
}

const statusConfig = {
  draft: {
    label: 'Draft',
    icon: Clock,
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  final: {
    label: 'Final',
    icon: FileText,
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  paid: {
    label: 'Paid',
    icon: CheckCircle,
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  overdue: {
    label: 'Overdue',
    icon: AlertTriangle,
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
  canceled: {
    label: 'Canceled',
    icon: XCircle,
    className: 'bg-gray-50 text-gray-700 border border-gray-200',
  },
}

function formatCurrency(cents: number, currency = 'USD'): string {
  const amount = cents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export function InvoiceList({
  invoices,
  onViewInvoice,
  onMarkAsPaid,
  onDownloadPDF,
  isMarkingPaid,
}: InvoiceListProps) {
  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <FileText size={48} className="mb-4 text-gray-300" />
        <p>No invoices found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-500">
        <div className="col-span-2">Invoice</div>
        <div className="col-span-3">Customer</div>
        <div className="col-span-2">Amount</div>
        <div className="col-span-2">Date / Due</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Invoice Rows */}
      {invoices.map((invoice) => {
        const status = statusConfig[invoice.status]
        const StatusIcon = status.icon
        const isThisInvoiceMarking = isMarkingPaid === invoice.id

        return (
          <Card 
            key={invoice.id} 
            className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <CardContent className="p-4">
              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-indigo-500" />
                      <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{invoice.tenantOrganization.name}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${status.className}`}
                  >
                    <StatusIcon size={12} />
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Due Date</span>
                  <span className="text-gray-900">{formatDate(invoice.dueDate)}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onViewInvoice?.(invoice)}
                  >
                    <Eye size={14} className="mr-1" />
                    View
                  </Button>
                  {invoice.pdfPath && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onDownloadPDF?.(invoice)}
                    >
                      <Download size={14} className="mr-1" />
                      PDF
                    </Button>
                  )}
                  {invoice.status === 'draft' && (
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => onMarkAsPaid?.(invoice)}
                      disabled={isThisInvoiceMarking}
                    >
                      <DollarSign size={14} className="mr-1" />
                      {isThisInvoiceMarking ? 'Processing...' : 'Mark Paid'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Desktop View */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                {/* Invoice Number */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-indigo-500" />
                    <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
                  </div>
                  {invoice.subscription && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {invoice.subscription.subscriptionNumber}
                    </p>
                  )}
                </div>

                {/* Customer */}
                <div className="col-span-3">
                  <p className="font-medium text-gray-900 truncate">{invoice.tenantOrganization.name}</p>
                  {invoice.subscription && (
                    <p className="text-xs text-gray-500 truncate">{invoice.subscription.plan}</p>
                  )}
                </div>

                {/* Amount */}
                <div className="col-span-2">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </p>
                  {invoice.tax > 0 && (
                    <p className="text-xs text-gray-500">
                      +{formatCurrency(invoice.tax, invoice.currency)} tax
                    </p>
                  )}
                </div>

                {/* Date */}
                <div className="col-span-2">
                  <p className="text-sm text-gray-900">{formatDate(invoice.issueDate)}</p>
                  <p className="text-xs text-gray-500">
                    Due: {formatDate(invoice.dueDate)}
                  </p>
                </div>

                {/* Status */}
                <div className="col-span-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${status.className}`}
                  >
                    <StatusIcon size={12} />
                    {status.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => onViewInvoice?.(invoice)}
                    title="View Details"
                  >
                    <Eye size={16} />
                  </Button>
                  {invoice.pdfPath && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-indigo-600"
                      onClick={() => onDownloadPDF?.(invoice)}
                      title="Download PDF"
                    >
                      <Download size={16} />
                    </Button>
                  )}
                  {invoice.status === 'draft' && (
                    <Button
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => onMarkAsPaid?.(invoice)}
                      disabled={isThisInvoiceMarking}
                    >
                      <DollarSign size={14} className="mr-1" />
                      {isThisInvoiceMarking ? '...' : 'Pay'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}



