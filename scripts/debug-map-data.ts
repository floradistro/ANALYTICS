import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debug() {
  // Check total visitors
  const { count: totalVisitors } = await supabase
    .from('website_visitors')
    .select('*', { count: 'exact', head: true })

  // Check visitors with geo data
  const { count: visitorsWithGeo } = await supabase
    .from('website_visitors')
    .select('*', { count: 'exact', head: true })
    .not('latitude', 'is', null)

  console.log('\n=== TRAFFIC DATA ===')
  console.log('Total visitors:', totalVisitors)
  console.log('Visitors with geo (lat/lng):', visitorsWithGeo)
  console.log('% with geo:', ((visitorsWithGeo || 0) / (totalVisitors || 1) * 100).toFixed(1) + '%')

  // Sample some visitors without geo
  const { data: noGeoSample } = await supabase
    .from('website_visitors')
    .select('id, city, region, country, latitude, longitude')
    .is('latitude', null)
    .limit(5)

  console.log('\nSample visitors WITHOUT geo:')
  console.log(JSON.stringify(noGeoSample, null, 2))

  // Check shipping orders
  const { count: totalShipping } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('order_type', 'shipping')

  const { data: shippingSample } = await supabase
    .from('orders')
    .select('id, shipping_city, shipping_state, shipping_address')
    .eq('order_type', 'shipping')
    .limit(10)

  console.log('\n=== SHIPPING DATA ===')
  console.log('Total shipping orders:', totalShipping)
  console.log('\nSample shipping addresses:')
  console.log(JSON.stringify(shippingSample, null, 2))

  // Check for duplicate/similar addresses (clustering issue)
  const { data: addressGroups } = await supabase
    .from('orders')
    .select('shipping_city, shipping_state')
    .eq('order_type', 'shipping')
    .limit(500)

  const cityCount = new Map<string, number>()
  for (const o of addressGroups || []) {
    const key = `${o.shipping_city}, ${o.shipping_state}`
    cityCount.set(key, (cityCount.get(key) || 0) + 1)
  }

  console.log('\nOrders by city (top 15):')
  const sorted = Array.from(cityCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15)
  sorted.forEach(([city, count]) => console.log(`  ${city}: ${count}`))

  // Check customers with addresses
  const { count: totalCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })

  const { count: customersWithAddress } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .not('street_address', 'is', null)
    .neq('street_address', '')

  console.log('\n=== CUSTOMER DATA ===')
  console.log('Total customers:', totalCustomers)
  console.log('Customers with addresses:', customersWithAddress)
}

debug().catch(console.error)
