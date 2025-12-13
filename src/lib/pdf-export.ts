import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

interface VendorInfo {
  storeName: string
  logoUrl?: string | null
}

export interface ReportColumn {
  header: string
  key: string
  align?: 'left' | 'center' | 'right'
  format?: 'currency' | 'number' | 'percent' | 'text'
  width?: number
}

interface ReportSection {
  title?: string
  subtitle?: string
  columns: ReportColumn[]
  data: Record<string, any>[]
  showTotals?: boolean
  totalsRow?: Record<string, any>
}

interface PDFReportConfig {
  title: string
  subtitle?: string
  dateRange?: { start: Date; end: Date }
  vendor: VendorInfo
  sections: ReportSection[]
  generatedAt?: Date
  footer?: string
}

// Modern, elegant color palette
const COLORS = {
  // Primary colors
  black: [17, 17, 17] as [number, number, number],
  darkGray: [51, 51, 51] as [number, number, number],
  mediumGray: [102, 102, 102] as [number, number, number],
  lightGray: [153, 153, 153] as [number, number, number],
  subtle: [245, 245, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],

  // Accent
  accent: [45, 45, 45] as [number, number, number],
  accentLight: [240, 240, 240] as [number, number, number],

  // Table specific
  tableHeaderBg: [250, 250, 250] as [number, number, number],
  tableHeaderText: [51, 51, 51] as [number, number, number],
  tableBorder: [230, 230, 230] as [number, number, number],
  tableAltRow: [252, 252, 252] as [number, number, number],
  totalRowBg: [245, 245, 245] as [number, number, number],
}

const formatValue = (value: any, formatType?: string): string => {
  if (value === null || value === undefined) return '—'

  switch (formatType) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value))
    case 'number':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(Number(value))
    case 'percent':
      return `${Number(value).toFixed(2)}%`
    default:
      return String(value)
  }
}

// Add page footer with page numbers and branding
const addPageFooter = (
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  vendorName: string,
  pageWidth: number,
  pageHeight: number,
  margin: number
) => {
  const footerY = pageHeight - 12

  // Subtle line above footer
  doc.setDrawColor(...COLORS.tableBorder)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

  // Vendor name on left
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.lightGray)
  doc.setFont('helvetica', 'normal')
  doc.text(vendorName, margin, footerY)

  // Page number on right
  const pageText = `${pageNum} of ${totalPages}`
  const pageTextWidth = doc.getTextWidth(pageText)
  doc.text(pageText, pageWidth - margin - pageTextWidth, footerY)
}

