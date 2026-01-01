/**
 * Quote PDF Generation Module
 *
 * This module provides functionality for generating, managing, and serving
 * PDF documents for quotes. It uses PDFKit to create professional-looking
 * quote documents with organization branding, customer details, line items,
 * and totals.
 *
 * @module quote-pdf
 */

import PDFDocument from 'pdfkit'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { QuoteLineItem } from '@/data/quotes'

/**
 * Data required to generate a quote PDF.
 * Contains all information that will appear on the generated document.
 */
export interface QuotePDFData {
	/** Unique quote identifier displayed on the PDF (e.g., "QUO-ACME-1001") */
	quoteNumber: string
	/** Expiration date for the quote, displayed if provided */
	validUntil?: Date
	/** Name of the organization sending the quote (appears in header) */
	organizationName: string
	/** Slug/identifier for the organization (used in footer and contact info) */
	organizationSlug: string
	/** Name of the customer receiving the quote */
	customerName: string
	/** Customer's email address, displayed in billing section */
	customerEmail?: string
	/** Customer's billing address, displayed in billing section */
	customerAddress?: string
	/** Array of products/services being quoted */
	lineItems: QuoteLineItem[]
	/** Sum of all line item totals in cents */
	subtotal: number
	/** Tax amount in cents */
	tax: number
	/** Grand total (subtotal + tax) in cents */
	total: number
	/** Currency code for formatting (e.g., "USD", "EUR") */
	currency: string
	/** Additional notes or terms to display on the quote */
	notes?: string
}

/**
 * Formats an amount in cents to a localized currency string.
 *
 * @param cents - The amount in cents (e.g., 1500 = $15.00)
 * @param currency - ISO 4217 currency code (default: "USD")
 * @returns Formatted currency string (e.g., "$15.00")
 *
 * @example
 * formatCurrency(1500, 'USD') // Returns "$15.00"
 * formatCurrency(1000, 'EUR') // Returns "€10.00"
 */
function formatCurrency(cents: number, currency = 'USD'): string {
	const amount = cents / 100
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
	}).format(amount)
}

/**
 * Formats a Date object to a human-readable string.
 *
 * @param date - The date to format
 * @returns Formatted date string (e.g., "January 15, 2024")
 */
function formatDate(date: Date): string {
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})
}

/**
 * Generates a professional PDF quote document and saves it to the filesystem.
 *
 * The PDF includes:
 * - Organization header and branding
 * - Quote number and validity date
 * - Customer billing information
 * - Detailed line items table
 * - Subtotal, tax, and grand total
 * - Optional notes section
 *
 * PDFs are saved to: `public/quotes/{organizationId}/{quoteNumber}.pdf`
 *
 * @param data - Quote data containing all information to display on the PDF
 * @param organizationId - Organization ID used for directory structure
 * @returns Promise resolving to the relative path of the generated PDF
 *          (e.g., "/quotes/org-123/QUO-ACME-1001.pdf")
 *
 * @throws Will throw if file system operations fail
 *
 * @example
 * const pdfPath = await generateQuotePDF({
 *   quoteNumber: 'QUO-ACME-1001',
 *   organizationName: 'Acme Corp',
 *   customerName: 'Customer Inc',
 *   lineItems: [{ description: 'Service', quantity: 1, unitPrice: 10000, total: 10000 }],
 *   subtotal: 10000,
 *   tax: 0,
 *   total: 10000,
 *   currency: 'USD',
 * }, 'org-123')
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
 * Checks whether a quote PDF file exists on the filesystem.
 *
 * @param pdfPath - Relative path to the PDF (e.g., "/quotes/org-123/QUO-1.pdf")
 * @returns True if the file exists, false otherwise
 *
 * @example
 * if (quotePDFExists('/quotes/org-123/QUO-ACME-1001.pdf')) {
 *   // Serve the existing PDF
 * }
 */
export function quotePDFExists(pdfPath: string): boolean {
	const fullPath = path.join(process.cwd(), 'public', pdfPath.replace(/^\//, ''))
	return fs.existsSync(fullPath)
}

/**
 * Converts a relative PDF path to an absolute filesystem path.
 *
 * @param pdfPath - Relative path to the PDF (e.g., "/quotes/org-123/QUO-1.pdf")
 * @returns Absolute filesystem path to the PDF file
 *
 * @example
 * const fullPath = getQuotePDFPath('/quotes/org-123/QUO-ACME-1001.pdf')
 * // Returns: "/path/to/project/public/quotes/org-123/QUO-ACME-1001.pdf"
 */
export function getQuotePDFPath(pdfPath: string): string {
	return path.join(process.cwd(), 'public', pdfPath.replace(/^\//, ''))
}

/**
 * Deletes a quote PDF file from the filesystem.
 *
 * Safely handles the case where the file doesn't exist.
 *
 * @param pdfPath - Relative path to the PDF to delete
 *
 * @example
 * deleteQuotePDF('/quotes/org-123/QUO-ACME-1001.pdf')
 */
export function deleteQuotePDF(pdfPath: string): void {
	const fullPath = getQuotePDFPath(pdfPath)
	if (fs.existsSync(fullPath)) {
		fs.unlinkSync(fullPath)
	}
}

