import { FileText, Download, CheckCircle, Clock, AlertTriangle, XCircle, DollarSign, Building, CreditCard, Calendar, Mail, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Invoice } from './InvoiceList'

interface InvoiceDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
  onMarkAsPaid?: (invoice: Invoice) => void
  onFinalize?: (invoice: Invoice) => void
  onDownloadPDF?: (invoice: Invoice) => void
  isMarkingPaid?: boolean
  isFinalizing?: boolean
}

const statusConfig = {
  draft: {
    label: 'Draft',
    description: 'Awaiting payment',
    icon: Clock,
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  final: {
    label: 'Final',
    description: 'Ready for payment',
    icon: FileCheck,
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  paid: {
    label: 'Paid',
    description: 'Payment received',
    icon: CheckCircle,
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  overdue: {
    label: 'Overdue',
    description: 'Payment past due',
    icon: AlertTriangle,
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
  canceled: {
    label: 'Canceled',
    description: 'Invoice canceled',
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
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function InvoiceDetailDialog({
  open,
  onOpenChange,
  invoice,
  onMarkAsPaid,
  onFinalize,
  onDownloadPDF,
  isMarkingPaid,
  isFinalizing,
}: InvoiceDetailDialogProps) {
  if (!invoice) return null

  const status = statusConfig[invoice.status]
  const StatusIcon = status.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Invoice {invoice.invoiceNumber}
            </DialogTitle>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full mr-2 ${status.className}`}
            >
              <StatusIcon size={14} />
              {status.label}
            </span>
          </div>
          <DialogDescription>
            {status.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer & Subscription Info */}
          <div className={invoice.subscription ? "grid grid-cols-2 gap-6" : "grid grid-cols-1 gap-6"}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Building size={14} />
                Customer
              </div>
              <p className="font-semibold text-gray-900">{invoice.tenantOrganization.name}</p>
              {invoice.billingEmail && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Mail size={12} />
                  {invoice.billingEmail}
                </p>
              )}
            </div>
            {invoice.subscription && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <CreditCard size={14} />
                  Subscription
                </div>
                <p className="font-semibold text-gray-900">{invoice.subscription.subscriptionNumber}</p>
                <p className="text-sm text-gray-500">{invoice.subscription.plan}</p>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar size={12} />
                Issue Date
              </div>
              <p className="font-medium text-gray-900">{formatDate(invoice.issueDate)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar size={12} />
                Due Date
              </div>
              <p className="font-medium text-gray-900">{formatDate(invoice.dueDate)}</p>
            </div>
            {invoice.paidAt && (
              <div>
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle size={12} />
                  Paid On
                </div>
                <p className="font-medium text-emerald-700">{formatDate(invoice.paidAt)}</p>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Line Items</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Unit Price</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.lineItems.map((item, idx) => (
                    <tr key={`${item.description}-${idx}-${item.quantity}-${item.unitPrice}`}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(item.total, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="text-gray-900">{formatCurrency(invoice.tax, invoice.currency)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-lg text-gray-900">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {invoice.pdfPath && (
            <Button
              variant="outline"
              onClick={() => onDownloadPDF?.(invoice)}
            >
              <Download size={16} className="mr-2" />
              Download PDF
            </Button>
          )}
          {invoice.status === 'draft' && onFinalize && (
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => onFinalize(invoice)}
              disabled={isFinalizing}
            >
              <FileCheck size={16} className="mr-2" />
              {isFinalizing ? 'Finalizing...' : 'Finalize'}
            </Button>
          )}
          {invoice.status === 'final' && onMarkAsPaid && (
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => onMarkAsPaid(invoice)}
              disabled={isMarkingPaid}
            >
              <DollarSign size={16} className="mr-2" />
              {isMarkingPaid ? 'Processing...' : 'Mark as Paid'}
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}



