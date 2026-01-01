/**
 * Quote Status Configuration
 *
 * Shared configuration for quote status display across components.
 * Ensures consistent UI styling and labels throughout the application.
 *
 * @module quote-status
 */

import {
	CheckCircle,
	Clock,
	AlertTriangle,
	XCircle,
	Send,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Quote } from '@/data/quotes'

/**
 * Status configuration for quote list display.
 * Used in components that show status badges without descriptions.
 */
export const quoteStatusConfig = {
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
} as const satisfies Record<
	Quote['status'],
	{
		label: string
		icon: LucideIcon
		className: string
	}
>

/**
 * Status configuration for quote detail display.
 * Includes descriptions for use in dialogs and detailed views.
 */
export const quoteStatusDetailConfig = {
	draft: {
		label: 'Draft',
		description: 'Not yet sent to customer',
		icon: Clock,
		className: 'bg-amber-50 text-amber-700 border border-amber-200',
	},
	sent: {
		label: 'Sent',
		description: 'Sent to customer, awaiting response',
		icon: Send,
		className: 'bg-blue-50 text-blue-700 border border-blue-200',
	},
	accepted: {
		label: 'Accepted',
		description: 'Customer accepted the quote',
		icon: CheckCircle,
		className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
	},
	rejected: {
		label: 'Rejected',
		description: 'Customer rejected the quote',
		icon: XCircle,
		className: 'bg-red-50 text-red-700 border border-red-200',
	},
	expired: {
		label: 'Expired',
		description: 'Quote validity period has expired',
		icon: AlertTriangle,
		className: 'bg-orange-50 text-orange-700 border border-orange-200',
	},
	converted: {
		label: 'Converted',
		description: 'Quote converted to invoice',
		icon: CheckCircle,
		className: 'bg-purple-50 text-purple-700 border border-purple-200',
	},
} as const satisfies Record<
	Quote['status'],
	{
		label: string
		description: string
		icon: LucideIcon
		className: string
	}
>

