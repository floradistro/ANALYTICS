import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

// ========== TYPES ==========

export interface ProductProfitability {
  product_id: string
  product_name: string
  variant_name?: string | null // Variant name for display (e.g., "Pre-Roll", "Edible")
  pricing_template_name?: string | null // Pricing template name (e.g., "Top Shelf", "Exotic", "Deals")
  category_name: string | null
  revenue: number
  estimated_cost: number
  estimated_profit: number
  margin_percentage: number
  units_sold: number
  order_count: number
  total_grams?: number // Track total grams sold for per-gram calculations
  tier_breakdown?: Map<string, number> // Track count of each tier size sold
}

export interface DailySalesProfit {
  sale_date: string
  subtotal: number
  cost_of_goods: number
  gross_profit: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  order_count: number
}

export interface SupplierCostComparison {
  product_id: string
  product_name: string
  supplier_id: string
  supplier_name: string
  avg_unit_cost: number
  total_quantity: number
  total_spent: number
  last_purchase_date: string
  purchase_count: number
}

export interface InventoryValuation {
  product_id: string
  product_name: string
  category_name?: string
  location_id: string
  location_name: string
  quantity: number
  unit_cost: number
  average_cost: number
  nrv_per_unit: number
  lcm_value: number
  total_value: number
  total_lcm_value: number
}

export interface CostTrendData {
  product_id: string
  product_name: string
  new_cost_price: number
  old_cost_price: number | null
  change_amount: number
  change_percentage: number
  change_reason: string | null
  changed_by: string | null
  created_at: string
}

export interface PurchaseOrderSummary {
  po_id: string
  po_number: string
  supplier_name: string
  subtotal: number
  shipping_cost: number
  tax_amount: number
  discount: number
  total_amount: number
  status: string
  payment_status: string
  created_at: string
  expected_date: string | null
}

// ========== STORE ==========

interface CogsAnalyticsState {
  productProfitability: ProductProfitability[]
  dailySalesProfit: DailySalesProfit[]
  supplierCostComparison: SupplierCostComparison[]
  inventoryValuation: InventoryValuation[]
  costTrends: CostTrendData[]
  purchaseOrders: PurchaseOrderSummary[]

  isLoadingProducts: boolean
  isLoadingDaily: boolean
  isLoadingSuppliers: boolean
  isLoadingInventory: boolean
  isLoadingTrends: boolean
  isLoadingPOs: boolean

  fetchProductProfitability: (storeId: string, startDate?: Date, endDate?: Date, locationIds?: string[]) => Promise<void>
  fetchDailySalesProfit: (storeId: string, startDate?: Date, endDate?: Date, locationIds?: string[]) => Promise<void>
  fetchSupplierCostComparison: (storeId: string, locationIds?: string[]) => Promise<void>
  fetchInventoryValuation: (storeId: string, locationIds?: string[]) => Promise<void>
  fetchCostTrends: (storeId: string, productId?: string, locationIds?: string[]) => Promise<void>
  fetchPurchaseOrders: (storeId: string, startDate?: Date, endDate?: Date, locationIds?: string[]) => Promise<void>
}

