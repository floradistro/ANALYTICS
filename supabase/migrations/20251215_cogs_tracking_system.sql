-- ============================================================================
-- COGS Tracking System - Complete Implementation
-- Created: 2025-12-15
-- Purpose: Automatic cost tracking from PO → Product → Sale → Order COGS
-- ============================================================================

-- ============================================================================
-- PART 1: FUNCTION TO UPDATE PRODUCT COST FROM PO
-- ============================================================================
-- When a purchase order is received, update the product's cost_price

CREATE OR REPLACE FUNCTION update_product_cost_from_po()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id uuid;
  v_new_cost numeric;
  v_old_cost numeric;
BEGIN
  -- Only process if PO status is 'received' or 'partial'
  IF NEW.status IN ('received', 'partial') THEN

    -- Loop through all items in this purchase order
    FOR v_product_id, v_new_cost IN
      SELECT product_id, unit_price
      FROM purchase_order_items
      WHERE purchase_order_id = NEW.id
        AND unit_price IS NOT NULL
        AND unit_price > 0
    LOOP
      -- Get current cost
      SELECT cost_price INTO v_old_cost
      FROM products
      WHERE id = v_product_id;

      -- Update product cost_price
      UPDATE products
      SET
        cost_price = v_new_cost,
        updated_at = NOW()
      WHERE id = v_product_id;

      -- Log to cost history if cost changed
      IF v_old_cost IS DISTINCT FROM v_new_cost THEN
        INSERT INTO product_cost_history (
          product_id,
          old_cost,
          new_cost,
          change_reason,
          changed_by,
          created_at
        ) VALUES (
          v_product_id,
          v_old_cost,
          v_new_cost,
          'PO Received: ' || NEW.po_number,
          NEW.created_by,
          NOW()
        );
      END IF;
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for PO status updates
DROP TRIGGER IF EXISTS trigger_update_product_cost_from_po ON purchase_orders;
CREATE TRIGGER trigger_update_product_cost_from_po
  AFTER UPDATE OF status ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.status IN ('received', 'partial') AND OLD.status != NEW.status)
  EXECUTE FUNCTION update_product_cost_from_po();

-- ============================================================================
-- PART 2: FUNCTION TO UPDATE INVENTORY AVERAGE COST
-- ============================================================================
-- Calculate weighted average cost when inventory is received

CREATE OR REPLACE FUNCTION update_inventory_average_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id uuid;
  v_location_id uuid;
  v_new_unit_price numeric;
  v_received_qty numeric;
  v_current_qty numeric;
  v_current_avg_cost numeric;
  v_new_avg_cost numeric;
BEGIN
  -- Only process if PO status is 'received' or 'partial'
  IF NEW.status IN ('received', 'partial') THEN

    -- Loop through all PO items
    FOR v_product_id, v_new_unit_price, v_received_qty IN
      SELECT poi.product_id, poi.unit_price, poi.quantity
      FROM purchase_order_items poi
      WHERE poi.purchase_order_id = NEW.id
        AND poi.unit_price IS NOT NULL
        AND poi.unit_price > 0
    LOOP
      -- Use vendor's primary location (or default location)
      SELECT location_id INTO v_location_id
      FROM locations
      WHERE vendor_id = NEW.vendor_id
      LIMIT 1;

      IF v_location_id IS NOT NULL THEN
        -- Get current inventory
        SELECT quantity, average_cost INTO v_current_qty, v_current_avg_cost
        FROM inventory
        WHERE product_id = v_product_id
          AND location_id = v_location_id;

        IF FOUND THEN
          -- Calculate weighted average: (old_qty × old_cost + new_qty × new_cost) / total_qty
          IF v_current_qty > 0 AND v_current_avg_cost > 0 THEN
            v_new_avg_cost := (v_current_qty * v_current_avg_cost + v_received_qty * v_new_unit_price) / (v_current_qty + v_received_qty);
          ELSE
            v_new_avg_cost := v_new_unit_price;
          END IF;

          -- Update inventory with new average cost
          UPDATE inventory
          SET
            average_cost = v_new_avg_cost,
            unit_cost = v_new_unit_price,  -- Latest unit cost
            updated_at = NOW()
          WHERE product_id = v_product_id
            AND location_id = v_location_id;
        END IF;
      END IF;
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory cost updates
DROP TRIGGER IF EXISTS trigger_update_inventory_average_cost ON purchase_orders;
CREATE TRIGGER trigger_update_inventory_average_cost
  AFTER UPDATE OF status ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.status IN ('received', 'partial') AND OLD.status != NEW.status)
  EXECUTE FUNCTION update_inventory_average_cost();

