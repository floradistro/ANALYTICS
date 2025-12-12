import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://uaednwpxursknmwdeejn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'
);

const vendorId = 'cd2e1122-d511-4edb-be5d-98ef274b4baf';

async function audit() {
  // Fetch ALL paid orders with pagination
  const pageSize = 1000;
  let allOrders = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, total_amount, subtotal, created_at, payment_status, status')
      .eq('vendor_id', vendorId)
      .eq('payment_status', 'paid')
      .neq('status', 'cancelled')
      .gte('created_at', '2025-11-12T00:00:00')
      .lte('created_at', '2025-12-12T23:59:59')
      .order('created_at', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error:', error);
      break;
    }

    if (data && data.length > 0) {
      allOrders = [...allOrders, ...data];
      hasMore = data.length === pageSize;
      page++;
      console.log('Fetched page', page, '- total so far:', allOrders.length);
    } else {
      hasMore = false;
    }
  }

  console.log('\nTotal paid orders (30 days):', allOrders.length);

  // Group by date
  const chartData = {};
  let grandTotal = 0;

  allOrders.forEach(o => {
    const date = o.created_at.split('T')[0];
    if (!chartData[date]) chartData[date] = { total: 0, count: 0 };
    chartData[date].total += parseFloat(o.total_amount || 0);
    chartData[date].count++;
    grandTotal += parseFloat(o.total_amount || 0);
  });

  console.log('\n=== DAILY REVENUE (what chart should show) ===');
  Object.entries(chartData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([date, data]) => {
      console.log(date + ': $' + data.total.toFixed(2) + ' (' + data.count + ' orders)');
    });

  console.log('\nGrand Total: $' + grandTotal.toFixed(2));
}

audit();
