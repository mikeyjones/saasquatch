import PDFDocument from 'pdfkit'
import * as fs from 'node:fs'
import * as path from 'node:path'

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitPrice: number // in cents
  total: number // in cents
  /** Optional product plan ID - if present, a subscription will be created when invoice is paid */
  productPlanId?: string
}

export interface InvoicePDFData {
  invoiceNumber: string
  issueDate: Date
  dueDate: Date
  // From organization (the business sending the invoice)
  organizationName: string
  organizationSlug: string
  // Customer details
  customerName: string
  customerEmail?: string
  customerAddress?: string
  // Line items and totals
  lineItems: InvoiceLineItem[]
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
 * Generate a PDF invoice and save it to the filesystem
 * @param data Invoice data
 * @param organizationId Organization ID for directory structure
 * @returns Path to the generated PDF file (relative to public directory)
 */
export async function generateInvoicePDF(
  data: InvoicePDFData,
  organizationId: string
): Promise<string> {
  // Create directory structure
  const invoiceDir = path.join(process.cwd(), 'public', 'invoices', organizationId)
  
  if (!fs.existsSync(invoiceDir)) {
    fs.mkdirSync(invoiceDir, { recursive: true })
  }
  
  const fileName = `${data.invoiceNumber}.pdf`
  const filePath = path.join(invoiceDir, fileName)
  const relativePath = `/invoices/${organizationId}/${fileName}`
  
  // Create PDF document
  const doc = new PDFDocument({ 
    size: 'A4',
    margin: 50,
    info: {
      Title: `Invoice ${data.invoiceNumber}`,
      Author: data.organizationName,
    }
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
  doc
    .fontSize(24)
    .fillColor(primaryColor)
    .text(data.organizationName.toUpperCase(), 50, 50, { align: 'left' })
  
  // INVOICE label
  doc
    .fontSize(32)
    .fillColor(textColor)
    .text('INVOICE', 350, 50, { align: 'right' })
  
  // Invoice details box (right side)
  doc
    .fontSize(10)
    .fillColor(mutedColor)
    .text('Invoice Number:', 350, 100, { align: 'right' })
    .fillColor(textColor)
    .text(data.invoiceNumber, 350, 115, { align: 'right' })
  
  doc
    .fillColor(mutedColor)
    .text('Issue Date:', 350, 135, { align: 'right' })
    .fillColor(textColor)
    .text(formatDate(data.issueDate), 350, 150, { align: 'right' })
  
  doc
    .fillColor(mutedColor)
    .text('Due Date:', 350, 170, { align: 'right' })
    .fillColor(textColor)
    .text(formatDate(data.dueDate), 350, 185, { align: 'right' })
  
  // Bill To section
  doc
    .fontSize(10)
    .fillColor(primaryColor)
    .text('BILL TO', 50, 100)
    .moveDown(0.5)
  
  doc
    .fontSize(12)
    .fillColor(textColor)
    .text(data.customerName, 50, 120)
  
  if (data.customerEmail) {
    doc.fontSize(10).fillColor(mutedColor).text(data.customerEmail, 50, 138)
  }
  
  if (data.customerAddress) {
    doc.fontSize(10).fillColor(mutedColor).text(data.customerAddress, 50, 155, { width: 200 })
  }
  
  // Line items table
  const tableTop = 230
  const tableLeft = 50
  const tableWidth = 495
  
  // Table header
  doc
    .fillColor(primaryColor)
    .rect(tableLeft, tableTop, tableWidth, 25)
    .fill()
  
  doc
    .fontSize(10)
    .fillColor('#FFFFFF')
    .text('Description', tableLeft + 10, tableTop + 8)
    .text('Qty', tableLeft + 280, tableTop + 8)
    .text('Unit Price', tableLeft + 340, tableTop + 8)
    .text('Total', tableLeft + 420, tableTop + 8)
  
  // Table rows
  let currentY = tableTop + 35
  
  for (const item of data.lineItems) {
    // Alternate row background
    if (data.lineItems.indexOf(item) % 2 === 0) {
      doc.fillColor('#F9FAFB').rect(tableLeft, currentY - 5, tableWidth, 25).fill()
    }
    
    doc
      .fontSize(10)
      .fillColor(textColor)
      .text(item.description, tableLeft + 10, currentY, { width: 260 })
      .text(item.quantity.toString(), tableLeft + 280, currentY)
      .text(formatCurrency(item.unitPrice, data.currency), tableLeft + 340, currentY)
      .text(formatCurrency(item.total, data.currency), tableLeft + 420, currentY)
    
    currentY += 25
  }
  
  // Draw table border
  doc
    .strokeColor(borderColor)
    .lineWidth(1)
    .rect(tableLeft, tableTop, tableWidth, currentY - tableTop + 10)
    .stroke()
  
  // Totals section
  const totalsX = 380
  const totalsWidth = 165
  currentY += 20
  
  // Subtotal
  doc
    .fontSize(10)
    .fillColor(mutedColor)
    .text('Subtotal:', totalsX, currentY)
    .fillColor(textColor)
    .text(formatCurrency(data.subtotal, data.currency), totalsX + 80, currentY, { align: 'right', width: totalsWidth - 80 })
  
  currentY += 20
  
  // Tax
  doc
    .fillColor(mutedColor)
    .text('Tax:', totalsX, currentY)
    .fillColor(textColor)
    .text(formatCurrency(data.tax, data.currency), totalsX + 80, currentY, { align: 'right', width: totalsWidth - 80 })
  
  currentY += 25
  
  // Total with box
  doc
    .fillColor(primaryColor)
    .rect(totalsX - 10, currentY - 5, totalsWidth + 10, 30)
    .fill()
  
  doc
    .fontSize(12)
    .fillColor('#FFFFFF')
    .text('Total:', totalsX, currentY + 3)
    .font('Helvetica-Bold')
    .text(formatCurrency(data.total, data.currency), totalsX + 80, currentY + 3, { align: 'right', width: totalsWidth - 80 })
    .font('Helvetica')
  
  // Payment terms / Notes
  currentY += 60
  
  doc
    .fontSize(10)
    .fillColor(primaryColor)
    .text('PAYMENT TERMS', 50, currentY)
  
  doc
    .fontSize(10)
    .fillColor(mutedColor)
    .text(`Payment is due by ${formatDate(data.dueDate)}.`, 50, currentY + 15)
    .text('Please include the invoice number with your payment.', 50, currentY + 30)
  
  if (data.notes) {
    currentY += 60
    doc
      .fillColor(primaryColor)
      .text('NOTES', 50, currentY)
    doc
      .fillColor(mutedColor)
      .text(data.notes, 50, currentY + 15, { width: 400 })
  }
  
  // Footer
  doc
    .fontSize(9)
    .fillColor(mutedColor)
    .text(
      `Generated by ${data.organizationName} • Invoice ${data.invoiceNumber}`,
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
 * Check if an invoice PDF exists
 */
export function invoicePDFExists(pdfPath: string): boolean {
  const fullPath = path.join(process.cwd(), 'public', pdfPath.replace(/^\//, ''))
  return fs.existsSync(fullPath)
}

/**
 * Get the full filesystem path for an invoice PDF
 */
export function getInvoicePDFPath(pdfPath: string): string {
  return path.join(process.cwd(), 'public', pdfPath.replace(/^\//, ''))
}

/**
 * Delete an invoice PDF
 */
export function deleteInvoicePDF(pdfPath: string): void {
  const fullPath = getInvoicePDFPath(pdfPath)
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath)
  }
}




