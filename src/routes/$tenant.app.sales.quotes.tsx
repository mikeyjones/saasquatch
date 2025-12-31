import { createFileRoute, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { RefreshCw, Loader2, FileText, CheckCircle, Clock, AlertTriangle, XCircle, Send, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuoteList } from '@/components/QuoteList'
import { QuoteDetailDialog } from '@/components/QuoteDetailDialog'
import { CreateQuoteDialog } from '@/components/CreateQuoteDialog'
import { fetchQuotes, sendQuote, acceptQuote, rejectQuote, getQuotePDFUrl, type Quote } from '@/data/quotes'

export const Route = createFileRoute('/$tenant/app/sales/quotes')({
	component: QuotesPage,
})

interface QuotesResponse {
	quotes: Quote[]
	error?: string
}

type QuoteStatus = 'all' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'

const statusFilters: { value: QuoteStatus; label: string; icon: React.ElementType }[] = [
	{ value: 'all', label: 'All Quotes', icon: FileText },
	{ value: 'draft', label: 'Draft', icon: Clock },
	{ value: 'sent', label: 'Sent', icon: Send },
	{ value: 'accepted', label: 'Accepted', icon: CheckCircle },
	{ value: 'rejected', label: 'Rejected', icon: XCircle },
	{ value: 'expired', label: 'Expired', icon: AlertTriangle },
	{ value: 'converted', label: 'Converted', icon: CheckCircle },
]

function QuotesPage() {
	const { tenant } = useParams({ from: '/$tenant/app/sales/quotes' })
	const queryClient = useQueryClient()
	const [statusFilter, setStatusFilter] = useState<QuoteStatus>('all')
	const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
	const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

	const {
		data,
		isLoading,
		error,
		refetch,
	} = useQuery<QuotesResponse>({
		queryKey: ['quotes', tenant, statusFilter],
		queryFn: async () => {
			const quotes = await fetchQuotes(tenant, statusFilter !== 'all' ? { status: statusFilter } : {})
			return { quotes }
		},
	})

	const sendQuoteMutation = useMutation({
		mutationFn: async (quoteId: string) => {
			const result = await sendQuote(tenant, quoteId)
			if (!result.success) {
				throw new Error(result.error || 'Failed to send quote')
			}
			return result
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['quotes', tenant] })
			setIsDetailDialogOpen(false)
			setSelectedQuote(null)
		},
	})

	const acceptQuoteMutation = useMutation({
		mutationFn: async (quoteId: string) => {
			const result = await acceptQuote(tenant, quoteId)
			if (!result.success) {
				throw new Error(result.error || 'Failed to accept quote')
			}
			return result
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['quotes', tenant] })
			queryClient.invalidateQueries({ queryKey: ['invoices', tenant] })
			setIsDetailDialogOpen(false)
			setSelectedQuote(null)
		},
	})

	const rejectQuoteMutation = useMutation({
		mutationFn: async (quoteId: string) => {
			const result = await rejectQuote(tenant, quoteId)
			if (!result.success) {
				throw new Error(result.error || 'Failed to reject quote')
			}
			return result
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['quotes', tenant] })
			setIsDetailDialogOpen(false)
			setSelectedQuote(null)
		},
	})

	const quotes = data?.quotes || []

	const handleViewQuote = (quote: Quote) => {
		setSelectedQuote(quote)
		setIsDetailDialogOpen(true)
	}

	const handleSendQuote = (quote: Quote) => {
		sendQuoteMutation.mutate(quote.id)
	}

	const handleAcceptQuote = (quote: Quote) => {
		acceptQuoteMutation.mutate(quote.id)
	}

	const handleRejectQuote = (quote: Quote) => {
		rejectQuoteMutation.mutate(quote.id)
	}

	const handleDownloadPDF = async (quote: Quote) => {
		try {
			const url = getQuotePDFUrl(tenant, quote.id)
			const response = await fetch(url)
			if (!response.ok) {
				throw new Error('Failed to download PDF')
			}

			const blob = await response.blob()
			const downloadUrl = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = downloadUrl
			a.download = `${quote.quoteNumber}.pdf`
			a.style.display = 'none'
			document.body.appendChild(a)
			a.click()
			
			// Use setTimeout to ensure click completes before cleanup
			setTimeout(() => {
				if (a.parentNode === document.body) {
					document.body.removeChild(a)
				}
				window.URL.revokeObjectURL(downloadUrl)
			}, 100)
		} catch (err) {
			console.error('Error downloading PDF:', err)
		}
	}

	// Count quotes by status
	const statusCounts = quotes.reduce(
		(acc, quote) => {
			acc[quote.status] = (acc[quote.status] || 0) + 1
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
					<p className="text-red-500 mb-4">Failed to load quotes</p>
					<Button variant="outline" onClick={() => refetch()}>
						Try Again
					</Button>
				</div>
			</main>
		)
	}

	return (
		<main className="flex-1 overflow-auto p-6">
			{/* Create Quote Dialog */}
			<CreateQuoteDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				onQuoteCreated={() => {
					queryClient.invalidateQueries({ queryKey: ['quotes', tenant] })
				}}
			/>

			{/* Quote Detail Dialog */}
			<QuoteDetailDialog
				open={isDetailDialogOpen}
				onOpenChange={setIsDetailDialogOpen}
				quote={selectedQuote}
				onSendQuote={handleSendQuote}
				onAcceptQuote={handleAcceptQuote}
				onRejectQuote={handleRejectQuote}
				onDownloadPDF={handleDownloadPDF}
				isProcessing={
					sendQuoteMutation.isPending ||
					acceptQuoteMutation.isPending ||
					rejectQuoteMutation.isPending
				}
			/>

			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">Quotes</h1>
					<p className="text-sm text-gray-500 mt-1">
						Create and manage pricing proposals for customers
					</p>
				</div>
				<div className="flex items-center gap-2 sm:gap-3">
					<Button variant="outline" onClick={() => refetch()} size="sm" className="sm:h-10">
						<RefreshCw size={16} className="sm:mr-1" />
						<span className="hidden sm:inline">Refresh</span>
					</Button>
					<Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="sm:h-10 flex-1 sm:flex-initial">
						<Plus size={16} className="mr-1" />
						Create Quote
					</Button>
				</div>
			</div>

			{/* Status Filter Tabs */}
			<div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0 scrollbar-hide">
				{statusFilters.map((filter) => {
					const Icon = filter.icon
					const count =
						filter.value === 'all' ? quotes.length : statusCounts[filter.value] || 0
					const isActive = statusFilter === filter.value

					return (
						<button
							type="button"
							key={filter.value}
							onClick={() => setStatusFilter(filter.value)}
							className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
								isActive
									? 'bg-indigo-500 text-white'
									: 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
							}`}
						>
							<Icon size={14} className="sm:w-4 sm:h-4" />
							<span className="hidden xs:inline">{filter.label}</span>
							{count > 0 && (
								<span
									className={`px-1.5 py-0.5 text-xs rounded-full ${
										isActive ? 'bg-white/20' : 'bg-gray-100'
									}`}
								>
									{count}
								</span>
							)}
						</button>
					)
				})}
			</div>

			{/* Summary Stats */}
			{quotes.length > 0 && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
					<div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
						<p className="text-xs sm:text-sm text-gray-500">Total Quotes</p>
						<p className="text-xl sm:text-2xl font-bold text-gray-900">{quotes.length}</p>
					</div>
					<div className="bg-white p-3 sm:p-4 rounded-lg border border-amber-200 bg-amber-50">
						<p className="text-xs sm:text-sm text-amber-600">Draft</p>
						<p className="text-xl sm:text-2xl font-bold text-amber-700">{statusCounts.draft || 0}</p>
					</div>
					<div className="bg-white p-3 sm:p-4 rounded-lg border border-blue-200 bg-blue-50">
						<p className="text-xs sm:text-sm text-blue-600">Sent</p>
						<p className="text-xl sm:text-2xl font-bold text-blue-700">{statusCounts.sent || 0}</p>
					</div>
					<div className="bg-white p-3 sm:p-4 rounded-lg border border-emerald-200 bg-emerald-50">
						<p className="text-xs sm:text-sm text-emerald-600">Converted</p>
						<p className="text-xl sm:text-2xl font-bold text-emerald-700">
							{statusCounts.converted || 0}
						</p>
					</div>
				</div>
			)}

			{/* Quote List */}
			<QuoteList
				quotes={quotes}
				onViewQuote={handleViewQuote}
				onSendQuote={handleSendQuote}
				onDownloadPDF={handleDownloadPDF}
				isSending={sendQuoteMutation.isPending ? sendQuoteMutation.variables : null}
			/>

			{/* Mutation Errors */}
			{sendQuoteMutation.isError && (
				<div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg">
					{sendQuoteMutation.error?.message || 'Failed to send quote'}
				</div>
			)}
			{acceptQuoteMutation.isError && (
				<div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg">
					{acceptQuoteMutation.error?.message || 'Failed to accept quote'}
				</div>
			)}
			{rejectQuoteMutation.isError && (
				<div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg">
					{rejectQuoteMutation.error?.message || 'Failed to reject quote'}
				</div>
			)}
		</main>
	)
}

