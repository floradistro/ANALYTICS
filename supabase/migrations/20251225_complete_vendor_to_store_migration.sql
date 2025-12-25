-- Complete vendor → store migration
-- This migration completes the rename of all remaining vendor references

-- ============================================================================
-- STEP 1: Rename vendor_email_settings table to store_email_settings
-- ============================================================================

-- Rename the table
ALTER TABLE IF EXISTS vendor_email_settings RENAME TO store_email_settings;

-- Rename the vendor_id column to store_id
ALTER TABLE IF EXISTS store_email_settings RENAME COLUMN vendor_id TO store_id;

-- Create backward compatibility view
CREATE OR REPLACE VIEW vendor_email_settings AS
SELECT
  id,
  store_id AS vendor_id,
  from_name,
  from_email,
  reply_to,
  domain,
  domain_verified,
  resend_domain_id,
  email_header_image_url,
  enable_receipts,
  enable_order_confirmations,
  enable_order_updates,
  enable_loyalty_updates,
  enable_password_resets,
  enable_welcome_emails,
  enable_marketing,
  require_double_opt_in,
  signature_html,
  unsubscribe_footer_html,
  slack_webhook_url,
  enable_failed_checkout_alerts,
  failed_checkout_alert_email,
  created_at,
  updated_at
FROM store_email_settings;

-- ============================================================================
-- STEP 2: Create/update the get_store_id_from_jwt function
-- ============================================================================

-- Drop old function if exists
DROP FUNCTION IF EXISTS get_vendor_id_from_jwt();

-- Create new function
CREATE OR REPLACE FUNCTION get_store_id_from_jwt()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT store_id
  FROM users
  WHERE auth_user_id = auth.uid()
  LIMIT 1
$$;

-- Create backward compat wrapper
CREATE OR REPLACE FUNCTION get_vendor_id_from_jwt()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT get_store_id_from_jwt()
$$;

-- ============================================================================
-- STEP 3: Update RPC functions to use p_store_id parameter
-- ============================================================================

