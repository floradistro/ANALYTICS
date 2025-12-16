import { createClient } from '@supabase/supabase-js'

// Script to backfill historical COGS data
async function backfillCogs() {
  console.log('🚀 Starting COGS Backfill Process...\n')

  // Create Supabase client with service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // Step 1: Backfill order item costs
    console.log('📦 Step 1: Backfilling order item costs...')
    console.log('   This may take several minutes for large datasets...\n')

    const { data: backfillResult, error: backfillError } = await supabase
      .rpc('backfill_order_item_costs')

    if (backfillError) {
      console.error('❌ Backfill error:', backfillError.message)
      console.log('   Trying direct query method...\n')

      // Manual backfill if RPC doesn't work
      await manualBackfill(supabase)
    } else {
      console.log('✅ Backfill completed!')
      console.log('   Results:', backfillResult)
      console.log(`   - Items processed: ${backfillResult[0]?.items_processed || 0}`)
      console.log(`   - Items updated: ${backfillResult[0]?.items_updated || 0}`)
      console.log(`   - Items without cost: ${backfillResult[0]?.items_no_cost || 0}\n`)
    }

    // Step 2: Recalculate order COGS
    console.log('📊 Step 2: Recalculating order COGS...')

    const { data: recalcResult, error: recalcError } = await supabase
      .rpc('recalculate_order_cogs')

    if (recalcError) {
      console.error('❌ Recalculation error:', recalcError.message)
    } else {
      console.log('✅ Recalculation completed!')
      console.log('   Results:', recalcResult)
      console.log(`   - Orders processed: ${recalcResult[0]?.orders_processed || 0}`)
      console.log(`   - Orders updated: ${recalcResult[0]?.orders_updated || 0}\n`)
    }

    console.log('='.repeat(70))
    console.log('🎉 COGS backfill process completed!')
    console.log('='.repeat(70))
    console.log('\n📋 Next steps:')
    console.log('   1. Refresh your COGS analytics dashboard')
    console.log('   2. Verify the numbers look correct')
    console.log('   3. Future orders will automatically have costs tracked\n')

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message)
    process.exit(1)
  }
}

// Manual backfill function as fallback
async function manualBackfill(supabase: any) {
  console.log('🔄 Running manual backfill...\n')

  // Get all order items without cost
  const { data: items, error: fetchError } = await supabase
    .from('order_items')
    .select('id, product_id, vendor_id, order_id, unit_price, orders!inner(created_at)')
    .is('cost_per_unit', null)
    .order('orders.created_at', { ascending: false })
    .limit(5000) // Process in batches

  if (fetchError) {
    console.error('❌ Error fetching items:', fetchError.message)
    return
  }

  console.log(`📦 Found ${items?.length || 0} items to backfill\n`)

  let updated = 0
  let noCost = 0

  for (const item of items || []) {
    // Get cost from PO
    const { data: poCost } = await supabase
      .from('purchase_order_items')
      .select('unit_price, purchase_orders!inner(updated_at, status)')
      .eq('product_id', item.product_id)
      .eq('purchase_orders.status', 'received')
      .lte('purchase_orders.updated_at', item.orders.created_at)
      .order('purchase_orders.updated_at', { ascending: false })
      .limit(1)
      .single()

    let cost = poCost?.unit_price

    // Fallback to product cost
    if (!cost) {
      const { data: product } = await supabase
        .from('products')
        .select('cost_price')
        .eq('id', item.product_id)
        .single()

      cost = product?.cost_price
    }

    if (cost && cost > 0) {
      // Update order item
      await supabase
        .from('order_items')
        .update({
          cost_per_unit: cost,
          profit_per_unit: item.unit_price - cost,
          margin_percentage: item.unit_price > 0 ? ((item.unit_price - cost) / item.unit_price) * 100 : 0
        })
        .eq('id', item.id)

      updated++
      if (updated % 100 === 0) {
        console.log(`   Progress: ${updated} items updated...`)
      }
    } else {
      noCost++
    }
  }

  console.log(`\n✅ Manual backfill complete:`)
  console.log(`   - Items updated: ${updated}`)
  console.log(`   - Items without cost: ${noCost}\n`)
}

// Run if called directly
if (require.main === module) {
  backfillCogs()
    .then(() => {
      console.log('✅ Script completed')
      process.exit(0)
    })
    .catch((err) => {
      console.error('❌ Script failed:', err)
      process.exit(1)
    })
}

export default backfillCogs
