import { useState } from 'react'
import { FileText, Download, Eye, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  subtotal: number
  tax: number
  total: number
  currency: string
  issueDate: string
  dueDate: string
  paidAt: string | null
  subscriptionId: string
  createdAt: string
}

interface OrganizationInvoiceHistoryProps {
  invoices: Invoice[]
}

export function OrganizationInvoiceHistory({ invoices }: OrganizationInvoiceHistoryProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'draft':
        return <Clock className="h-4 w-4 text-gray-600" />
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'canceled':
        return <XCircle className="h-4 w-4 text-gray-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'canceled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100)
  }

  const filteredInvoices = filterStatus === 'all'
    ? invoices
    : invoices.filter(inv => inv.status.toLowerCase() === filterStatus.toLowerCase())

  const statusCounts = {
    all: invoices.length,
    paid: invoices.filter(inv => inv.status.toLowerCase() === 'paid').length,
    draft: invoices.filter(inv => inv.status.toLowerCase() === 'draft').length,
    overdue: invoices.filter(inv => inv.status.toLowerCase() === 'overdue').length,
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="border-b px-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setFilterStatus('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              filterStatus === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            All ({statusCounts.all})
          </button>
          <button
            onClick={() => setFilterStatus('paid')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              filterStatus === 'paid'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Paid ({statusCounts.paid})
          </button>
          <button
            onClick={() => setFilterStatus('draft')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              filterStatus === 'draft'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Draft ({statusCounts.draft})
          </button>
          <button
            onClick={() => setFilterStatus('overdue')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              filterStatus === 'overdue'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Overdue ({statusCounts.overdue})
          </button>
        </nav>
      </div>

      {/* Invoice Table */}
      <div className="overflow-x-auto">
        {filteredInvoices.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No invoices found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Invoice</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Issue Date</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">Due Date</th>
                <th className="text-right py-3 px-6 text-sm font-medium text-muted-foreground">Amount</th>
                <th className="text-right py-3 px-6 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-muted/30">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{invoice.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(invoice.status)}
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm">
                    {new Date(invoice.issueDate).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-sm">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right font-medium">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      {filteredInvoices.length > 0 && (
        <div className="border-t px-6 py-4 bg-muted/20">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing {filteredInvoices.length} of {invoices.length} invoices
            </div>
            <div className="text-sm font-medium">
              Total: {formatCurrency(
                filteredInvoices.reduce((sum, inv) => sum + inv.total, 0),
                filteredInvoices[0]?.currency || 'USD'
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
