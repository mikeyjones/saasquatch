/**
 * QuoteList Component
 *
 * Displays a list of quotes in a responsive card-based layout with
 * status badges and action buttons. Supports both mobile and desktop views.
 *
 * @module QuoteList
 */

import { FileText, Download, Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Quote } from "@/data/quotes";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { quoteStatusConfig } from "@/lib/quote-status";

/**
 * Props for the QuoteList component.
 */
interface QuoteListProps {
	/** Array of quotes to display in the list */
	quotes: Quote[];
	/** Callback invoked when user clicks to view a quote's details */
	onViewQuote?: (quote: Quote) => void;
	/** Callback invoked when user clicks to send a draft quote to customer */
	onSendQuote?: (quote: Quote) => void;
	/** Callback invoked when user clicks to download the quote as PDF */
	onDownloadPDF?: (quote: Quote) => void;
	/** ID of the quote currently being sent (shows loading state) */
	isSending?: string | null;
}

/**
 * QuoteList displays a responsive list of quotes with status indicators and actions.
 *
 * Features:
 * - Responsive layout (card view on mobile, table-like on desktop)
 * - Status badges with color-coded styling
 * - Action buttons for View, Send, and Download PDF
 * - Loading state indication when sending quotes
 * - Empty state when no quotes exist
 *
 * @param props - Component props
 * @returns Quote list component or empty state message
 *
 * @example
 * <QuoteList
 *   quotes={quotes}
 *   onViewQuote={(quote) => setSelectedQuote(quote)}
 *   onSendQuote={(quote) => handleSend(quote.id)}
 *   onDownloadPDF={(quote) => downloadPDF(quote.id)}
 *   isSending={sendingQuoteId}
 * />
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
		);
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
				const status = quoteStatusConfig[quote.status];
				const StatusIcon = status.icon;
				const isThisQuoteSending = isSending === quote.id;

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
											{quote.tenantOrganization?.name || "Unknown Customer"}
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
										<span>{formatDateShort(quote.validUntil)}</span>
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
									{quote.status === "draft" && onSendQuote && (
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
										{quote.tenantOrganization?.name || "Unknown Customer"}
									</p>
									{quote.deal && (
										<p className="text-xs text-gray-500">
											Deal: {quote.deal.name}
										</p>
									)}
								</div>
								<div className="col-span-2">
									<span className="font-semibold text-gray-900">
										{formatCurrency(quote.total, quote.currency)}
									</span>
								</div>
								<div className="col-span-2">
									<span className="text-sm text-gray-600">
										{formatDateShort(quote.validUntil)}
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
									{quote.status === "draft" && onSendQuote && (
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
				);
			})}
		</div>
	);
}
