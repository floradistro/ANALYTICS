-- Migration: Add staff tracking to purchase order functions
-- This adds p_created_by_user_id to create_purchase_order_atomic
-- and p_received_by_user_id to receive_po_items

-- First, let's update create_purchase_order_atomic to accept and use created_by_user_id
CREATE OR REPLACE FUNCTION create_purchase_order_atomic(
  p_vendor_id UUID,
  p_po_type TEXT,
  p_items TEXT, -- JSON array of items
  p_supplier_id UUID DEFAULT NULL,
  p_wholesale_customer_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_expected_delivery_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_tax_amount NUMERIC DEFAULT 0,
  p_shipping_cost NUMERIC DEFAULT 0,
  p_idempotency_key TEXT DEFAULT NULL,
  p_created_by_user_id UUID DEFAULT NULL  -- NEW: Staff who created the PO
)
RETURNS TABLE(
  out_po_id UUID,
  out_po_number TEXT,
  out_status TEXT,
  out_subtotal NUMERIC,
  out_tax_amount NUMERIC,
  out_shipping_cost NUMERIC,
  out_total_amount NUMERIC,
  out_items_created INT
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
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_po_id
    FROM purchase_orders
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;

    IF v_po_id IS NOT NULL THEN
      -- Return existing PO
      RETURN QUERY
      SELECT
        po.id AS out_po_id,
        po.po_number AS out_po_number,
        po.status AS out_status,
        po.subtotal AS out_subtotal,
        po.tax_amount AS out_tax_amount,
        po.shipping_cost AS out_shipping_cost,
        po.total_amount AS out_total_amount,
        (SELECT COUNT(*)::INT FROM purchase_order_items WHERE purchase_order_id = po.id) AS out_items_created
      FROM purchase_orders po
      WHERE po.id = v_po_id;
      RETURN;
    END IF;
  END IF;

  -- Parse items JSON
  v_items_array := p_items::JSONB;

  -- Calculate subtotal from items
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items_array)
  LOOP
    v_subtotal := v_subtotal + (
      (v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC
    );
  END LOOP;

  v_total_amount := v_subtotal + COALESCE(p_tax_amount, 0) + COALESCE(p_shipping_cost, 0);

  -- Generate PO number
  SELECT generate_po_number(p_po_type, p_vendor_id) INTO v_po_number;

  -- Create the purchase order
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
    created_by_user_id  -- NEW: Set staff attribution
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
    p_created_by_user_id  -- NEW: Set staff attribution
  )
  RETURNING id INTO v_po_id;

  -- Create the items
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

  -- Return the result
  RETURN QUERY
  SELECT
    v_po_id AS out_po_id,
    v_po_number AS out_po_number,
    'draft'::TEXT AS out_status,
    v_subtotal AS out_subtotal,
    COALESCE(p_tax_amount, 0) AS out_tax_amount,
    COALESCE(p_shipping_cost, 0) AS out_shipping_cost,
    v_total_amount AS out_total_amount,
    v_items_created AS out_items_created;
END;
$$;

-- Now update receive_po_items to accept and use received_by_user_id
CREATE OR REPLACE FUNCTION receive_po_items(
  p_po_id UUID,
  p_location_id UUID,
  p_items JSONB,
  p_received_by_user_id UUID DEFAULT NULL  -- NEW: Staff who received the items
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
  -- Get PO details
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  -- Check status allows receiving
  IF v_po.status NOT IN ('draft', 'pending', 'approved', 'ordered', 'receiving', 'partially_received') THEN
    RAISE EXCEPTION 'Cannot receive items for PO with status: %', v_po.status;
  END IF;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Get the PO item
    SELECT * INTO v_po_item
    FROM purchase_order_items
    WHERE id = (v_item->>'item_id')::UUID
      AND purchase_order_id = p_po_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PO item not found: %', v_item->>'item_id';
    END IF;

    -- Get product info
    SELECT * INTO v_product FROM products WHERE id = v_po_item.product_id;

    -- Update received quantity on PO item
    UPDATE purchase_order_items
    SET
      received_quantity = received_quantity + (v_item->>'quantity')::NUMERIC,
      condition = COALESCE((v_item->>'condition')::TEXT, 'good'),
      quality_notes = v_item->>'quality_notes',
      updated_at = NOW()
    WHERE id = (v_item->>'item_id')::UUID;

    -- Add to inventory (only if condition is 'good')
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

  -- Calculate total ordered vs received
  SELECT
    COALESCE(SUM(quantity), 0),
    COALESCE(SUM(received_quantity), 0)
  INTO v_total_ordered, v_total_received
  FROM purchase_order_items
  WHERE purchase_order_id = p_po_id;

  -- Determine new status
  IF v_total_received >= v_total_ordered THEN
    v_new_status := 'received';
  ELSIF v_total_received > 0 THEN
    v_new_status := 'partially_received';
  ELSE
    v_new_status := 'receiving';
  END IF;

  -- Update PO status and received_by
  UPDATE purchase_orders
  SET
    status = v_new_status,
    received_by_user_id = COALESCE(p_received_by_user_id, received_by_user_id),  -- NEW: Set staff attribution
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_purchase_order_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION create_purchase_order_atomic TO anon;
GRANT EXECUTE ON FUNCTION receive_po_items TO authenticated;
GRANT EXECUTE ON FUNCTION receive_po_items TO anon;
