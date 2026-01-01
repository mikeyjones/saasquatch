/**
 * QuoteDetailDialog Component
 *
 * A modal dialog that displays comprehensive details about a quote,
 * including customer information, line items, totals, and status history.
 * Provides action buttons for managing the quote lifecycle.
 *
 * @module QuoteDetailDialog
 */

import {
	FileText,
	Download,
	CheckCircle,
	Send,
	Building,
	Calendar,
	Mail,
	Tag,
	XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import type { Quote } from '@/data/quotes'
import { formatCurrency, formatDateLong } from '@/lib/format'
import { quoteStatusDetailConfig } from '@/lib/quote-status'

/**
 * Props for the QuoteDetailDialog component.
 */
interface QuoteDetailDialogProps {
	/** Whether the dialog is currently visible */
	open: boolean
	/** Callback to control the dialog's open state */
	onOpenChange: (open: boolean) => void
	/** The quote to display; pass null to render nothing */
	quote: Quote | null
	/** Callback invoked when user clicks "Send Quote" (draft quotes only) */
	onSendQuote?: (quote: Quote) => void
	/** Callback invoked when user clicks "Accept" (sent quotes only) */
	onAcceptQuote?: (quote: Quote) => void
	/** Callback invoked when user clicks "Reject" (sent quotes only) */
	onRejectQuote?: (quote: Quote) => void
	/** Callback invoked when user clicks "Download PDF" */
	onDownloadPDF?: (quote: Quote) => void
	/** When true, disables action buttons and shows loading text */
	isProcessing?: boolean
}


/**
 * QuoteDetailDialog displays comprehensive quote information in a modal dialog.
 *
 * Features:
 * - Status badge with color-coded styling and description
 * - Customer and deal information sections
 * - Product plan display (if linked)
 * - Timeline showing created, valid until, and sent dates
 * - Acceptance/rejection status with timestamps
 * - Line items table with quantities and pricing
 * - Totals section (subtotal, tax, grand total)
 * - Notes section (if present)
 * - Action buttons based on quote status:
 *   - Draft: Send Quote
 *   - Sent: Accept & Convert to Invoice, Reject
 *   - Any with PDF: Download PDF
 *
 * @param props - Component props
 * @returns Dialog component or null if no quote provided
 *
 * @example
 * <QuoteDetailDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   quote={selectedQuote}
 *   onSendQuote={handleSend}
 *   onAcceptQuote={handleAccept}
 *   onRejectQuote={handleReject}
 *   onDownloadPDF={handleDownload}
 *   isProcessing={isLoading}
 * />
 */
export function QuoteDetailDialog({
	open,
	onOpenChange,
	quote,
	onSendQuote,
	onAcceptQuote,
	onRejectQuote,
	onDownloadPDF,
	isProcessing,
}: QuoteDetailDialogProps) {
	if (!quote) return null

	const status = quoteStatusDetailConfig[quote.status]
	const StatusIcon = status.icon

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<div className="flex items-center justify-between pr-8">
						<DialogTitle className="text-xl flex items-center gap-2">
							<FileText className="w-5 h-5 text-indigo-500" />
							Quote {quote.quoteNumber}
						</DialogTitle>
						<span
							className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full mr-2 ${status.className}`}
						>
							<StatusIcon size={14} />
							{status.label}
						</span>
					</div>
					<DialogDescription>{status.description}</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Customer & Deal Info */}
					<div className={quote.deal ? 'grid grid-cols-2 gap-6' : 'grid grid-cols-1 gap-6'}>
						<div className="space-y-1">
							<div className="flex items-center gap-2 text-sm font-medium text-gray-500">
								<Building size={14} />
								Customer
							</div>
							<p className="font-semibold text-gray-900">
								{quote.tenantOrganization.name}
							</p>
							{quote.billingEmail && (
								<p className="text-sm text-gray-500 flex items-center gap-1">
									<Mail size={12} />
									{quote.billingEmail}
								</p>
							)}
						</div>
						{quote.deal && (
							<div className="space-y-1">
								<div className="flex items-center gap-2 text-sm font-medium text-gray-500">
									<Tag size={14} />
									Deal
								</div>
								<p className="font-semibold text-gray-900">{quote.deal.name}</p>
							</div>
						)}
					</div>

					{quote.productPlan && (
						<div className="p-4 bg-gray-50 rounded-lg">
							<div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
								<Tag size={14} />
								Product Plan
							</div>
							<p className="font-semibold text-gray-900">{quote.productPlan.name}</p>
						</div>
					)}

					{/* Dates */}
					<div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
						<div>
							<div className="flex items-center gap-1 text-xs text-gray-500">
								<Calendar size={12} />
								Created
							</div>
							<p className="font-medium text-gray-900">{formatDateLong(quote.createdAt)}</p>
						</div>
						{quote.validUntil && (
							<div>
								<div className="flex items-center gap-1 text-xs text-gray-500">
									<Calendar size={12} />
									Valid Until
								</div>
								<p className="font-medium text-gray-900">
									{formatDateLong(quote.validUntil)}
								</p>
							</div>
						)}
						{quote.sentAt && (
							<div>
								<div className="flex items-center gap-1 text-xs text-blue-600">
									<Send size={12} />
									Sent On
								</div>
								<p className="font-medium text-blue-700">{formatDateLong(quote.sentAt)}</p>
							</div>
						)}
					</div>

					{quote.acceptedAt && (
						<div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
							<div className="flex items-center gap-2 text-sm font-medium text-emerald-700 mb-1">
								<CheckCircle size={14} />
								Accepted On
							</div>
							<p className="text-emerald-900">{formatDateLong(quote.acceptedAt)}</p>
							{quote.convertedInvoice && (
								<p className="text-xs text-emerald-600 mt-1">
									Converted to Invoice: {quote.convertedInvoice.invoiceNumber}
								</p>
							)}
						</div>
					)}

					{quote.rejectedAt && (
						<div className="p-4 bg-red-50 rounded-lg border border-red-200">
							<div className="flex items-center gap-2 text-sm font-medium text-red-700 mb-1">
								<XCircle size={14} />
								Rejected On
							</div>
							<p className="text-red-900">{formatDateLong(quote.rejectedAt)}</p>
						</div>
					)}

					{/* Line Items */}
					<div>
						<h4 className="text-sm font-medium text-gray-700 mb-3">Line Items</h4>
						<div className="border border-gray-200 rounded-lg overflow-hidden">
							<table className="w-full">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
											Description
										</th>
										<th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
											Qty
										</th>
										<th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
											Unit Price
										</th>
										<th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
											Total
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100">
									{quote.lineItems.map((item, idx) => (
										<tr
											key={`${item.description}-${idx}-${item.quantity}-${item.unitPrice}`}
										>
											<td className="px-4 py-3 text-sm text-gray-900">
												{item.description}
											</td>
											<td className="px-4 py-3 text-sm text-gray-900 text-right">
												{item.quantity}
											</td>
											<td className="px-4 py-3 text-sm text-gray-900 text-right">
												{formatCurrency(item.unitPrice, quote.currency)}
											</td>
											<td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
												{formatCurrency(item.total, quote.currency)}
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
								<span className="text-gray-900">
									{formatCurrency(quote.subtotal, quote.currency)}
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-gray-500">Tax</span>
								<span className="text-gray-900">
									{formatCurrency(quote.tax, quote.currency)}
								</span>
							</div>
							<div className="flex justify-between pt-2 border-t border-gray-200">
								<span className="font-semibold text-gray-900">Total</span>
								<span className="font-bold text-lg text-gray-900">
									{formatCurrency(quote.total, quote.currency)}
								</span>
							</div>
						</div>
					</div>

					{/* Notes */}
					{quote.notes && (
						<div className="p-4 bg-gray-50 rounded-lg">
							<h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
							<p className="text-sm text-gray-600">{quote.notes}</p>
						</div>
					)}
				</div>

				<DialogFooter className="gap-2">
					{quote.pdfPath && (
						<Button variant="outline" onClick={() => onDownloadPDF?.(quote)}>
							<Download size={16} className="mr-2" />
							Download PDF
						</Button>
					)}
					{quote.status === 'draft' && onSendQuote && (
						<Button
							className="bg-blue-500 hover:bg-blue-600 text-white"
							onClick={() => onSendQuote(quote)}
							disabled={isProcessing}
						>
							<Send size={16} className="mr-2" />
							{isProcessing ? 'Sending...' : 'Send Quote'}
						</Button>
					)}
					{quote.status === 'sent' && (
						<>
							{onAcceptQuote && (
								<Button
									className="bg-emerald-500 hover:bg-emerald-600 text-white"
									onClick={() => onAcceptQuote(quote)}
									disabled={isProcessing}
								>
									<CheckCircle size={16} className="mr-2" />
									{isProcessing ? 'Processing...' : 'Accept & Convert to Invoice'}
								</Button>
							)}
							{onRejectQuote && (
								<Button
									variant="destructive"
									onClick={() => onRejectQuote(quote)}
									disabled={isProcessing}
								>
									<XCircle size={16} className="mr-2" />
									{isProcessing ? 'Processing...' : 'Reject'}
								</Button>
							)}
						</>
					)}
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

