import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://uaednwpxursknmwdeejn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.aKZKMfCK5Y_MYOeuGkH5FjWjp7-HVrAR0wBBixrR7ds'
)

// First update create_purchase_order_atomic
const createPOSQL = `
CREATE OR REPLACE FUNCTION create_purchase_order_atomic(
  p_vendor_id UUID,
  p_po_type TEXT,
  p_items TEXT,
  p_supplier_id UUID DEFAULT NULL,
  p_wholesale_customer_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_expected_delivery_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_tax_amount NUMERIC DEFAULT 0,
  p_shipping_cost NUMERIC DEFAULT 0,
  p_idempotency_key TEXT DEFAULT NULL,
  p_created_by_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
  po_id UUID,
  po_number TEXT,
  status TEXT,
  subtotal NUMERIC,
  tax_amount NUMERIC,
  shipping_cost NUMERIC,
  total_amount NUMERIC,
  items_created INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_po_id UUID;
  v_po_number TEXT;
  v_subtotal NUMERIC := 0;
  v_total_amount NUMERIC;
  v_items_created INT := 0;
  v_item JSONB;
  v_items_array JSONB;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_po_id
    FROM purchase_orders
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_po_id IS NOT NULL THEN
      RETURN QUERY
      SELECT
        po.id,
        po.po_number,
        po.status,
        po.subtotal,
        po.tax_amount,
        po.shipping_cost,
        po.total_amount,
        (SELECT COUNT(*)::INT FROM purchase_order_items WHERE purchase_order_id = po.id)
      FROM purchase_orders po
      WHERE po.id = v_po_id;
      RETURN;
    END IF;
  END IF;

  v_items_array := p_items::JSONB;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_array)
  LOOP
    v_subtotal := v_subtotal + (
      (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC
    );
  END LOOP;

  v_total_amount := v_subtotal + COALESCE(p_tax_amount, 0) + COALESCE(p_shipping_cost, 0);

  SELECT generate_po_number(p_po_type, p_vendor_id) INTO v_po_number;

  INSERT INTO purchase_orders (
    vendor_id,
    po_number,
    po_type,
    status,
    supplier_id,
    wholesale_customer_id,
    location_id,
    expected_delivery_date,
    notes,
    subtotal,
    tax_amount,
    shipping_cost,
    discount,
    total_amount,
    idempotency_key,
    created_by_user_id
  ) VALUES (
    p_vendor_id,
    v_po_number,
    p_po_type,
    'draft',
    p_supplier_id,
    p_wholesale_customer_id,
    p_location_id,
    p_expected_delivery_date,
    p_notes,
    v_subtotal,
    COALESCE(p_tax_amount, 0),
    COALESCE(p_shipping_cost, 0),
    0,
    v_total_amount,
    p_idempotency_key,
    p_created_by_user_id
  )
  RETURNING id INTO v_po_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_array)
  LOOP
    INSERT INTO purchase_order_items (
      purchase_order_id,
      product_id,
      quantity,
      unit_price,
      subtotal,
      received_quantity
    ) VALUES (
      v_po_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC,
      0
    );
    v_items_created := v_items_created + 1;
  END LOOP;

  RETURN QUERY
  SELECT
    v_po_id,
    v_po_number,
    'draft'::TEXT,
    v_subtotal,
    COALESCE(p_tax_amount, 0),
    COALESCE(p_shipping_cost, 0),
    v_total_amount,
    v_items_created;
END;
$$;
`