-- get_analytics_summary
DROP FUNCTION IF EXISTS get_analytics_summary(text, uuid);
CREATE OR REPLACE FUNCTION get_analytics_summary(p_period_type text DEFAULT 'day', p_store_id uuid DEFAULT NULL)
RETURNS TABLE(
  period_start timestamp with time zone,
  total_orders bigint,
  total_revenue numeric,
  total_customers bigint,
  avg_order_value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc(p_period_type, o.created_at) AS period_start,
    COUNT(*)::bigint AS total_orders,
    COALESCE(SUM(o.total_amount), 0) AS total_revenue,
    COUNT(DISTINCT o.customer_id)::bigint AS total_customers,
    COALESCE(AVG(o.total_amount), 0) AS avg_order_value
  FROM orders o
  WHERE (p_store_id IS NULL OR o.store_id = p_store_id)
    AND o.payment_status = 'paid'
  GROUP BY date_trunc(p_period_type, o.created_at)
  ORDER BY period_start DESC;
END;
$$;

-- calculate_shipping_cost
DROP FUNCTION IF EXISTS calculate_shipping_cost(numeric, uuid);
CREATE OR REPLACE FUNCTION calculate_shipping_cost(p_subtotal numeric, p_store_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_free_shipping_enabled boolean;
  v_free_shipping_threshold numeric;
  v_default_shipping_cost numeric;
BEGIN
  SELECT
    free_shipping_enabled,
    free_shipping_threshold,
    default_shipping_cost
  INTO
    v_free_shipping_enabled,
    v_free_shipping_threshold,
    v_default_shipping_cost
  FROM stores
  WHERE id = p_store_id;

  IF v_free_shipping_enabled AND p_subtotal >= COALESCE(v_free_shipping_threshold, 0) THEN
    RETURN 0;
  END IF;

  RETURN COALESCE(v_default_shipping_cost, 0);
END;
$$;

-- get_visitor_stats
DROP FUNCTION IF EXISTS get_visitor_stats(uuid, timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION get_visitor_stats(p_store_id uuid, p_start timestamptz, p_end timestamptz)
RETURNS TABLE(
  total bigint,
  unique_visitors bigint,
  unique_sessions bigint,
  returning_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total,
    COUNT(DISTINCT visitor_id)::bigint AS unique_visitors,
    COUNT(DISTINCT session_id)::bigint AS unique_sessions,
    COUNT(DISTINCT CASE WHEN is_returning THEN visitor_id END)::bigint AS returning_count
  FROM website_visitors
  WHERE store_id = p_store_id
    AND created_at >= p_start
    AND created_at <= p_end;
END;
$$;

-- get_pageview_stats
DROP FUNCTION IF EXISTS get_pageview_stats(uuid, timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION get_pageview_stats(p_store_id uuid, p_start timestamptz, p_end timestamptz)
RETURNS TABLE(
  total bigint,
  bounced_sessions bigint,
  total_sessions bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH session_pages AS (
    SELECT session_id, COUNT(*) as page_count
    FROM page_views
    WHERE store_id = p_store_id
      AND created_at >= p_start
      AND created_at <= p_end
    GROUP BY session_id
  )
  SELECT
    SUM(page_count)::bigint AS total,
    COUNT(CASE WHEN page_count = 1 THEN 1 END)::bigint AS bounced_sessions,
    COUNT(*)::bigint AS total_sessions
  FROM session_pages;
END;
$$;

-- process_inventory_adjustment
DROP FUNCTION IF EXISTS process_inventory_adjustment(uuid, uuid, uuid, text, integer, text, uuid, text);
CREATE OR REPLACE FUNCTION process_inventory_adjustment(
  p_store_id uuid,
  p_product_id uuid,
  p_location_id uuid,
  p_adjustment_type text,
  p_quantity_change integer,
  p_reason text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_quantity integer;
  v_new_quantity integer;
  v_adjustment_id uuid;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_adjustment_id
    FROM inventory_adjustments
    WHERE idempotency_key = p_idempotency_key;

    IF v_adjustment_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'adjustment_id', v_adjustment_id, 'idempotent', true);
    END IF;
  END IF;

  -- Get current quantity
  SELECT COALESCE(quantity, 0) INTO v_current_quantity
  FROM product_inventory
  WHERE product_id = p_product_id AND location_id = p_location_id;

  -- Calculate new quantity
  v_new_quantity := COALESCE(v_current_quantity, 0) + p_quantity_change;

  -- Update inventory
  INSERT INTO product_inventory (product_id, location_id, quantity, store_id)
  VALUES (p_product_id, p_location_id, v_new_quantity, p_store_id)
  ON CONFLICT (product_id, location_id)
  DO UPDATE SET quantity = v_new_quantity, updated_at = now();

  -- Record adjustment
  INSERT INTO inventory_adjustments (
    product_id, location_id, store_id, adjustment_type,
    quantity_before, quantity_after, quantity_change,
    reason, user_id, idempotency_key
  )
  VALUES (
    p_product_id, p_location_id, p_store_id, p_adjustment_type,
    v_current_quantity, v_new_quantity, p_quantity_change,
    p_reason, p_user_id, p_idempotency_key
  )
  RETURNING id INTO v_adjustment_id;

  RETURN jsonb_build_object(
    'success', true,
    'adjustment_id', v_adjustment_id,
    'previous_quantity', v_current_quantity,
    'new_quantity', v_new_quantity
  );
END;
$$;

-- create_purchase_order_atomic
DROP FUNCTION IF EXISTS create_purchase_order_atomic(uuid, text, jsonb, uuid, uuid, date, text, numeric, numeric, text);
CREATE OR REPLACE FUNCTION create_purchase_order_atomic(
  p_store_id uuid,
  p_po_type text,
  p_items jsonb,
  p_supplier_id uuid DEFAULT NULL,
  p_location_id uuid DEFAULT NULL,
  p_expected_delivery_date date DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_tax_amount numeric DEFAULT 0,
  p_shipping_cost numeric DEFAULT 0,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_po_id uuid;
  v_po_number text;
  v_total numeric := 0;
  v_item jsonb;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_po_id
    FROM purchase_orders
    WHERE idempotency_key = p_idempotency_key;

    IF v_po_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'purchase_order_id', v_po_id, 'idempotent', true);
    END IF;
  END IF;

  -- Generate PO number
  v_po_number := 'PO-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Calculate total
  SELECT COALESCE(SUM((item->>'quantity')::numeric * (item->>'unit_cost')::numeric), 0)
  INTO v_total
  FROM jsonb_array_elements(p_items) AS item;

  v_total := v_total + COALESCE(p_tax_amount, 0) + COALESCE(p_shipping_cost, 0);

  -- Create PO
  INSERT INTO purchase_orders (
    store_id, po_number, po_type, supplier_id, location_id,
    expected_delivery_date, notes, subtotal, tax_amount,
    shipping_cost, total_amount, status, idempotency_key
  )
  VALUES (
    p_store_id, v_po_number, p_po_type, p_supplier_id, p_location_id,
    p_expected_delivery_date, p_notes, v_total - COALESCE(p_tax_amount, 0) - COALESCE(p_shipping_cost, 0),
    p_tax_amount, p_shipping_cost, v_total, 'draft', p_idempotency_key
  )
  RETURNING id INTO v_po_id;

  -- Create PO items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO purchase_order_items (
      purchase_order_id, product_id, quantity, unit_cost, total_cost
    )
    VALUES (
      v_po_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer,
      (v_item->>'unit_cost')::numeric,
      (v_item->>'quantity')::numeric * (v_item->>'unit_cost')::numeric
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_order_id', v_po_id,
    'po_number', v_po_number,
    'total_amount', v_total
  );
END;
$$;

-- generate_unique_sku
DROP FUNCTION IF EXISTS generate_unique_sku(text, uuid);
CREATE OR REPLACE FUNCTION generate_unique_sku(p_base_name text, p_store_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_base_sku text;
  v_sku text;
  v_counter integer := 0;
BEGIN
  -- Clean and format base SKU
  v_base_sku := upper(regexp_replace(p_base_name, '[^a-zA-Z0-9]', '', 'g'));
  v_base_sku := substring(v_base_sku, 1, 10);

  IF length(v_base_sku) < 3 THEN
    v_base_sku := 'SKU' || v_base_sku;
  END IF;

  v_sku := v_base_sku;

  -- Find unique SKU
  WHILE EXISTS (SELECT 1 FROM products WHERE sku = v_sku AND store_id = p_store_id) LOOP
    v_counter := v_counter + 1;
    v_sku := v_base_sku || '-' || v_counter;
  END LOOP;

  RETURN v_sku;
END;
$$;

-- ============================================================================
-- STEP 4: Update RLS policies to use store_id
-- ============================================================================

-- Drop old policies on store_email_settings if they reference vendor_id
DO $$
BEGIN
  -- Recreate policies for store_email_settings
  DROP POLICY IF EXISTS "store_email_settings_select" ON store_email_settings;
  DROP POLICY IF EXISTS "store_email_settings_insert" ON store_email_settings;
  DROP POLICY IF EXISTS "store_email_settings_update" ON store_email_settings;
  DROP POLICY IF EXISTS "vendor_email_settings_select" ON store_email_settings;
  DROP POLICY IF EXISTS "vendor_email_settings_insert" ON store_email_settings;
  DROP POLICY IF EXISTS "vendor_email_settings_update" ON store_email_settings;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Create new RLS policies
CREATE POLICY "store_email_settings_select" ON store_email_settings
  FOR SELECT USING (store_id = get_store_id_from_jwt());

CREATE POLICY "store_email_settings_insert" ON store_email_settings
  FOR INSERT WITH CHECK (store_id = get_store_id_from_jwt());

CREATE POLICY "store_email_settings_update" ON store_email_settings
  FOR UPDATE USING (store_id = get_store_id_from_jwt());

-- ============================================================================
-- STEP 5: Backward compatibility wrappers for old function signatures
-- ============================================================================

-- Keep old parameter names working via wrapper functions
CREATE OR REPLACE FUNCTION get_visitor_stats(p_vendor_id uuid, p_start timestamptz, p_end timestamptz)
RETURNS TABLE(total bigint, unique_visitors bigint, unique_sessions bigint, returning_count bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT * FROM get_visitor_stats(p_vendor_id, p_start, p_end);
$$;

CREATE OR REPLACE FUNCTION get_pageview_stats(p_vendor_id uuid, p_start timestamptz, p_end timestamptz)
RETURNS TABLE(total bigint, bounced_sessions bigint, total_sessions bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT * FROM get_pageview_stats(p_vendor_id, p_start, p_end);
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_store_id_from_jwt() TO authenticated;
GRANT EXECUTE ON FUNCTION get_vendor_id_from_jwt() TO authenticated;
GRANT EXECUTE ON FUNCTION get_visitor_stats(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pageview_stats(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION process_inventory_adjustment(uuid, uuid, uuid, text, integer, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_purchase_order_atomic(uuid, text, jsonb, uuid, uuid, date, text, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_unique_sku(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_shipping_cost(numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_summary(text, uuid) TO authenticated;
