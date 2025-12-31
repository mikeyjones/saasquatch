import PDFDocument from 'pdfkit'
import * as fs from 'node:fs'
import * as path from 'node:path'

export interface QuoteLineItem {
	description: string
	quantity: number
	unitPrice: number // in cents
	total: number // in cents
}

export interface QuotePDFData {
	quoteNumber: string
	validUntil?: Date
	// From organization (the business sending the quote)
	organizationName: string
	organizationSlug: string
	// Customer details
	customerName: string
	customerEmail?: string
	customerAddress?: string
	// Line items and totals
	lineItems: QuoteLineItem[]
	subtotal: number // in cents
	tax: number // in cents
	total: number // in cents
	currency: string
	// Additional info
	notes?: string
}

/**
 * Format cents to currency string
 */
function formatCurrency(cents: number, currency = 'USD'): string {
	const amount = cents / 100
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
	}).format(amount)
}

/**
 * Format date to readable string
 */
function formatDate(date: Date): string {
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})
}

/**
 * Generate a PDF quote and save it to the filesystem
 * @param data Quote data
 * @param organizationId Organization ID for directory structure
 * @returns Path to the generated PDF file (relative to public directory)
 */
export async function generateQuotePDF(
	data: QuotePDFData,
	organizationId: string
): Promise<string> {
	// Create directory structure
	const quoteDir = path.join(process.cwd(), 'public', 'quotes', organizationId)

	if (!fs.existsSync(quoteDir)) {
		fs.mkdirSync(quoteDir, { recursive: true })
	}

	const fileName = `${data.quoteNumber}.pdf`
	const filePath = path.join(quoteDir, fileName)
	const relativePath = `/quotes/${organizationId}/${fileName}`

	// Create PDF document
	const doc = new PDFDocument({
		size: 'A4',
		margin: 50,
		info: {
			Title: `Quote ${data.quoteNumber}`,
			Author: data.organizationName,
		},
	})

	// Pipe to file
	const writeStream = fs.createWriteStream(filePath)
	doc.pipe(writeStream)

	// Colors
	const primaryColor = '#4F46E5' // Indigo
	const textColor = '#1F2937'
	const mutedColor = '#6B7280'
	const borderColor = '#E5E7EB'

	// Header with organization info
	doc.fontSize(24).fillColor(primaryColor).text(data.organizationName.toUpperCase(), 50, 50, {
		align: 'left',
	})

	// QUOTE label
	doc.fontSize(32).fillColor(textColor).text('QUOTE', 350, 50, { align: 'right' })

	// Quote details box (right side)
	doc
		.fontSize(10)
		.fillColor(mutedColor)
		.text('Quote Number:', 350, 100, { align: 'right' })
		.fillColor(textColor)
		.text(data.quoteNumber, 350, 115, { align: 'right' })

	if (data.validUntil) {
		doc
			.fillColor(mutedColor)
			.text('Valid Until:', 350, 135, { align: 'right' })
			.fillColor(textColor)
			.text(formatDate(data.validUntil), 350, 150, { align: 'right' })
	}

	// Customer details (left side, below organization)
	let currentY = 150
	doc.fontSize(12).fillColor(textColor).text('Bill To:', 50, currentY)
	currentY += 20

	doc.fontSize(11).fillColor(textColor).text(data.customerName, 50, currentY)
	currentY += 15

	if (data.customerEmail) {
		doc.fontSize(10).fillColor(mutedColor).text(data.customerEmail, 50, currentY)
		currentY += 15
	}

	if (data.customerAddress) {
		doc.fontSize(10).fillColor(mutedColor).text(data.customerAddress, 50, currentY, {
			width: 200,
		})
		currentY += 30
	}

	// Line items table
	currentY = Math.max(currentY, 250)
	const tableTop = currentY
	const itemHeight = 30
	const descriptionWidth = 300
	const quantityWidth = 60
	const priceWidth = 80
	const totalWidth = 80

	// Table header
	doc
		.fontSize(10)
		.fillColor(mutedColor)
		.text('Description', 50, tableTop)
		.text('Qty', 50 + descriptionWidth, tableTop)
		.text('Unit Price', 50 + descriptionWidth + quantityWidth, tableTop)
		.text('Total', 50 + descriptionWidth + quantityWidth + priceWidth, tableTop)

	// Draw header line
	doc
		.moveTo(50, tableTop + 15)
		.lineTo(550, tableTop + 15)
		.strokeColor(borderColor)
		.lineWidth(1)
		.stroke()

	// Line items
	let itemY = tableTop + 30
	for (const item of data.lineItems) {
		doc
			.fontSize(10)
			.fillColor(textColor)
			.text(item.description, 50, itemY, { width: descriptionWidth })
			.text(item.quantity.toString(), 50 + descriptionWidth, itemY)
			.text(formatCurrency(item.unitPrice, data.currency), 50 + descriptionWidth + quantityWidth, itemY)
			.text(formatCurrency(item.total, data.currency), 50 + descriptionWidth + quantityWidth + priceWidth, itemY)

		itemY += itemHeight
	}

	// Totals section (right aligned)
	const totalsY = itemY + 20
	doc.fontSize(10).fillColor(mutedColor)

	doc.text('Subtotal:', 400, totalsY, { align: 'right' })
	doc
		.fillColor(textColor)
		.text(formatCurrency(data.subtotal, data.currency), 550, totalsY, { align: 'right' })

	if (data.tax > 0) {
		doc
			.fillColor(mutedColor)
			.text('Tax:', 400, totalsY + 20, { align: 'right' })
			.fillColor(textColor)
			.text(formatCurrency(data.tax, data.currency), 550, totalsY + 20, { align: 'right' })
	}

	// Total line
	doc
		.moveTo(400, totalsY + 45)
		.lineTo(550, totalsY + 45)
		.strokeColor(borderColor)
		.lineWidth(1)
		.stroke()

	doc
		.fontSize(14)
		.font('Helvetica-Bold')
		.fillColor(textColor)
		.text('Total:', 400, totalsY + 50, { align: 'right' })
		.text(formatCurrency(data.total, data.currency), 550, totalsY + 50, { align: 'right' })

	// Notes section
	if (data.notes) {
		const notesY = totalsY + 100
		doc.fontSize(10).font('Helvetica').fillColor(mutedColor).text('NOTES', 50, notesY)
		doc.fillColor(textColor).text(data.notes, 50, notesY + 15, { width: 400 })
	}

	// Footer
	doc
		.fontSize(9)
		.fillColor(mutedColor)
		.text(
			`Generated by ${data.organizationName} • Quote ${data.quoteNumber}`,
			50,
			750,
			{ align: 'center', width: 495 }
		)

	// Finalize PDF
	doc.end()

	// Wait for write to complete
	return new Promise((resolve, reject) => {
		writeStream.on('finish', () => resolve(relativePath))
		writeStream.on('error', reject)
	})
}

/**
 * Check if a quote PDF exists
 */
export function quotePDFExists(pdfPath: string): boolean {
	const fullPath = path.join(process.cwd(), 'public', pdfPath.replace(/^\//, ''))
	return fs.existsSync(fullPath)
}

/**
 * Get the full filesystem path for a quote PDF
 */
export function getQuotePDFPath(pdfPath: string): string {
	return path.join(process.cwd(), 'public', pdfPath.replace(/^\//, ''))
}

/**
 * Delete a quote PDF
 */
export function deleteQuotePDF(pdfPath: string): void {
	const fullPath = getQuotePDFPath(pdfPath)
	if (fs.existsSync(fullPath)) {
		fs.unlinkSync(fullPath)
	}
}