-- ============================================================================
-- PART 3: FUNCTION TO SET ORDER ITEM COST AT CREATION
-- ============================================================================
-- When an order item is created, snapshot the current product cost

CREATE OR REPLACE FUNCTION set_order_item_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_cost numeric;
  v_product_name text;
  v_unit_price numeric;
BEGIN
  -- Get current product cost
  SELECT cost_price INTO v_cost
  FROM products
  WHERE id = NEW.product_id;

  -- If product cost is null or 0, try to get from inventory average cost
  IF v_cost IS NULL OR v_cost = 0 THEN
    SELECT average_cost INTO v_cost
    FROM inventory
    WHERE product_id = NEW.product_id
      AND vendor_id = NEW.vendor_id
    LIMIT 1;
  END IF;

  -- Set default to 0 if still null (better than leaving NULL)
  v_cost := COALESCE(v_cost, 0);

  -- Set cost_per_unit (this is the snapshot!)
  NEW.cost_per_unit := v_cost;

  -- Calculate profit and margin
  v_unit_price := COALESCE(NEW.unit_price, 0);
  NEW.profit_per_unit := v_unit_price - v_cost;

  IF v_unit_price > 0 THEN
    NEW.margin_percentage := ((v_unit_price - v_cost) / v_unit_price) * 100;
  ELSE
    NEW.margin_percentage := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order item cost calculation
DROP TRIGGER IF EXISTS trigger_set_order_item_cost ON order_items;
CREATE TRIGGER trigger_set_order_item_cost
  BEFORE INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION set_order_item_cost();

-- ============================================================================
-- PART 4: FUNCTION TO CALCULATE ORDER COGS
-- ============================================================================
-- When order is completed, calculate total cost_of_goods and gross_profit

CREATE OR REPLACE FUNCTION calculate_order_cogs()
RETURNS TRIGGER AS $$
DECLARE
  v_total_cogs numeric;
  v_gross_profit numeric;
BEGIN
  -- Only calculate when order is paid and delivered/completed
  IF NEW.payment_status = 'paid' AND NEW.status IN ('delivered', 'completed') THEN

    -- Calculate total COGS from order items
    SELECT
      COALESCE(SUM(cost_per_unit * quantity), 0),
      COALESCE(SUM(profit_per_unit * quantity), 0)
    INTO v_total_cogs, v_gross_profit
    FROM order_items
    WHERE order_id = NEW.id;

    -- Update order with calculated values
    NEW.cost_of_goods := v_total_cogs;
    NEW.gross_profit := v_gross_profit;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order COGS calculation
DROP TRIGGER IF EXISTS trigger_calculate_order_cogs ON orders;
CREATE TRIGGER trigger_calculate_order_cogs
  BEFORE UPDATE OF payment_status, status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_cogs();

-- ============================================================================
-- PART 5: HELPER FUNCTION FOR BACKFILLING HISTORICAL DATA
-- ============================================================================
-- Function to backfill cost_per_unit for existing order items

CREATE OR REPLACE FUNCTION backfill_order_item_costs()
RETURNS TABLE(
  items_processed integer,
  items_updated integer,
  items_no_cost integer
) AS $$
DECLARE
  v_items_processed integer := 0;
  v_items_updated integer := 0;
  v_items_no_cost integer := 0;
  v_order_item RECORD;
  v_cost numeric;
  v_order_date timestamp with time zone;
