'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from '@/lib/supabase'
import {
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
  parseISO,
} from 'date-fns'
import {
  Download,
  Play,
  Calendar,
  Layers,
  BarChart3,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  FileText,
} from 'lucide-react'
import { generatePDFReport, type ReportColumn as PDFColumn } from '@/lib/pdf-export'

// ============ TYPES ============

export type Dimension =
  | 'date'
  | 'location'
  | 'category'
  | 'product'
  | 'order_type'
  | 'payment_method'
  | 'employee'
  | 'state'
  | 'channel'

export type DateGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year'

export type Metric =
  | 'orders'
  | 'gross_sales'
  | 'discounts'
  | 'net_sales'
  | 'tax'
  | 'total'
  | 'quantity'
  | 'items'
  | 'avg_order_value'
  | 'items_per_order'
  | 'cost'
  | 'profit'
  | 'margin'

export type Channel = 'online' | 'in_store'

export interface ReportConfig {
  dimensions: Dimension[]
  dateGranularity: DateGranularity
  metrics: Metric[]
  dateRange: {
    start: Date
    end: Date
  }
  filters: {
    locationIds: string[]
    orderTypes: string[]
    paymentMethods: string[]
    channels: Channel[]
  }
}

export interface ReportRow {
  [key: string]: string | number
}

interface Location {
  id: string
  name: string
  state: string | null
}

interface Category {
  id: string
  name: string
}

// ============ CONSTANTS ============

const DIMENSION_OPTIONS: { value: Dimension; label: string; description: string }[] = [
  { value: 'date', label: 'Date', description: 'Group by time period' },
  { value: 'location', label: 'Location', description: 'Group by store location' },
  { value: 'channel', label: 'Channel', description: 'Online vs In-Store sales' },
  { value: 'category', label: 'Category', description: 'Group by product category' },
  { value: 'product', label: 'Product', description: 'Group by individual product' },
  { value: 'order_type', label: 'Order Type', description: 'Walk-in, Pickup, Delivery, Shipping' },
  { value: 'payment_method', label: 'Payment Method', description: 'Cash, Card, etc.' },
  { value: 'employee', label: 'Employee', description: 'Group by staff member' },
  { value: 'state', label: 'State', description: 'Group by state/region' },
]

const DATE_GRANULARITY_OPTIONS: { value: DateGranularity; label: string }[] = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Yearly' },
]

const METRIC_OPTIONS: { value: Metric; label: string; description: string }[] = [
  { value: 'orders', label: 'Orders', description: 'Number of orders' },
  { value: 'gross_sales', label: 'Gross Sales', description: 'Total before discounts' },
  { value: 'discounts', label: 'Discounts', description: 'Total discounts applied' },
  { value: 'net_sales', label: 'Net Sales', description: 'Gross - Discounts' },
  { value: 'tax', label: 'Tax', description: 'Tax collected' },
  { value: 'total', label: 'Total', description: 'Final amount charged' },
  { value: 'quantity', label: 'Quantity', description: 'Units sold' },
  { value: 'items', label: 'Line Items', description: 'Number of line items' },
  { value: 'avg_order_value', label: 'Avg Order Value', description: 'Total / Orders' },
  { value: 'items_per_order', label: 'Items/Order', description: 'Average items per order' },
  { value: 'cost', label: 'Cost (COGS)', description: 'Cost of goods sold' },
  { value: 'profit', label: 'Gross Profit', description: 'Revenue - COGS' },
  { value: 'margin', label: 'Margin %', description: 'Profit margin percentage' },
]

const DEFAULT_CONFIG: ReportConfig = {
  dimensions: ['date'],
  dateGranularity: 'day',
  metrics: ['orders', 'gross_sales', 'net_sales', 'tax', 'total'],
  dateRange: {
    start: subMonths(new Date(), 1),
    end: new Date(),
  },
  filters: {
    locationIds: [],
    orderTypes: [],
    paymentMethods: [],
    channels: [],
  },
}

// Helper to determine if an order is online or in-store
const getOrderChannel = (order: { pickup_location_id: string | null; order_type: string | null }): Channel => {
  // Online = shipping orders OR orders without a pickup location (e-commerce)
  // In-Store = walk_in, pickup, or any order with a pickup location
  if (order.order_type === 'shipping' || !order.pickup_location_id) {
    return 'online'
  }
  return 'in_store'
}

