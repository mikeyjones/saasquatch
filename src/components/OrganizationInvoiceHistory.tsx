import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { FileText, Download, Eye, CheckCircle, Clock, XCircle, AlertCircle, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InvoiceDetailDialog } from '@/components/InvoiceDetailDialog'
import type { Invoice as InvoiceType } from '@/components/InvoiceList'

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
  pdfPath?: string | null
  lineItems?: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
}

interface OrganizationInvoiceHistoryProps {
  invoices: Invoice[]
  onInvoiceUpdated?: () => void
}

export function OrganizationInvoiceHistory({ invoices, onInvoiceUpdated }: OrganizationInvoiceHistoryProps) {
  const params = useParams({ strict: false }) as { tenant?: string }
  const tenant = params.tenant || ''
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceType | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState<string | null>(null)
  const [isMarkingPaid, setIsMarkingPaid] = useState<string | null>(null)

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'draft':
        return <Clock className="h-4 w-4 text-gray-600" />
      case 'final':
        return <FileCheck className="h-4 w-4 text-blue-600" />
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
      case 'final':
        return 'bg-blue-100 text-blue-800'
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
    final: invoices.filter(inv => inv.status.toLowerCase() === 'final').length,
    overdue: invoices.filter(inv => inv.status.toLowerCase() === 'overdue').length,
  }

  const handleViewInvoice = (invoice: Invoice) => {
    // Convert to InvoiceType format expected by InvoiceDetailDialog
    const invoiceDetail: InvoiceType = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status as 'draft' | 'final' | 'paid' | 'overdue' | 'canceled',
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      currency: invoice.currency,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      lineItems: invoice.lineItems || [],
      pdfPath: invoice.pdfPath || null,
      billingName: null,
      billingEmail: null,
      notes: null,
      subscription: invoice.subscriptionId ? {
        id: invoice.subscriptionId,
        subscriptionNumber: '',
        status: '',
        plan: '',
      } : null,
      tenantOrganization: {
        id: '',
        name: '',
      },
      createdAt: invoice.createdAt,
      updatedAt: invoice.createdAt,
    }
    setSelectedInvoice(invoiceDetail)
    setIsDetailDialogOpen(true)
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    if (!tenant) {
      alert('Tenant information is missing')
      return
    }

    try {
      // Use the PDF API endpoint instead of direct pdfPath
      const response = await fetch(`/api/tenant/${tenant}/invoices/${invoice.id}/pdf`)
      if (!response.ok) {
        if (response.status === 404) {
          alert('PDF not available for this invoice')
          return
        }
        throw new Error('Failed to download PDF')
      }

      // Create a blob from the response
      const blob = await response.blob()

      // Create a blob URL and trigger download
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${invoice.invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Failed to download PDF. Please try again.')
    }
  }

  const handleFinalizeInvoice = async (invoiceId: string) => {
    if (!tenant) {
      alert('Tenant information is missing')
      return
    }

    setIsFinalizing(invoiceId)
    try {
      const response = await fetch(`/api/tenant/${tenant}/invoices/${invoiceId}/finalize`, {
        method: 'POST',
      })

      let result: { error?: string; invoice?: Invoice }
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        result = await response.json()
      } else {
        const text = await response.text()
        throw new Error(text || 'Failed to finalize invoice')
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to finalize invoice')
      }

      // Refresh invoice list
      if (onInvoiceUpdated) {
        onInvoiceUpdated()
      }
    } catch (error) {
      console.error('Error finalizing invoice:', error)
      alert(error instanceof Error ? error.message : 'Failed to finalize invoice. Please try again.')
    } finally {
      setIsFinalizing(null)
    }
  }

  const handleMarkAsPaid = async (invoice: Invoice) => {
    if (!tenant) {
      alert('Tenant information is missing')
      return
    }

    setIsMarkingPaid(invoice.id)
    try {
      const response = await fetch(`/api/tenant/${tenant}/invoices/${invoice.id}/pay`, {
        method: 'POST',
      })

      let result: { error?: string; invoice?: Invoice }
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        result = await response.json()
      } else {
        const text = await response.text()
        throw new Error(text || 'Failed to mark invoice as paid')
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark invoice as paid')
      }

      // Refresh invoice list
      if (onInvoiceUpdated) {
        onInvoiceUpdated()
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error)
      alert(error instanceof Error ? error.message : 'Failed to mark invoice as paid. Please try again.')
    } finally {
      setIsMarkingPaid(null)
    }
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="border-b px-6">
        <nav className="flex space-x-8">
          <button
            type="button"
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
            type="button"
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
            type="button"
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
            type="button"
            onClick={() => setFilterStatus('final')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              filterStatus === 'final'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            Final ({statusCounts.final})
          </button>
          <button
            type="button"
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
                      {invoice.status.toLowerCase() === 'draft' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleFinalizeInvoice(invoice.id)}
                          disabled={isFinalizing === invoice.id}
                          title="Finalize invoice"
                        >
                          {isFinalizing === invoice.id ? 'Finalizing...' : 'Finalize'}
                        </Button>
                      )}
                      {invoice.status.toLowerCase() === 'final' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleMarkAsPaid(invoice)}
                          disabled={isMarkingPaid === invoice.id}
                          title="Mark invoice as paid"
                        >
                          {isMarkingPaid === invoice.id ? 'Marking...' : 'Mark as Paid'}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewInvoice(invoice)}
                        title="View invoice details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadPDF(invoice)}
                        title="Download PDF"
                      >
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

      {/* Invoice Detail Dialog */}
      <InvoiceDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        invoice={selectedInvoice}
        onFinalize={async (inv) => {
          await handleFinalizeInvoice(inv.id)
        }}
        onMarkAsPaid={async (inv) => {
          await handleMarkAsPaid(inv as unknown as Invoice)
        }}
        isFinalizing={selectedInvoice ? isFinalizing === selectedInvoice.id : false}
        isMarkingPaid={selectedInvoice ? isMarkingPaid === selectedInvoice.id : false}
        onDownloadPDF={async (inv) => {
          if (!tenant) {
            alert('Tenant information is missing')
            return
          }

          try {
            // Use the PDF API endpoint instead of direct pdfPath
            const response = await fetch(`/api/tenant/${tenant}/invoices/${inv.id}/pdf`)
            if (!response.ok) {
              if (response.status === 404) {
                alert('PDF not available for this invoice')
                return
              }
              throw new Error('Failed to fetch PDF')
            }

            const blob = await response.blob()
            const blobUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = `${inv.invoiceNumber}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(blobUrl)
          } catch (error) {
            console.error('Error downloading PDF:', error)
            alert('Failed to download PDF. Please try again.')
          }
        }}
      />
    </div>
  )
}
