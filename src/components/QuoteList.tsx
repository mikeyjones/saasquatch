import {
	FileText,
	Download,
	CheckCircle,
	Clock,
	AlertTriangle,
	XCircle,
	Eye,
	Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Quote } from '@/data/quotes'

/**
 * Props for the QuoteList component.
 */
interface QuoteListProps {
	/** Array of quotes to display. */
	quotes: Quote[]
	/** Callback function when viewing a quote. */
	onViewQuote?: (quote: Quote) => void
	/** Callback function when sending a quote. */
	onSendQuote?: (quote: Quote) => void
	/** Callback function when downloading quote PDF. */
	onDownloadPDF?: (quote: Quote) => void
	/** ID of quote currently being sent. */
	isSending?: string | null
}

const statusConfig = {
	draft: {
		label: 'Draft',
		icon: Clock,
		className: 'bg-amber-50 text-amber-700 border border-amber-200',
	},
	sent: {
		label: 'Sent',
		icon: Send,
		className: 'bg-blue-50 text-blue-700 border border-blue-200',
	},
	accepted: {
		label: 'Accepted',
		icon: CheckCircle,
		className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
	},
	rejected: {
		label: 'Rejected',
		icon: XCircle,
		className: 'bg-red-50 text-red-700 border border-red-200',
	},
	expired: {
		label: 'Expired',
		icon: AlertTriangle,
		className: 'bg-orange-50 text-orange-700 border border-orange-200',
	},
	converted: {
		label: 'Converted',
		icon: CheckCircle,
		className: 'bg-purple-50 text-purple-700 border border-purple-200',
	},
}

function formatCurrency(cents: number, currency = 'USD'): string {
	const amount = cents / 100
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
	}).format(amount)
}

function formatDate(dateString: string | null | undefined): string {
	if (!dateString) return 'N/A'
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
	})
}

/**
 * QuoteList component displays a list of quotes with status badges and actions.
 * @param props The props for the QuoteList component.
 */
export function QuoteList({
	quotes,
	onViewQuote,
	onSendQuote,
	onDownloadPDF,
	isSending,
}: QuoteListProps) {
	if (quotes.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-64 text-gray-500">
				<FileText size={48} className="mb-4 text-gray-300" />
				<p>No quotes found</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{/* Table Header */}
			<div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-500">
				<div className="col-span-2">Quote</div>
				<div className="col-span-3">Customer</div>
				<div className="col-span-2">Amount</div>
				<div className="col-span-2">Valid Until</div>
				<div className="col-span-1">Status</div>
				<div className="col-span-2 text-right">Actions</div>
			</div>

			{/* Quote Rows */}
			{quotes.map((quote) => {
				const status = statusConfig[quote.status]
				const StatusIcon = status.icon
				const isThisQuoteSending = isSending === quote.id

				return (
					<Card
						key={quote.id}
						className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
					>
						<CardContent className="p-4">
							{/* Mobile View */}
							<div className="md:hidden space-y-3">
								<div className="flex items-start justify-between">
									<div>
										<div className="flex items-center gap-2">
											<FileText size={16} className="text-indigo-500" />
											<span className="font-medium text-gray-900">
												{quote.quoteNumber}
											</span>
										</div>
										<p className="text-sm text-gray-500 mt-1">
											{quote.tenantOrganization.name}
										</p>
									</div>
									<span
										className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${status.className}`}
									>
										<StatusIcon size={12} />
										{status.label}
									</span>
								</div>

								<div className="flex items-center justify-between text-sm">
									<span className="text-gray-500">Amount:</span>
									<span className="font-semibold">
										{formatCurrency(quote.total, quote.currency)}
									</span>
								</div>

								{quote.validUntil && (
									<div className="flex items-center justify-between text-sm">
										<span className="text-gray-500">Valid Until:</span>
										<span>{formatDate(quote.validUntil)}</span>
									</div>
								)}

								<div className="flex gap-2 pt-2">
									{onViewQuote && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => onViewQuote(quote)}
											className="flex-1"
										>
											<Eye size={14} className="mr-1" />
											View
										</Button>
									)}
									{quote.status === 'draft' && onSendQuote && (
										<Button
											variant="default"
											size="sm"
											onClick={() => onSendQuote(quote)}
											disabled={isThisQuoteSending}
											className="flex-1"
										>
											{isThisQuoteSending ? (
												<>
													<span className="animate-spin mr-1">⏳</span>
													Sending...
												</>
											) : (
												<>
													<Send size={14} className="mr-1" />
													Send
												</>
											)}
										</Button>
									)}
									{quote.pdfPath && onDownloadPDF && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => onDownloadPDF(quote)}
										>
											<Download size={14} />
										</Button>
									)}
								</div>
							</div>

							{/* Desktop View */}
							<div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
								<div className="col-span-2">
									<div className="flex items-center gap-2">
										<FileText size={16} className="text-indigo-500" />
										<span className="font-medium text-gray-900">
											{quote.quoteNumber}
										</span>
									</div>
								</div>
								<div className="col-span-3">
									<p className="text-sm text-gray-900">
										{quote.tenantOrganization.name}
									</p>
									{quote.deal && (
										<p className="text-xs text-gray-500">Deal: {quote.deal.name}</p>
									)}
								</div>
								<div className="col-span-2">
									<span className="font-semibold text-gray-900">
										{formatCurrency(quote.total, quote.currency)}
									</span>
								</div>
								<div className="col-span-2">
									<span className="text-sm text-gray-600">
										{formatDate(quote.validUntil)}
									</span>
								</div>
								<div className="col-span-1">
									<span
										className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${status.className}`}
									>
										<StatusIcon size={12} />
										{status.label}
									</span>
								</div>
								<div className="col-span-2 flex items-center justify-end gap-2">
									{onViewQuote && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => onViewQuote(quote)}
										>
											<Eye size={14} className="mr-1" />
											View
										</Button>
									)}
									{quote.status === 'draft' && onSendQuote && (
										<Button
											variant="default"
											size="sm"
											onClick={() => onSendQuote(quote)}
											disabled={isThisQuoteSending}
										>
											{isThisQuoteSending ? (
												<>
													<span className="animate-spin mr-1">⏳</span>
													Sending...
												</>
											) : (
												<>
													<Send size={14} className="mr-1" />
													Send
												</>
											)}
										</Button>
									)}
									{quote.pdfPath && onDownloadPDF && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => onDownloadPDF(quote)}
										>
											<Download size={14} />
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