// ============ COMPONENT ============

export default function ReportBuilder() {
  const { vendorId, vendor } = useAuthStore()
  const [config, setConfig] = useState<ReportConfig>(DEFAULT_CONFIG)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [results, setResults] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Fetch locations for filter dropdown
  useEffect(() => {
    async function fetchLocations() {
      if (!vendorId) return
      const { data } = await supabase
        .from('locations')
        .select('id, name, state')
        .eq('vendor_id', vendorId)
        .eq('is_active', true)
      setLocations(data || [])
    }
    fetchLocations()
  }, [vendorId])

  // Fetch categories for filter dropdown
  useEffect(() => {
    async function fetchCategories() {
      if (!vendorId) return
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .eq('vendor_id', vendorId)
        .order('name')
      setCategories(data || [])
    }
    fetchCategories()
  }, [vendorId])

  const toggleDimension = (dim: Dimension) => {
    setConfig((prev) => ({
      ...prev,
      dimensions: prev.dimensions.includes(dim)
        ? prev.dimensions.filter((d) => d !== dim)
        : [...prev.dimensions, dim],
    }))
  }

  const toggleMetric = (metric: Metric) => {
    setConfig((prev) => ({
      ...prev,
      metrics: prev.metrics.includes(metric)
        ? prev.metrics.filter((m) => m !== metric)
        : [...prev.metrics, metric],
    }))
  }

  const formatDateKey = (dateStr: string, granularity: DateGranularity): string => {
    const date = parseISO(dateStr)
    switch (granularity) {
      case 'day':
        return format(date, 'MMM d, yyyy')
      case 'week':
        return `Week of ${format(startOfWeek(date), 'MMM d, yyyy')}`
      case 'month':
        return format(date, 'MMMM yyyy')
      case 'quarter':
        const q = Math.ceil((date.getMonth() + 1) / 3)
        return `Q${q} ${date.getFullYear()}`
      case 'year':
        return format(date, 'yyyy')
      default:
        return dateStr
    }
  }

  const getDateGroupKey = (dateStr: string, granularity: DateGranularity): string => {
    const date = parseISO(dateStr)
    switch (granularity) {
      case 'day':
        return format(startOfDay(date), 'yyyy-MM-dd')
      case 'week':
        return format(startOfWeek(date), 'yyyy-MM-dd')
      case 'month':
        return format(startOfMonth(date), 'yyyy-MM')
      case 'quarter':
        return format(startOfQuarter(date), 'yyyy-QQQ')
      case 'year':
        return format(startOfYear(date), 'yyyy')
      default:
        return dateStr
    }
  }

  const runReport = useCallback(async () => {
    if (!vendorId) return
    if (config.dimensions.length === 0) {
      setError('Please select at least one dimension')
      return
    }
    if (config.metrics.length === 0) {
      setError('Please select at least one metric')
      return
    }

    setLoading(true)
    setError(null)
    setResults([])

    try {
      const needsLineItems =
        config.dimensions.includes('product') ||
        config.dimensions.includes('category') ||
        config.metrics.includes('quantity') ||
        config.metrics.includes('items') ||
        config.metrics.includes('items_per_order')

      const needsCogs =
        config.metrics.includes('cost') ||
        config.metrics.includes('profit') ||
        config.metrics.includes('margin')

      // Build aggregation maps
      const aggregationMap = new Map<
        string,
        {
          keys: Record<string, string>
          orders: Set<string>
          gross_sales: number
          discounts: number
          tax: number
          total: number
          quantity: number
          items: number
          cost: number
          profit: number
        }
      >()

      // Fetch orders
      const pageSize = 1000
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('orders')
          .select(
            `
            id,
            created_at,
            pickup_location_id,
            order_type,
            payment_method,
            created_by_user_id,
            subtotal,
            discount_amount,
            tax_amount,
            total_amount,
            affiliate_discount_amount,
            metadata,
            shipping_state,
            locations!pickup_location_id (id, name, state),
            users!created_by_user_id (id, first_name, last_name)
          `
          )
          .eq('vendor_id', vendorId)
          .eq('payment_status', 'paid')
          .neq('status', 'cancelled')
          .gte('created_at', config.dateRange.start.toISOString())
          .lte('created_at', config.dateRange.end.toISOString())

        // Apply filters
        if (config.filters.locationIds.length > 0) {
          query = query.in('pickup_location_id', config.filters.locationIds)
        }
        if (config.filters.orderTypes.length > 0) {
          query = query.in('order_type', config.filters.orderTypes)
        }
        if (config.filters.paymentMethods.length > 0) {
          query = query.in('payment_method', config.filters.paymentMethods)
        }

        query = query.range(page * pageSize, (page + 1) * pageSize - 1)

        const { data: orders, error: ordersError } = await query

        if (ordersError) throw ordersError

        if (!orders || orders.length === 0) {
          hasMore = false
          continue
        }

        // Process orders
        for (const order of orders) {
          // Build group key from dimensions
          const keyParts: Record<string, string> = {}

          for (const dim of config.dimensions) {
            switch (dim) {
              case 'date':
                keyParts.date = getDateGroupKey(order.created_at, config.dateGranularity)
                keyParts.date_display = formatDateKey(order.created_at, config.dateGranularity)
                break
              case 'location':
                // If order is online (shipping), show as E-Commerce, not the fulfillment location
                const isOnlineOrder = order.order_type === 'shipping' || !order.pickup_location_id
                if (isOnlineOrder) {
                  keyParts.location = 'E-Commerce'
                } else {
                  const loc = order.locations as any
                  keyParts.location = loc?.name || 'Unknown'
                }
                break
              case 'order_type':
                keyParts.order_type = order.order_type || 'Unknown'
                break
              case 'payment_method':
                keyParts.payment_method = formatPaymentMethod(order.payment_method || 'Unknown')
                break
              case 'employee':
                const user = order.users as any
                keyParts.employee = user ? `${user.first_name} ${user.last_name}` : 'Unknown'
                break
              case 'state':
                const locState = order.locations as any
                keyParts.state = locState?.state || order.shipping_state || 'Unknown'
                break
              case 'channel':
                const channel = getOrderChannel(order)
                keyParts.channel = channel === 'online' ? 'Online' : 'In-Store'
                break
            }
          }

          // Apply channel filter if set
          if (config.filters.channels.length > 0) {
            const orderChannel = getOrderChannel(order)
            if (!config.filters.channels.includes(orderChannel)) continue
          }

          // Skip product/category for now at order level - will handle with line items
          if (!config.dimensions.includes('product') && !config.dimensions.includes('category')) {
            const groupKey = Object.values(keyParts).join('|')

            if (!aggregationMap.has(groupKey)) {
              aggregationMap.set(groupKey, {
                keys: keyParts,
                orders: new Set(),
                gross_sales: 0,
                discounts: 0,
                tax: 0,
                total: 0,
                quantity: 0,
                items: 0,
                cost: 0,
                profit: 0,
              })
            }

            const agg = aggregationMap.get(groupKey)!
            agg.orders.add(order.id)

            // subtotal in DB is GROSS (pre-discount)
            // Formula: total_amount = subtotal - discount_amount + tax_amount + shipping_cost
            // So: Gross = subtotal
            //     Net = subtotal - discounts
            //     Total = total_amount
            const subtotal = parseFloat(order.subtotal || 0)  // This is GROSS (pre-discount)

            // Avoid double-counting: use discount_amount if populated, else use metadata
            let discounts = parseFloat(order.discount_amount || 0)
            if (discounts === 0) {
              discounts =
                parseFloat(order.metadata?.loyalty_discount_amount || 0) +
                parseFloat(order.metadata?.campaign_discount_amount || 0) +
                parseFloat(order.affiliate_discount_amount || 0)
            }

            agg.gross_sales += subtotal  // Gross is the subtotal (pre-discount)
            agg.discounts += discounts
            agg.tax += parseFloat(order.tax_amount || 0)
            agg.total += parseFloat(order.total_amount || 0)
          }
        }

        hasMore = orders.length === pageSize
        page++
      }

      // Fetch COGS data at order level if needed but not using line items
      if (needsCogs && !needsLineItems) {
        const orderIds = Array.from(aggregationMap.keys())
          .map(key => {
            const agg = aggregationMap.get(key)!
            return Array.from(agg.orders)
          })
          .flat()

        if (orderIds.length > 0) {
          // Fetch aggregated COGS per order
          const batchSize = 100
          for (let i = 0; i < orderIds.length; i += batchSize) {
            const batchIds = orderIds.slice(i, i + batchSize)

            const { data: cogsData } = await supabase
              .from('order_items')
              .select('order_id, cost_per_unit, profit_per_unit, quantity')
              .in('order_id', batchIds)

            if (cogsData) {
              // Aggregate COGS by order
              const cogsByOrder = new Map<string, { cost: number; profit: number }>()

              for (const item of cogsData) {
                const existing = cogsByOrder.get(item.order_id) || { cost: 0, profit: 0 }
                const qty = parseFloat(item.quantity || 0)
                existing.cost += parseFloat(item.cost_per_unit || 0) * qty
                existing.profit += parseFloat(item.profit_per_unit || 0) * qty
                cogsByOrder.set(item.order_id, existing)
              }

              // Apply COGS to aggregation map
              for (const [groupKey, agg] of aggregationMap) {
                for (const orderId of agg.orders) {
                  const orderCogs = cogsByOrder.get(orderId)
                  if (orderCogs) {
                    agg.cost += orderCogs.cost
                    agg.profit += orderCogs.profit
                  }
                }
              }
            }
          }
        }
      }

      // If we need line item data (product, category, quantity, items)
      if (needsLineItems) {
        // Clear the aggregation map since we'll rebuild from line items
        aggregationMap.clear()

        // First get all orders with their details in the date range
        const ordersMap = new Map<string, any>()
        page = 0
        hasMore = true

        while (hasMore) {
          let orderQuery = supabase
            .from('orders')
            .select(`
              id,
              created_at,
              pickup_location_id,
              order_type,
              payment_method,
              created_by_user_id,
              shipping_state,
              locations!pickup_location_id (id, name, state),
              users!created_by_user_id (id, first_name, last_name)
            `)
            .eq('vendor_id', vendorId)
            .eq('payment_status', 'paid')
            .neq('status', 'cancelled')
            .gte('created_at', config.dateRange.start.toISOString())
            .lte('created_at', config.dateRange.end.toISOString())

          if (config.filters.locationIds.length > 0) {
            orderQuery = orderQuery.in('pickup_location_id', config.filters.locationIds)
          }
          if (config.filters.orderTypes.length > 0) {
            orderQuery = orderQuery.in('order_type', config.filters.orderTypes)
          }
          if (config.filters.paymentMethods.length > 0) {
            orderQuery = orderQuery.in('payment_method', config.filters.paymentMethods)
          }

          orderQuery = orderQuery.range(page * pageSize, (page + 1) * pageSize - 1)

          const { data: ordersData, error: ordersErr } = await orderQuery

          if (ordersErr) {
            console.error('Orders error:', ordersErr)
            break
          }

          if (!ordersData || ordersData.length === 0) {
            hasMore = false
            continue
          }

          for (const order of ordersData) {
            ordersMap.set(order.id, order)
          }

          hasMore = ordersData.length === pageSize
          page++
        }

        if (ordersMap.size === 0) {
          setResults([])
          setLoading(false)
          return
        }

        const validOrderIds = Array.from(ordersMap.keys())

        // Fetch line items in batches (Supabase has URL length limits with UUIDs)
        const batchSize = 20
        for (let i = 0; i < validOrderIds.length; i += batchSize) {
          const batchIds = validOrderIds.slice(i, i + batchSize)

          const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select(`
              id,
              order_id,
              product_name,
              product_id,
              quantity,
              line_subtotal,
              line_total,
              tax_amount,
              cost_per_unit,
              profit_per_unit,
              margin_percentage,
              products (
                id,
                name,
                primary_category_id,
                categories:primary_category_id (id, name)
              )
            `)
            .in('order_id', batchIds)

          if (itemsError) {
            console.error('Items error:', itemsError)
            continue
          }

          if (!items || items.length === 0) continue

          for (const item of items) {
            const order = ordersMap.get(item.order_id)
            if (!order) continue

            const keyParts: Record<string, string> = {}

            for (const dim of config.dimensions) {
              switch (dim) {
                case 'date':
                  keyParts.date = getDateGroupKey(order.created_at, config.dateGranularity)
                  keyParts.date_display = formatDateKey(order.created_at, config.dateGranularity)
                  break
                case 'location':
                  // If order is online (shipping), show as E-Commerce, not the fulfillment location
                  const isOnlineOrderItem = order.order_type === 'shipping' || !order.pickup_location_id
                  if (isOnlineOrderItem) {
                    keyParts.location = 'E-Commerce'
                  } else {
                    const loc = order.locations as any
                    keyParts.location = loc?.name || 'Unknown'
                  }
                  break
                case 'order_type':
                  keyParts.order_type = order.order_type || 'Unknown'
                  break
                case 'payment_method':
                  keyParts.payment_method = formatPaymentMethod(order.payment_method || 'Unknown')
                  break
                case 'employee':
                  const user = order.users as any
                  keyParts.employee = user ? `${user.first_name} ${user.last_name}` : 'Unknown'
                  break
                case 'state':
                  const locState = order.locations as any
                  keyParts.state = locState?.state || order.shipping_state || 'Unknown'
                  break
                case 'product':
                  keyParts.product = item.product_name || 'Unknown Product'
                  break
                case 'category':
                  const product = item.products as any
                  const cat = product?.categories as any
                  keyParts.category = cat?.name || 'Uncategorized'
                  break
                case 'channel':
                  const itemChannel = getOrderChannel(order)
                  keyParts.channel = itemChannel === 'online' ? 'Online' : 'In-Store'
                  break
              }
            }

            const groupKey = Object.values(keyParts).join('|')

            if (!aggregationMap.has(groupKey)) {
              aggregationMap.set(groupKey, {
                keys: keyParts,
                orders: new Set(),
                gross_sales: 0,
                discounts: 0,
                tax: 0,
                total: 0,
                quantity: 0,
                items: 0,
                cost: 0,
                profit: 0,
              })
            }

            const agg = aggregationMap.get(groupKey)!
            agg.orders.add(order.id)

            // Line item calculation - consistent with order level
            const itemSubtotal = parseFloat(item.line_subtotal || 0)
            const itemTotal = parseFloat(item.line_total || 0)
            const itemTax = parseFloat(item.tax_amount || 0)
            const itemQuantity = parseFloat(item.quantity || 0)

            // Calculate discount as subtotal - total + tax (since total = subtotal - discount + tax)
            const itemDiscount = itemSubtotal - (itemTotal - itemTax)

            // Get COGS data if available
            const itemCostPerUnit = parseFloat(item.cost_per_unit || 0)
            const itemProfitPerUnit = parseFloat(item.profit_per_unit || 0)

            agg.gross_sales += itemSubtotal
            agg.discounts += itemDiscount
            agg.tax += itemTax
            agg.total += itemTotal
            agg.quantity += itemQuantity
            agg.items += 1
            agg.cost += itemCostPerUnit * itemQuantity
            agg.profit += itemProfitPerUnit * itemQuantity
          }
        }
      }

      // Convert aggregation map to results
      const reportResults: ReportRow[] = []

      for (const [, agg] of aggregationMap) {
        const row: ReportRow = {}

        // Add dimension columns
        for (const dim of config.dimensions) {
          if (dim === 'date') {
            row['Date'] = agg.keys.date_display || agg.keys.date
          } else {
            const label = DIMENSION_OPTIONS.find((d) => d.value === dim)?.label || dim
            row[label] = agg.keys[dim] || 'Unknown'
          }
        }

        // Add metric columns
        for (const metric of config.metrics) {
          const orderCount = agg.orders.size
          switch (metric) {
            case 'orders':
              row['Orders'] = orderCount
              break
            case 'gross_sales':
              row['Gross Sales'] = Math.round(agg.gross_sales * 100) / 100
              break
            case 'discounts':
              row['Discounts'] = Math.round(agg.discounts * 100) / 100
              break
            case 'net_sales':
              row['Net Sales'] = Math.round((agg.gross_sales - agg.discounts) * 100) / 100
              break
            case 'tax':
              row['Tax'] = Math.round(agg.tax * 100) / 100
              break
            case 'total':
              row['Total'] = Math.round(agg.total * 100) / 100
              break
            case 'quantity':
              row['Quantity'] = Math.round(agg.quantity * 100) / 100
              break
            case 'items':
              row['Line Items'] = agg.items
              break
            case 'avg_order_value':
              row['Avg Order Value'] = orderCount > 0 ? Math.round((agg.total / orderCount) * 100) / 100 : 0
              break
            case 'items_per_order':
              row['Items/Order'] = orderCount > 0 ? Math.round((agg.items / orderCount) * 100) / 100 : 0
              break
            case 'cost':
              row['Cost (COGS)'] = Math.round(agg.cost * 100) / 100
              break
            case 'profit':
              row['Gross Profit'] = Math.round(agg.profit * 100) / 100
              break
            case 'margin':
              const revenue = agg.gross_sales - agg.discounts
              row['Margin %'] = revenue > 0 ? Math.round((agg.profit / revenue) * 10000) / 100 : 0
              break
          }
        }

        // Store sortable date key for proper chronological sorting
        if (agg.keys.date) {
          row['_date_sort'] = agg.keys.date
        }

        reportResults.push(row)
      }

      // Sort results
      reportResults.sort((a, b) => {
        // Sort by first dimension
        const firstDim = config.dimensions[0]
        if (firstDim === 'date') {
          // Sort dates chronologically using the sortable key (yyyy-MM-dd format)
          const dateA = (a['_date_sort'] as string) || ''
          const dateB = (b['_date_sort'] as string) || ''
          return dateA.localeCompare(dateB)
        }
        // Sort others alphabetically
        const labelA = DIMENSION_OPTIONS.find((d) => d.value === firstDim)?.label || firstDim
        const valA = (a[labelA] as string) || ''
        const valB = (b[labelA] as string) || ''
        return valA.localeCompare(valB)
      })

      // Remove hidden sort keys before displaying
      for (const row of reportResults) {
        delete row['_date_sort']
      }

      setResults(reportResults)
    } catch (err: any) {
      console.error('Report error:', err)
      setError(err.message || 'Failed to run report')
    } finally {
      setLoading(false)
    }
  }, [vendorId, config])

  const exportCSV = useCallback(() => {
    if (results.length === 0) return

    const headers = Object.keys(results[0])
    const csv = [
      headers.join(','),
      ...results.map((row) =>
        headers
          .map((h) => {
            const val = row[h]
            if (typeof val === 'string' && val.includes(',')) {
              return `"${val}"`
            }
            return val
          })
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [results])

  const exportPDF = useCallback(async () => {
    if (results.length === 0 || !vendor) return

    setExportingPDF(true)
    try {
      const headers = Object.keys(results[0])

      // Build columns with appropriate formatting
      const pdfColumns: PDFColumn[] = headers.map((header) => {
        const isCurrency = ['Gross Sales', 'Discounts', 'Net Sales', 'Tax', 'Total', 'Avg Order Value', 'Cost (COGS)', 'Gross Profit'].includes(header)
        const isNumber = ['Orders', 'Quantity', 'Line Items'].includes(header)
        const isPercent = header.includes('%')

        return {
          header,
          key: header,
          align: isCurrency || isNumber || isPercent ? 'right' : 'left',
          format: isCurrency ? 'currency' : isNumber ? 'number' : isPercent ? 'percent' : 'text',
        }
      })

      // Calculate totals
      const totalsRow: Record<string, any> = {}
      headers.forEach((header, idx) => {
        if (idx === 0) return
        const firstVal = results[0][header]
        if (typeof firstVal === 'number') {
          const isAvg = header.includes('Avg') || header.includes('/Order')
          const sum = results.reduce((acc, row) => acc + (row[header] as number), 0)
          totalsRow[header] = isAvg ? sum / results.length : sum
        }
      })

      // Build title based on dimensions
      const dimensionLabels = config.dimensions
        .map((d) => DIMENSION_OPTIONS.find((opt) => opt.value === d)?.label)
        .filter(Boolean)
        .join(' by ')

      await generatePDFReport({
        title: `Sales Report${dimensionLabels ? ` by ${dimensionLabels}` : ''}`,
        subtitle: `${config.dateGranularity.charAt(0).toUpperCase() + config.dateGranularity.slice(1)} breakdown`,
        vendor: {
          storeName: vendor.store_name || 'Store',
          logoUrl: vendor.logo_url,
        },
        dateRange: config.dateRange,
        sections: [
          {
            title: 'Report Data',
            subtitle: `${results.length} rows`,
            columns: pdfColumns,
            data: results.map((row) => {
              const obj: Record<string, any> = {}
              headers.forEach((h) => {
                obj[h] = row[h]
              })
              return obj
            }),
            showTotals: true,
            totalsRow,
          },
        ],
        footer: 'Confidential - For internal use only',
      })
    } catch (err) {
      console.error('PDF export error:', err)
    } finally {
      setExportingPDF(false)
    }
  }, [results, vendor, config])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)

  const isCurrencyColumn = (col: string) =>
    ['Gross Sales', 'Discounts', 'Net Sales', 'Tax', 'Total', 'Avg Order Value', 'Cost (COGS)', 'Gross Profit'].includes(col)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-light text-white tracking-wide">Report Builder</h2>
          <p className="text-zinc-500 text-sm mt-1">Create custom reports by selecting dimensions and metrics</p>
        </div>
        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <>
              <button
                onClick={exportPDF}
                disabled={exportingPDF}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 transition-colors text-sm disabled:opacity-50"
              >
                {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Export PDF
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </>
          )}
          <button
            onClick={runReport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white transition-colors text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Report
          </button>
        </div>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Dimensions */}
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-light text-white">Group By (Dimensions)</h3>
          </div>
          <div className="space-y-2">
            {DIMENSION_OPTIONS.map((dim) => (
              <label
                key={dim.value}
                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                  config.dimensions.includes(dim.value)
                    ? 'bg-slate-800/30 border border-slate-700'
                    : 'hover:bg-zinc-900'
                }`}
              >
                <input
                  type="checkbox"
                  checked={config.dimensions.includes(dim.value)}
                  onChange={() => toggleDimension(dim.value)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-slate-400 focus:ring-slate-500 accent-slate-500"
                />
                <div>
                  <div className="text-sm text-white">{dim.label}</div>
                  <div className="text-xs text-zinc-500">{dim.description}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Date Granularity */}
          {config.dimensions.includes('date') && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">
                Date Granularity
              </label>
              <select
                value={config.dateGranularity}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, dateGranularity: e.target.value as DateGranularity }))
                }
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-zinc-700"
              >
                {DATE_GRANULARITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-light text-white">Metrics</h3>
          </div>
          <div className="space-y-2">
            {METRIC_OPTIONS.map((metric) => (
              <label
                key={metric.value}
                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                  config.metrics.includes(metric.value)
                    ? 'bg-slate-800/30 border border-slate-700'
                    : 'hover:bg-zinc-900'
                }`}
              >
                <input
                  type="checkbox"
                  checked={config.metrics.includes(metric.value)}
                  onChange={() => toggleMetric(metric.value)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-slate-400 focus:ring-slate-500 accent-slate-500"
                />
                <div>
                  <div className="text-sm text-white">{metric.label}</div>
                  <div className="text-xs text-zinc-500">{metric.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-light text-white">Date Range</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Start Date</label>
              <input
                type="date"
                value={`${config.dateRange.start.getFullYear()}-${String(config.dateRange.start.getMonth() + 1).padStart(2, '0')}-${String(config.dateRange.start.getDate()).padStart(2, '0')}`}
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split('-').map(Number)
                  setConfig((prev) => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: new Date(y, m - 1, d, 0, 0, 0, 0) },
                  }))
                }}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-zinc-700 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">End Date</label>
              <input
                type="date"
                value={`${config.dateRange.end.getFullYear()}-${String(config.dateRange.end.getMonth() + 1).padStart(2, '0')}-${String(config.dateRange.end.getDate()).padStart(2, '0')}`}
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split('-').map(Number)
                  setConfig((prev) => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: new Date(y, m - 1, d, 23, 59, 59, 999) },
                  }))
                }}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-zinc-700 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Additional Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-800 w-full text-left text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <Filter className="w-4 h-4" />
            Additional Filters
            {showFilters ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
          </button>

          {showFilters && (
            <div className="mt-3 space-y-3">
              {/* Location Filter */}
              {locations.length > 0 && (
                <div>
                  <label className="text-xs text-zinc-500 block mb-2">Locations</label>
                  <div className="flex flex-wrap gap-2">
                    {locations.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => {
                          setConfig((prev) => ({
                            ...prev,
                            filters: {
                              ...prev.filters,
                              locationIds: prev.filters.locationIds.includes(loc.id)
                                ? prev.filters.locationIds.filter((id) => id !== loc.id)
                                : [...prev.filters.locationIds, loc.id],
                            },
                          }))
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          config.filters.locationIds.includes(loc.id)
                            ? 'bg-slate-700/40 text-slate-300 border border-slate-600'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                  {config.filters.locationIds.length > 0 && (
                    <button
                      onClick={() => setConfig((prev) => ({ ...prev, filters: { ...prev.filters, locationIds: [] } }))}
                      className="text-xs text-zinc-500 hover:text-zinc-300 mt-2"
                    >
                      Clear locations
                    </button>
                  )}
                </div>
              )}

              {/* Channel Filter */}
              <div>
                <label className="text-xs text-zinc-500 block mb-2">Sales Channel</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'in_store' as Channel, label: 'In-Store' },
                    { value: 'online' as Channel, label: 'Online' },
                  ].map((ch) => (
                    <button
                      key={ch.value}
                      onClick={() => {
                        setConfig((prev) => ({
                          ...prev,
                          filters: {
                            ...prev.filters,
                            channels: prev.filters.channels.includes(ch.value)
                              ? prev.filters.channels.filter((c) => c !== ch.value)
                              : [...prev.filters.channels, ch.value],
                          },
                        }))
                      }}
                      className={`px-3 py-1.5 text-xs rounded transition-colors ${
                        config.filters.channels.includes(ch.value)
                          ? 'bg-slate-700/40 text-slate-300 border border-slate-600'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Type Filter */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Order Types</label>
                <div className="flex flex-wrap gap-2">
                  {['walk_in', 'pickup', 'delivery', 'shipping'].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setConfig((prev) => ({
                          ...prev,
                          filters: {
                            ...prev.filters,
                            orderTypes: prev.filters.orderTypes.includes(type)
                              ? prev.filters.orderTypes.filter((t) => t !== type)
                              : [...prev.filters.orderTypes, type],
                          },
                        }))
                      }}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        config.filters.orderTypes.includes(type)
                          ? 'bg-slate-700/40 text-slate-300 border border-slate-600'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-zinc-900/50 border border-zinc-700 text-zinc-400 px-4 py-3 text-sm flex items-center gap-2">
          <X className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-zinc-950 border border-zinc-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-900 flex items-center justify-between">
            <h3 className="text-sm font-light text-white">
              Results ({results.length.toLocaleString()} rows)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-zinc-900">
                <tr>
                  {Object.keys(results[0]).map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-light text-zinc-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {results.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-900/50 transition-colors">
                    {Object.entries(row).map(([col, value], j) => (
                      <td
                        key={j}
                        className={`px-4 py-3 text-sm whitespace-nowrap ${
                          typeof value === 'number' ? 'text-right' : ''
                        } ${
                          isCurrencyColumn(col)
                            ? 'text-slate-300'
                            : typeof value === 'number'
                            ? 'text-zinc-300'
                            : 'text-white'
                        }`}
                      >
                        {typeof value === 'number'
                          ? isCurrencyColumn(col)
                            ? formatCurrency(value)
                            : formatNumber(value)
                          : value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot className="border-t border-zinc-800 bg-zinc-900/30">
                <tr>
                  {Object.entries(results[0]).map(([col, value], j) => {
                    if (j === 0) {
                      return (
                        <td key={j} className="px-4 py-3 text-sm font-medium text-white">
                          Total
                        </td>
                      )
                    }
                    if (typeof value === 'number') {
                      const sum = results.reduce((acc, row) => acc + (row[col] as number), 0)
                      const isAvg = col.includes('Avg') || col.includes('/Order')
                      const displayValue = isAvg ? sum / results.length : sum
                      return (
                        <td
                          key={j}
                          className={`px-4 py-3 text-sm text-right ${
                            isCurrencyColumn(col) ? 'text-slate-300' : 'text-white'
                          }`}
                        >
                          {isCurrencyColumn(col) ? formatCurrency(displayValue) : formatNumber(displayValue)}
                        </td>
                      )
                    }
                    return <td key={j} className="px-4 py-3" />
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && !error && (
        <div className="bg-zinc-950 border border-zinc-900 p-12 text-center">
          <BarChart3 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-light text-white mb-2">Build Your Report</h3>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Select dimensions to group by, choose your metrics, set a date range, and click "Run Report" to generate
            your custom report.
          </p>
        </div>
      )}
    </div>
  )
}

// Helper function
function formatPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    credit_card: 'Credit Card',
    debit_card: 'Debit Card',
    apple_pay: 'Apple Pay',
    google_pay: 'Google Pay',
    split: 'Split Payment',
    dev_test: 'Test Payment',
    authorizenet: 'Credit Card (Online)',
  }
  return methodMap[method.toLowerCase()] || method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