export async function generatePDFReport(config: PDFReportConfig): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let yPos = margin

  const generatedAt = config.generatedAt || new Date()

  // ============ HEADER ============

  // Logo handling with proper aspect ratio
  const maxLogoHeight = 14
  const maxLogoWidth = 45
  let logoHeight = maxLogoHeight
  let hasLogo = false

  if (config.vendor.logoUrl) {
    try {
      const response = await fetch(config.vendor.logoUrl)
      const blob = await response.blob()
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })

      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = base64
      })

      const aspectRatio = img.width / img.height
      let logoWidth = maxLogoHeight * aspectRatio

      if (logoWidth > maxLogoWidth) {
        logoWidth = maxLogoWidth
        logoHeight = maxLogoWidth / aspectRatio
      }

      doc.addImage(base64, 'PNG', margin, yPos, logoWidth, logoHeight)
      hasLogo = true
    } catch {
      hasLogo = false
    }
  }

  // Store name (if no logo, or alongside logo)
  if (!hasLogo) {
    doc.setFontSize(16)
    doc.setTextColor(...COLORS.black)
    doc.setFont('helvetica', 'bold')
    doc.text(config.vendor.storeName, margin, yPos + 8)
    logoHeight = 10
  }

  // Generated timestamp - top right, elegant
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.lightGray)
  doc.setFont('helvetica', 'normal')
  const dateStr = format(generatedAt, 'MMMM d, yyyy')
  const timeStr = format(generatedAt, 'h:mm a')
  const generatedWidth = Math.max(doc.getTextWidth(dateStr), doc.getTextWidth(timeStr))
  doc.text(dateStr, pageWidth - margin - generatedWidth, yPos + 4)
  doc.text(timeStr, pageWidth - margin - generatedWidth, yPos + 8)

  yPos += logoHeight + 12

  // ============ TITLE BLOCK ============

  // Report title - large and bold
  doc.setFontSize(24)
  doc.setTextColor(...COLORS.black)
  doc.setFont('helvetica', 'bold')
  doc.text(config.title, margin, yPos)
  yPos += 10

  // Subtitle
  if (config.subtitle) {
    doc.setFontSize(11)
    doc.setTextColor(...COLORS.mediumGray)
    doc.setFont('helvetica', 'normal')
    doc.text(config.subtitle, margin, yPos)
    yPos += 6
  }

  // Date range - styled elegantly
  if (config.dateRange) {
    const startStr = format(config.dateRange.start, 'MMM d, yyyy')
    const endStr = format(config.dateRange.end, 'MMM d, yyyy')
    const dateRangeText = `${startStr}  —  ${endStr}`
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.mediumGray)
    doc.setFont('helvetica', 'normal')
    doc.text(dateRangeText, margin, yPos)
    yPos += 8
  }

  // Elegant accent line
  yPos += 4
  doc.setDrawColor(...COLORS.black)
  doc.setLineWidth(0.8)
  doc.line(margin, yPos, margin + 40, yPos)
  yPos += 12

  // ============ SECTIONS ============

  for (let sectionIdx = 0; sectionIdx < config.sections.length; sectionIdx++) {
    const section = config.sections[sectionIdx]

    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage()
      yPos = margin
    }

    // Section title
    if (section.title) {
      doc.setFontSize(13)
      doc.setTextColor(...COLORS.darkGray)
      doc.setFont('helvetica', 'bold')
      doc.text(section.title.toUpperCase(), margin, yPos)
      yPos += 2

      // Subtle underline for section title
      doc.setDrawColor(...COLORS.tableBorder)
      doc.setLineWidth(0.3)
      doc.line(margin, yPos + 2, margin + doc.getTextWidth(section.title.toUpperCase()), yPos + 2)
      yPos += 8
    }

    // Section subtitle
    if (section.subtitle) {
      doc.setFontSize(9)
      doc.setTextColor(...COLORS.lightGray)
      doc.setFont('helvetica', 'normal')
      doc.text(section.subtitle, margin, yPos)
      yPos += 6
    }

    // Row count indicator
    const rowCount = section.data.length
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.lightGray)
    doc.setFont('helvetica', 'normal')
    doc.text(`${rowCount} ${rowCount === 1 ? 'row' : 'rows'}`, margin, yPos)
    yPos += 6

    // Table data
    const tableHeaders = section.columns.map((col) => col.header)
    const tableData = section.data.map((row) =>
      section.columns.map((col) => formatValue(row[col.key], col.format))
    )

    // Add totals row if specified
    if (section.showTotals && section.totalsRow) {
      tableData.push(
        section.columns.map((col, idx) => {
          if (idx === 0) return 'Total'
          const val = section.totalsRow?.[col.key]
          return val !== undefined ? formatValue(val, col.format) : ''
        })
      )
    }

    // Column styles
    const columnStyles: Record<number, any> = {}
    section.columns.forEach((col, idx) => {
      columnStyles[idx] = {
        halign: col.align || (col.format === 'currency' || col.format === 'number' || col.format === 'percent' ? 'right' : 'left'),
        cellWidth: col.width || 'auto',
      }
    })

    const hasTotal = section.showTotals && section.totalsRow

    autoTable(doc, {
      startY: yPos,
      head: [tableHeaders],
      body: tableData,
      margin: { left: margin, right: margin },
      tableLineColor: COLORS.tableBorder,
      tableLineWidth: 0,
      styles: {
        fontSize: 9,
        cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
        lineColor: COLORS.tableBorder,
        lineWidth: 0,
        textColor: COLORS.darkGray,
        font: 'helvetica',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: COLORS.tableHeaderBg,
        textColor: COLORS.tableHeaderText,
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
        lineWidth: 0,
      },
      bodyStyles: {
        fillColor: COLORS.white,
        lineWidth: 0,
      },
      alternateRowStyles: {
        fillColor: COLORS.tableAltRow,
      },
      columnStyles,
      willDrawCell: (data) => {
        // Style the totals row differently
        if (hasTotal && data.row.index === tableData.length - 1 && data.section === 'body') {
          data.cell.styles.fillColor = COLORS.totalRowBg
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.textColor = COLORS.black
        }
      },
      didDrawPage: () => {
        // Footer will be added after all content
      },
    })

    // @ts-ignore
    yPos = (doc as any).lastAutoTable.finalY + 16
  }

  // ============ CUSTOM FOOTER TEXT ============

  if (config.footer) {
    if (yPos > pageHeight - 35) {
      doc.addPage()
      yPos = margin
    }
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.lightGray)
    doc.setFont('helvetica', 'italic')
    doc.text(config.footer, margin, yPos)
  }

  // ============ ADD PAGE FOOTERS ============

  const totalPages = doc.internal.pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addPageFooter(doc, i, totalPages, config.vendor.storeName, pageWidth, pageHeight, margin)
  }

  // ============ SAVE ============

  const fileName = `${config.title.toLowerCase().replace(/\s+/g, '-')}-${format(generatedAt, 'yyyy-MM-dd')}.pdf`
  doc.save(fileName)
}