// Update receive_po_items
const receivePOSQL = `
CREATE OR REPLACE FUNCTION receive_po_items(
  p_po_id UUID,
  p_location_id UUID,
  p_items JSONB,
  p_received_by_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_po_item RECORD;
  v_product RECORD;
  v_items_processed INT := 0;
  v_total_ordered INT := 0;
  v_total_received INT := 0;
  v_new_status TEXT;
  v_po RECORD;
BEGIN
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  IF v_po.status NOT IN ('draft', 'pending', 'approved', 'ordered', 'receiving', 'partially_received') THEN
    RAISE EXCEPTION 'Cannot receive items for PO with status: %', v_po.status;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_po_item
    FROM purchase_order_items
    WHERE id = (v_item->>'item_id')::UUID
      AND purchase_order_id = p_po_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PO item not found: %', v_item->>'item_id';
    END IF;

    SELECT * INTO v_product FROM products WHERE id = v_po_item.product_id;

    UPDATE purchase_order_items
    SET
      received_quantity = received_quantity + (v_item->>'quantity')::NUMERIC,
      condition = COALESCE((v_item->>'condition')::TEXT, 'good'),
      quality_notes = v_item->>'quality_notes',
      updated_at = NOW()
    WHERE id = (v_item->>'item_id')::UUID;

    IF COALESCE((v_item->>'condition')::TEXT, 'good') = 'good' THEN
      INSERT INTO inventory_levels (
        vendor_id,
        location_id,
        product_id,
        quantity,
        created_at,
        updated_at
      ) VALUES (
        v_po.vendor_id,
        p_location_id,
        v_po_item.product_id,
        (v_item->>'quantity')::NUMERIC,
        NOW(),
        NOW()
      )
      ON CONFLICT (vendor_id, location_id, product_id)
      DO UPDATE SET
        quantity = inventory_levels.quantity + (v_item->>'quantity')::NUMERIC,
        updated_at = NOW();
    END IF;

    v_items_processed := v_items_processed + 1;
  END LOOP;

  SELECT
    COALESCE(SUM(quantity), 0),
    COALESCE(SUM(received_quantity), 0)
  INTO v_total_ordered, v_total_received
  FROM purchase_order_items
  WHERE purchase_order_id = p_po_id;

  IF v_total_received >= v_total_ordered THEN
    v_new_status := 'received';
  ELSIF v_total_received > 0 THEN
    v_new_status := 'partially_received';
  ELSE
    v_new_status := 'receiving';
  END IF;

  UPDATE purchase_orders
  SET
    status = v_new_status,
    received_by_user_id = COALESCE(p_received_by_user_id, received_by_user_id),
    received_date = CASE WHEN v_new_status = 'received' THEN CURRENT_DATE ELSE received_date END,
    received_at = CASE WHEN v_new_status = 'received' THEN NOW() ELSE received_at END,
    updated_at = NOW()
  WHERE id = p_po_id;

  RETURN jsonb_build_object(
    'success', true,
    'items_processed', v_items_processed,
    'new_status', v_new_status
  );
END;
$$;
`

console.log('Updating create_purchase_order_atomic...')
const { error: error1 } = await supabase.rpc('exec_sql', { sql: createPOSQL })
if (error1) {
  console.log('Error with exec_sql, trying direct query...')
  // Try using the SQL editor approach
  const { data, error } = await supabase.from('_sql').select('*').limit(1)
  console.log('SQL approach not available, need to use Supabase dashboard')
  console.log('SQL to run:', createPOSQL.substring(0, 200) + '...')
} else {
  console.log('create_purchase_order_atomic updated!')
}

console.log('\nUpdating receive_po_items...')
const { error: error2 } = await supabase.rpc('exec_sql', { sql: receivePOSQL })
if (error2) {
  console.log('Error:', error2.message)
} else {
  console.log('receive_po_items updated!')
}

// Test if the new parameter works
console.log('\nTesting create_purchase_order_atomic with p_created_by_user_id...')
const { data, error } = await supabase.rpc('create_purchase_order_atomic', {
  p_vendor_id: '00000000-0000-0000-0000-000000000000',
  p_po_type: 'inbound',
  p_items: '[]',
  p_created_by_user_id: '00000000-0000-0000-0000-000000000000'
})

if (error) {
  if (error.message.includes('p_created_by_user_id')) {
    console.log('❌ Parameter not yet available - need to run migration via Supabase SQL Editor')
  } else {
    console.log('✓ Parameter accepted (other error:', error.message.substring(0, 100) + '...)')
  }
} else {
  console.log('✓ Function works with new parameter!')
}
