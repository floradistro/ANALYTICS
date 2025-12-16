import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://uaednwpxursknmwdeejn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTcyMzMsImV4cCI6MjA3NjU3MzIzM30.N8jPwlyCBB5KJB5I-XaK6m-mq88rSR445AWFJJmwRCg'
)

// Check if functions exist with user_id params
const { data, error } = await supabase.rpc('create_purchase_order_atomic', {
  p_vendor_id: 'test',
  p_po_type: 'inbound',
  p_items: '[]',
  p_created_by_user_id: 'test'  // Try adding this param
})

console.log('Error:', error?.message || 'No error')