// Quick helper for simple table reports
export async function exportTableAsPDF(
  title: string,
  data: Record<string, any>[],
  vendor: VendorInfo,
  options?: {
    subtitle?: string
    dateRange?: { start: Date; end: Date }
    showTotals?: boolean
    currencyColumns?: string[]
    numberColumns?: string[]
    percentColumns?: string[]
  }
): Promise<void> {
  if (data.length === 0) return

  const columns = Object.keys(data[0])
  const currencyColumns = options?.currencyColumns || []
  const numberColumns = options?.numberColumns || []
  const percentColumns = options?.percentColumns || []

  const reportColumns: ReportColumn[] = columns.map((key) => ({
    header: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    key,
    format: currencyColumns.includes(key)
      ? 'currency'
      : numberColumns.includes(key)
      ? 'number'
      : percentColumns.includes(key)
      ? 'percent'
      : 'text',
  }))

  // Calculate totals if needed
  let totalsRow: Record<string, any> | undefined
  if (options?.showTotals) {
    totalsRow = {}
    columns.forEach((key) => {
      if (currencyColumns.includes(key) || numberColumns.includes(key)) {
        totalsRow![key] = data.reduce((sum, row) => sum + (Number(row[key]) || 0), 0)
      }
    })
  }

  await generatePDFReport({
    title,
    subtitle: options?.subtitle,
    vendor,
    dateRange: options?.dateRange,
    sections: [
      {
        columns: reportColumns,
        data,
        showTotals: options?.showTotals,
        totalsRow,
      },
    ],
  })
}

// Financial report specific export
export async function exportFinancialReportPDF(
  vendor: VendorInfo,
  dateRange: { start: Date; end: Date },
  monthlyData: Array<{
    month: string
    revenue: number
    tax: number
    discounts: number
    netRevenue: number
    orders: number
  }>,
  summaryTotals: {
    grossRevenue: number
    taxCollected: number
    discountsGiven: number
    netRevenue: number
    totalOrders: number
    avgOrderValue: number
  }
): Promise<void> {
  await generatePDFReport({
    title: 'Financial Report',
    subtitle: 'Revenue, Tax & Discount Summary',
    vendor,
    dateRange,
    sections: [
      // Executive Summary
      {
        title: 'Executive Summary',
        columns: [
          { header: 'Metric', key: 'metric', align: 'left' },
          { header: 'Value', key: 'value', align: 'right', format: 'currency' },
        ],
        data: [
          { metric: 'Gross Revenue', value: summaryTotals.grossRevenue },
          { metric: 'Discounts Applied', value: summaryTotals.discountsGiven },
          { metric: 'Net Revenue', value: summaryTotals.netRevenue },
          { metric: 'Tax Collected', value: summaryTotals.taxCollected },
          { metric: 'Total Orders', value: summaryTotals.totalOrders },
          { metric: 'Average Order Value', value: summaryTotals.avgOrderValue },
        ],
      },
      // Monthly Performance
      {
        title: 'Monthly Performance',
        columns: [
          { header: 'Period', key: 'month', align: 'left' },
          { header: 'Orders', key: 'orders', align: 'right', format: 'number' },
          { header: 'Gross Revenue', key: 'revenue', align: 'right', format: 'currency' },
          { header: 'Tax', key: 'tax', align: 'right', format: 'currency' },
          { header: 'Discounts', key: 'discounts', align: 'right', format: 'currency' },
          { header: 'Net Revenue', key: 'netRevenue', align: 'right', format: 'currency' },
        ],
        data: monthlyData,
        showTotals: true,
        totalsRow: {
          orders: summaryTotals.totalOrders,
          revenue: summaryTotals.grossRevenue,
          tax: summaryTotals.taxCollected,
          discounts: summaryTotals.discountsGiven,
          netRevenue: summaryTotals.netRevenue,
        },
      },
    ],
    footer: 'Confidential — For internal use only',
  })
}