export const useCogsAnalyticsStore = create<CogsAnalyticsState>((set) => ({
  productProfitability: [],
  dailySalesProfit: [],
  supplierCostComparison: [],
  inventoryValuation: [],
  costTrends: [],
  purchaseOrders: [],

  isLoadingProducts: false,
  isLoadingDaily: false,
  isLoadingSuppliers: false,
  isLoadingInventory: false,
  isLoadingTrends: false,
  isLoadingPOs: false,

  // ========== FETCH PRODUCT PROFITABILITY ==========
  fetchProductProfitability: async (storeId: string, startDate?: Date, endDate?: Date, locationIds?: string[]) => {
    set({ isLoadingProducts: true })
    try {
      // Step 1: Adjust date range to include full days
      let adjustedStartDate = startDate
      if (startDate) {
        adjustedStartDate = new Date(startDate)
        adjustedStartDate.setHours(0, 0, 0, 0)
      }

      let adjustedEndDate = endDate
      if (endDate) {
        adjustedEndDate = new Date(endDate)
        adjustedEndDate.setHours(23, 59, 59, 999)
      }

      // Step 2: First fetch valid order IDs to avoid complex join pagination issues
      const allOrderIds: string[] = []
      const orderPageSize = 1000
      let orderPage = 0
      let hasMoreOrders = true

      while (hasMoreOrders) {
        let orderQuery = supabase
          .from('orders')
          .select('id', { count: 'exact' })
          .eq('store_id', storeId)
          .eq('payment_status', 'paid')
          .neq('status', 'cancelled')
          .range(orderPage * orderPageSize, (orderPage + 1) * orderPageSize - 1)

        if (adjustedStartDate) {
          orderQuery = orderQuery.gte('created_at', adjustedStartDate.toISOString())
        }
        if (adjustedEndDate) {
          orderQuery = orderQuery.lte('created_at', adjustedEndDate.toISOString())
        }

        const { data: orderData, error: orderError } = await orderQuery

        if (orderError) {
          throw orderError
        }

        if (orderData && orderData.length > 0) {
          allOrderIds.push(...orderData.map(o => o.id))
          hasMoreOrders = orderData.length === orderPageSize
          orderPage++
        } else {
          hasMoreOrders = false
        }
      }

      // Step 3: Fetch order items in batches by order IDs (avoids complex join pagination)
      const allOrderItems: any[] = []
      const batchSize = 500 // Process orders in batches to avoid 'in' clause limits

      for (let i = 0; i < allOrderIds.length; i += batchSize) {
        const batchOrderIds = allOrderIds.slice(i, i + batchSize)

        let query = supabase
          .from('order_items')
          .select(`
            product_id,
            order_id,
            quantity,
            quantity_grams,
            line_subtotal,
            cost_per_unit,
            profit_per_unit,
            tier_name,
            location_id,
            products!inner(
              name,
              pricing_template_id,
              categories!products_primary_category_id_fkey(name)
            )
          `)
          .in('order_id', batchOrderIds)

        if (locationIds && locationIds.length > 0) {
          query = query.in('location_id', locationIds)
        }

        const { data, error } = await query

        if (error) {
          throw error
        }

        if (data && data.length > 0) {
          allOrderItems.push(...data)
        }
      }

      const orderItems = allOrderItems

      // Step 2.5: Fetch pricing template names for all unique template IDs
      const uniqueTemplateIds = new Set<string>()
      for (const item of orderItems) {
        const templateId = item.products?.pricing_template_id
        if (templateId) uniqueTemplateIds.add(templateId)
      }

      const pricingTemplateMap = new Map<string, string>()
      if (uniqueTemplateIds.size > 0) {
        const { data: templates } = await supabase
          .from('pricing_tier_templates')
          .select('id, name')
          .in('id', Array.from(uniqueTemplateIds))

        if (templates) {
          for (const template of templates) {
            pricingTemplateMap.set(template.id, template.name)
          }
        }
      }

      // Step 3: Aggregate by product using ACTUAL costs from order_items
      // NOTE: We use a composite key of product_id + variant info to separate variants
      const productMap = new Map<string, {
        productId: string
        variantName: string | null
        pricingTemplateName: string | null
        name: string
        category: string | null
        revenue: number
        cost: number
        profit: number
        units: number
        grams: number
        orders: Set<string>
        tierBreakdown: Map<string, number>
      }>()

      for (const item of orderItems || []) {
        const pid = item.product_id
        if (!pid) continue

        // Get pricing template name (e.g., "Top Shelf", "Exotic", "Deals")
        const templateId = item.products?.pricing_template_id
        const pricingTemplateName = templateId ? pricingTemplateMap.get(templateId) || null : null

        // Create composite key: product_id + variant_name + pricing_template
        // This ensures "Flower (Top Shelf)" and "Flower (Deals)" are tracked separately
        const variantName = (item as any).variant_name || null
        let compositeKey = pid
        if (variantName) compositeKey += `::${variantName}`
        if (pricingTemplateName) compositeKey += `::${pricingTemplateName}`

        // Store base name separately from variant/template for better display
        const baseName = item.products?.name || 'Unknown'

        const existing = productMap.get(compositeKey) || {
          productId: pid,
          variantName: variantName,
          pricingTemplateName: pricingTemplateName,
          name: baseName, // Store base name without variant/template
          category: item.products?.categories?.name || null,
          revenue: 0,
          cost: 0,
          profit: 0,
          units: 0,
          grams: 0,
          orders: new Set(),
          tierBreakdown: new Map(),
        }

        // Use ACTUAL cost_per_unit from the order item (not estimated!)
        const itemCost = (item.cost_per_unit || 0) * (item.quantity || 0)
        const itemProfit = item.profit_per_unit ? (item.profit_per_unit * (item.quantity || 0)) : (item.line_subtotal || 0) - itemCost

        existing.revenue += item.line_subtotal || 0
        existing.cost += itemCost
        existing.profit += itemProfit
        existing.units += item.quantity || 0
        existing.grams += item.quantity_grams || 0
        if (item.order_id) existing.orders.add(item.order_id)

        // Track actual tier selections using tier_name with pricing template breakdown
        const tierName = (item as any).tier_name || null
        const tierDisplayName = tierName || (item.quantity_grams && item.quantity_grams > 0 ? `${item.quantity_grams}g` : null)

        if (tierDisplayName) {
          // Create tier key with pricing template for detailed breakdown
          // Format: "3.5g::Top Shelf" or just "3.5g" if no pricing template
          const tierKey = pricingTemplateName
            ? `${tierDisplayName}::${pricingTemplateName}`
            : tierDisplayName
          existing.tierBreakdown.set(tierKey, (existing.tierBreakdown.get(tierKey) || 0) + (item.quantity || 0))
        }

        productMap.set(compositeKey, existing)
      }

      // Step 4: Build results array
      const results: ProductProfitability[] = []

      for (const [compositeKey, data] of productMap.entries()) {
        const margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0

        results.push({
          product_id: compositeKey, // Use composite key so each variant/template is unique in the UI
          product_name: data.name, // Base product name without variant/template
          variant_name: data.variantName, // Variant name stored separately for badge display
          pricing_template_name: data.pricingTemplateName, // Pricing template (Top Shelf, Exotic, Deals, etc.)
          category_name: data.category,
          revenue: data.revenue,
          estimated_cost: data.cost,
          estimated_profit: data.profit,
          margin_percentage: margin,
          units_sold: data.units,
          order_count: data.orders.size,
          total_grams: data.grams,
          tier_breakdown: data.tierBreakdown,
        })
      }

      results.sort((a, b) => b.revenue - a.revenue)

      set({ productProfitability: results })
    } catch (error) {
      console.error('Failed to fetch product profitability:', error)
      set({ productProfitability: [] })
    } finally {
      set({ isLoadingProducts: false })
    }
  },

  // ========== FETCH DAILY SALES PROFIT ==========
  fetchDailySalesProfit: async (storeId: string, startDate?: Date, endDate?: Date, locationIds?: string[]) => {
    set({ isLoadingDaily: true })
    try {
      // Adjust startDate to beginning of day (00:00:00.000)
      let adjustedStartDate = startDate
      if (startDate) {
        adjustedStartDate = new Date(startDate)
        adjustedStartDate.setHours(0, 0, 0, 0)
      }

      // Adjust endDate to include the full day (set to end of day)
      let adjustedEndDate = endDate
      if (endDate) {
        adjustedEndDate = new Date(endDate)
        adjustedEndDate.setHours(23, 59, 59, 999)
      }

      // Fetch orders with pagination
      const allOrders: any[] = []
      const pageSize = 1000
      let page = 0
      let hasMore = true

      while (hasMore) {
        const { data, error, count } = await supabase
          .from('orders')
          .select('id, created_at, discount_amount, tax_amount, total_amount', { count: 'exact' })
          .eq('store_id', storeId)
          .eq('payment_status', 'paid')
          .neq('status', 'cancelled')
          .gte('created_at', adjustedStartDate?.toISOString() || '2020-01-01')
          .lte('created_at', adjustedEndDate?.toISOString() || '2030-12-31')
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error

        if (data && data.length > 0) {
          allOrders.push(...data)
          hasMore = data.length === pageSize
          page++
        } else {
          hasMore = false
        }
      }

      const orders = allOrders

      if (!orders || orders.length === 0) {
        set({ dailySalesProfit: [] })
        return
      }

      // Create lookup map for orders
      const orderMap = new Map(orders.map(o => [o.id, o]))
      const orderIds = orders.map(o => o.id)

      // Get order items in batches by order IDs (more efficient than pagination with date filter)
      const allItems: any[] = []
      const batchSize = 500 // Process orders in batches to avoid 'in' clause limits

      for (let i = 0; i < orderIds.length; i += batchSize) {
        const batchOrderIds = orderIds.slice(i, i + batchSize)

        let itemQuery = supabase
          .from('order_items')
          .select('order_id, product_id, quantity, cost_per_unit, profit_per_unit, line_subtotal, location_id')
          .in('order_id', batchOrderIds)

        if (locationIds && locationIds.length > 0) {
          itemQuery = itemQuery.in('location_id', locationIds)
        }

        const { data, error } = await itemQuery

        if (error) throw error

        if (data && data.length > 0) {
          allItems.push(...data)
        }
      }

      // All items are already from valid orders, no filter needed
      const items = allItems

      // Aggregate by date
      const dailyMap = new Map<string, {
        revenue: number
        cogs: number
        discount: number
        tax: number
        total: number
        orders: Set<string>
      }>()

      for (const item of items || []) {
        const order = orderMap.get(item.order_id)
        if (!order) continue

        const date = order.created_at.split('T')[0]
        // Use ACTUAL cost_per_unit from order item (not estimated!)
        const itemCost = (item.cost_per_unit || 0) * (item.quantity || 0)

        const existing = dailyMap.get(date) || {
          revenue: 0,
          cogs: 0,
          discount: 0,
          tax: 0,
          total: 0,
          orders: new Set(),
        }

        existing.revenue += item.line_subtotal || 0
        existing.cogs += itemCost

        // Add order-level data once per order
        if (!existing.orders.has(order.id)) {
          existing.discount += order.discount_amount || 0
          existing.tax += order.tax_amount || 0
          existing.total += order.total_amount || 0
          existing.orders.add(order.id)
        }

        dailyMap.set(date, existing)
      }

      const results: DailySalesProfit[] = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          sale_date: date,
          subtotal: data.revenue,
          cost_of_goods: data.cogs,
          gross_profit: data.revenue - data.cogs,
          discount_amount: data.discount,
          tax_amount: data.tax,
          total_amount: data.total,
          order_count: data.orders.size,
        }))
        .sort((a, b) => a.sale_date.localeCompare(b.sale_date))

      set({ dailySalesProfit: results })
    } catch (error) {
      console.error('Failed to fetch daily sales:', error)
      set({ dailySalesProfit: [] })
    } finally {
      set({ isLoadingDaily: false })
    }
  },

  // ========== FETCH SUPPLIER COST COMPARISON ==========
  fetchSupplierCostComparison: async (storeId: string, locationIds?: string[]) => {
    set({ isLoadingSuppliers: true })
    try {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          product_id,
          unit_price,
          quantity,
          created_at,
          purchase_orders!inner(supplier_id, suppliers(external_name)),
          products!inner(name, store_id)
        `)
        .eq('products.store_id', storeId)
        .neq('purchase_orders.status', 'cancelled')

      if (error) throw error

      const supplierProductMap = new Map<string, {
        product_id: string
        product_name: string
        supplier_id: string
        supplier_name: string
        qty: number
        spent: number
        lastDate: string
        count: number
      }>()

      for (const item of data || []) {
        const po = item.purchase_orders as any
        const product = item.products as any
        const supplier = po?.suppliers as any

        const key = `${item.product_id}_${po.supplier_id}`
        const existing = supplierProductMap.get(key)

        if (existing) {
          existing.qty += item.quantity || 0
          existing.spent += (item.quantity || 0) * (item.unit_price || 0)
          existing.count++
          if (item.created_at > existing.lastDate) {
            existing.lastDate = item.created_at
          }
        } else {
          supplierProductMap.set(key, {
            product_id: item.product_id || '',
            product_name: product?.name || 'Unknown',
            supplier_id: po?.supplier_id || '',
            supplier_name: supplier?.external_name || 'Unknown',
            qty: item.quantity || 0,
            spent: (item.quantity || 0) * (item.unit_price || 0),
            lastDate: item.created_at,
            count: 1,
          })
        }
      }

      const results: SupplierCostComparison[] = Array.from(supplierProductMap.values()).map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name,
        avg_unit_cost: item.qty > 0 ? item.spent / item.qty : 0,
        total_quantity: item.qty,
        total_spent: item.spent,
        last_purchase_date: item.lastDate,
        purchase_count: item.count,
      }))

      set({ supplierCostComparison: results })
    } catch (error) {
      console.error('Failed to fetch supplier comparison:', error)
      set({ supplierCostComparison: [] })
    } finally {
      set({ isLoadingSuppliers: false })
    }
  },

  // ========== FETCH INVENTORY VALUATION ==========
  fetchInventoryValuation: async (storeId: string, locationIds?: string[]) => {
    set({ isLoadingInventory: true })
    try {
      let query = supabase
        .from('inventory')
        .select(`
          product_id,
          location_id,
          quantity,
          unit_cost,
          average_cost,
          nrv_per_unit,
          lcm_value,
          products!inner(name, store_id, primary_category_id, categories:primary_category_id(name)),
          locations(name)
        `)
        .eq('products.store_id', storeId)
        .gt('quantity', 0)

      if (locationIds && locationIds.length > 0) {
        query = query.in('location_id', locationIds)
      }

      const { data, error } = await query

      if (error) throw error

      const results: InventoryValuation[] = (data || []).map(item => {
        const product = item.products as any
        const location = item.locations as any
        const category = product?.categories as any
        const cost = item.average_cost || item.unit_cost || 0
        const lcmValue = item.lcm_value || cost

        return {
          product_id: item.product_id || '',
          product_name: product?.name || 'Unknown',
          category_name: category?.name || 'Uncategorized',
          location_id: item.location_id || '',
          location_name: location?.name || 'Unknown',
          quantity: item.quantity || 0,
          unit_cost: item.unit_cost || 0,
          average_cost: item.average_cost || 0,
          nrv_per_unit: item.nrv_per_unit || 0,
          lcm_value: lcmValue,
          total_value: (item.quantity || 0) * cost,
          total_lcm_value: (item.quantity || 0) * lcmValue,
        }
      })

      set({ inventoryValuation: results })
    } catch (error) {
      console.error('Failed to fetch inventory valuation:', error)
      set({ inventoryValuation: [] })
    } finally {
      set({ isLoadingInventory: false })
    }
  },

  // ========== FETCH COST TRENDS ==========
  fetchCostTrends: async (storeId: string, productId?: string, locationIds?: string[]) => {
    set({ isLoadingTrends: true })
    try {
      let query = supabase
        .from('product_cost_history')
        .select(`
          product_id,
          new_cost_price,
          old_cost_price,
          change_reason,
          changed_by,
          created_at,
          products!inner(name, store_id)
        `)
        .eq('products.store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (productId) {
        query = query.eq('product_id', productId)
      }

      const { data, error } = await query

      if (error) throw error

      const results: CostTrendData[] = (data || []).map(item => {
        const product = item.products as any
        const oldCost = item.old_cost_price || 0
        const newCost = item.new_cost_price || 0
        const change = newCost - oldCost
        const pct = oldCost > 0 ? (change / oldCost) * 100 : 0

        return {
          product_id: item.product_id || '',
          product_name: product?.name || 'Unknown',
          new_cost_price: newCost,
          old_cost_price: item.old_cost_price,
          change_amount: change,
          change_percentage: pct,
          change_reason: item.change_reason,
          changed_by: item.changed_by,
          created_at: item.created_at,
        }
      })

      set({ costTrends: results })
    } catch (error) {
      console.error('Failed to fetch cost trends:', error)
      set({ costTrends: [] })
    } finally {
      set({ isLoadingTrends: false })
    }
  },

  // ========== FETCH PURCHASE ORDERS ==========
  fetchPurchaseOrders: async (storeId: string, startDate?: Date, endDate?: Date, locationIds?: string[]) => {
    set({ isLoadingPOs: true })
    try {
      let query = supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          subtotal,
          shipping_cost,
          tax_amount,
          discount,
          total_amount,
          status,
          payment_status,
          created_at,
          expected_date,
          suppliers(external_name)
        `)
        .eq('store_id', storeId)

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString())
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString())
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      const results: PurchaseOrderSummary[] = (data || []).map(item => {
        const supplier = item.suppliers as any

        return {
          po_id: item.id,
          po_number: item.po_number || '',
          supplier_name: supplier?.external_name || 'Unknown',
          subtotal: item.subtotal || 0,
          shipping_cost: item.shipping_cost || 0,
          tax_amount: item.tax_amount || 0,
          discount: item.discount || 0,
          total_amount: item.total_amount || 0,
          status: item.status || 'draft',
          payment_status: item.payment_status || 'unpaid',
          created_at: item.created_at,
          expected_date: item.expected_date,
        }
      })

      set({ purchaseOrders: results })
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error)
      set({ purchaseOrders: [] })
    } finally {
      set({ isLoadingPOs: false })
    }
  },
}))