BEGIN
  -- Loop through all order items with NULL cost_per_unit
  FOR v_order_item IN
    SELECT
      oi.id,
      oi.product_id,
      oi.vendor_id,
      oi.order_id,
      oi.unit_price,
      oi.quantity,
      o.created_at as order_date
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.cost_per_unit IS NULL
    ORDER BY o.created_at DESC
  LOOP
    v_items_processed := v_items_processed + 1;
    v_order_date := v_order_item.order_date;
    v_cost := NULL;

    -- Strategy 1: Try to get cost from PO received BEFORE the order date
    SELECT poi.unit_price INTO v_cost
    FROM purchase_order_items poi
    JOIN purchase_orders po ON po.id = poi.purchase_order_id
    WHERE poi.product_id = v_order_item.product_id
      AND po.vendor_id = v_order_item.vendor_id
      AND po.status IN ('received', 'partial')
      AND po.updated_at <= v_order_date
      AND poi.unit_price IS NOT NULL
      AND poi.unit_price > 0
    ORDER BY po.updated_at DESC
    LIMIT 1;

    -- Strategy 2: If no PO found before order date, use current product cost
    IF v_cost IS NULL THEN
      SELECT cost_price INTO v_cost
      FROM products
      WHERE id = v_order_item.product_id
        AND cost_price IS NOT NULL
        AND cost_price > 0;
    END IF;

    -- Strategy 3: Use any PO cost (even after order date) as estimate
    IF v_cost IS NULL THEN
      SELECT poi.unit_price INTO v_cost
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.purchase_order_id
      WHERE poi.product_id = v_order_item.product_id
        AND po.vendor_id = v_order_item.vendor_id
        AND poi.unit_price IS NOT NULL
        AND poi.unit_price > 0
      ORDER BY po.created_at DESC
      LIMIT 1;
    END IF;

    -- Update the order item if cost found
    IF v_cost IS NOT NULL AND v_cost > 0 THEN
      UPDATE order_items
      SET
        cost_per_unit = v_cost,
        profit_per_unit = unit_price - v_cost,
        margin_percentage = CASE
          WHEN unit_price > 0 THEN ((unit_price - v_cost) / unit_price) * 100
          ELSE 0
        END
      WHERE id = v_order_item.id;

      v_items_updated := v_items_updated + 1;
    ELSE
      v_items_no_cost := v_items_no_cost + 1;
    END IF;

    -- Log progress every 1000 items
    IF v_items_processed % 1000 = 0 THEN
      RAISE NOTICE 'Processed % items, updated %, no cost found for %',
        v_items_processed, v_items_updated, v_items_no_cost;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_items_processed, v_items_updated, v_items_no_cost;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: HELPER FUNCTION TO RECALCULATE ORDER COGS
-- ============================================================================
-- Function to recalculate cost_of_goods and gross_profit for existing orders

CREATE OR REPLACE FUNCTION recalculate_order_cogs()
RETURNS TABLE(
  orders_processed integer,
  orders_updated integer
) AS $$
DECLARE
  v_orders_processed integer := 0;
  v_orders_updated integer := 0;
  v_order RECORD;
  v_total_cogs numeric;
  v_gross_profit numeric;
BEGIN
  -- Loop through all completed/paid orders
  FOR v_order IN
    SELECT id
    FROM orders
    WHERE payment_status = 'paid'
      AND status IN ('delivered', 'completed')
      AND (cost_of_goods IS NULL OR cost_of_goods = 0)
    ORDER BY created_at DESC
  LOOP
    v_orders_processed := v_orders_processed + 1;

    -- Calculate COGS from order items
    SELECT
      COALESCE(SUM(cost_per_unit * quantity), 0),
      COALESCE(SUM(profit_per_unit * quantity), 0)
    INTO v_total_cogs, v_gross_profit
    FROM order_items
    WHERE order_id = v_order.id
      AND cost_per_unit IS NOT NULL;

    -- Update order if COGS > 0
    IF v_total_cogs > 0 THEN
      UPDATE orders
      SET
        cost_of_goods = v_total_cogs,
        gross_profit = v_gross_profit
      WHERE id = v_order.id;

      v_orders_updated := v_orders_updated + 1;
    END IF;

    -- Log progress every 100 orders
    IF v_orders_processed % 100 = 0 THEN
      RAISE NOTICE 'Processed % orders, updated %', v_orders_processed, v_orders_updated;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_orders_processed, v_orders_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 7: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for looking up PO items by product (used in triggers)
CREATE INDEX IF NOT EXISTS idx_po_items_product_date
  ON purchase_order_items(product_id, created_at DESC);

-- Index for looking up product costs
CREATE INDEX IF NOT EXISTS idx_products_cost_price
  ON products(id) WHERE cost_price IS NOT NULL;

-- Index for order items cost queries
CREATE INDEX IF NOT EXISTS idx_order_items_cost
  ON order_items(order_id) WHERE cost_per_unit IS NOT NULL;

-- Index for inventory cost lookups
CREATE INDEX IF NOT EXISTS idx_inventory_product_location
  ON inventory(product_id, location_id);

-- ============================================================================
-- EXECUTION NOTES
-- ============================================================================
-- After running this migration, execute the backfill functions:
--
-- 1. Backfill order item costs:
--    SELECT * FROM backfill_order_item_costs();
--
-- 2. Recalculate order COGS:
--    SELECT * FROM recalculate_order_cogs();
--
-- These may take several minutes depending on data volume.
-- ============================================================================
