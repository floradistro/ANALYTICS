-- ============================================================================
-- Order Status History Tracking
-- Created: 2025-12-16
-- Purpose: Track every status change with staff attribution and timestamps
--          for performance metrics and fulfillment time tracking
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE ORDER STATUS HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Status transition
  from_status text,
  to_status text NOT NULL,

  -- Staff attribution - who made this change
  changed_by_user_id uuid REFERENCES users(id),

  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT NOW(),

  -- Additional context
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id
  ON order_status_history(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_status_history_user
  ON order_status_history(changed_by_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_status_history_status
  ON order_status_history(to_status, created_at DESC);

-- ============================================================================
-- PART 2: TRIGGER TO LOG STATUS CHANGES
-- ============================================================================

CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO order_status_history (
      order_id,
      from_status,
      to_status,
      changed_by_user_id,
      created_at
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.updated_by_user_id,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status change logging
DROP TRIGGER IF EXISTS trigger_log_order_status_change ON orders;
CREATE TRIGGER trigger_log_order_status_change
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION log_order_status_change();

-- ============================================================================
-- PART 3: TRIGGER TO LOG INITIAL ORDER CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION log_order_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the initial status when order is created
  INSERT INTO order_status_history (
    order_id,
    from_status,
    to_status,
    changed_by_user_id,
    created_at
  ) VALUES (
    NEW.id,
    NULL,
    NEW.status,
    COALESCE(NEW.updated_by_user_id, NEW.employee_id, NEW.created_by_user_id),
    NEW.created_at
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order creation logging
DROP TRIGGER IF EXISTS trigger_log_order_creation ON orders;
CREATE TRIGGER trigger_log_order_creation
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_creation();

-- ============================================================================
-- PART 4: VIEW FOR FULFILLMENT TIME ANALYSIS
-- ============================================================================

CREATE OR REPLACE VIEW order_fulfillment_times AS
WITH status_changes AS (
  SELECT
    order_id,
    to_status,
    changed_by_user_id,
    created_at as changed_at,
    LAG(created_at) OVER (PARTITION BY order_id ORDER BY created_at) as previous_time,
    LAG(to_status) OVER (PARTITION BY order_id ORDER BY created_at) as previous_status
  FROM order_status_history
)
SELECT
  sc.order_id,
  o.order_number,
  sc.previous_status,
  sc.to_status,
  sc.changed_by_user_id,
  u.first_name || ' ' || u.last_name as staff_name,
  u.email as staff_email,
  sc.previous_time as started_at,
  sc.changed_at as completed_at,
  EXTRACT(EPOCH FROM (sc.changed_at - sc.previous_time)) as duration_seconds,
  EXTRACT(EPOCH FROM (sc.changed_at - sc.previous_time)) / 60 as duration_minutes,
  o.order_type,
  o.total_amount
FROM status_changes sc
JOIN orders o ON o.id = sc.order_id
LEFT JOIN users u ON u.id = sc.changed_by_user_id
WHERE sc.previous_time IS NOT NULL;

-- ============================================================================
-- PART 5: VIEW FOR EMPLOYEE PERFORMANCE METRICS
-- ============================================================================

CREATE OR REPLACE VIEW employee_fulfillment_performance AS
WITH fulfillment_times AS (
  SELECT
    changed_by_user_id,
    to_status,
    EXTRACT(EPOCH FROM (created_at - previous_time)) / 60 as minutes,
    order_id
  FROM (
    SELECT
      order_id,
      to_status,
      changed_by_user_id,
      created_at,
      LAG(created_at) OVER (PARTITION BY order_id ORDER BY created_at) as previous_time
    FROM order_status_history
  ) sub
  WHERE previous_time IS NOT NULL
    AND changed_by_user_id IS NOT NULL
)
SELECT
  ft.changed_by_user_id as user_id,
  u.first_name || ' ' || u.last_name as staff_name,
  u.email as staff_email,
  u.role,

  -- Overall metrics
  COUNT(DISTINCT ft.order_id) as total_orders_processed,

  -- Processing times (pending → processing)
  COUNT(*) FILTER (WHERE ft.to_status = 'processing') as orders_started,
  ROUND(AVG(ft.minutes) FILTER (WHERE ft.to_status = 'processing'), 2) as avg_pickup_time_minutes,

  -- Packing times (processing → shipped)
  COUNT(*) FILTER (WHERE ft.to_status = 'shipped') as orders_shipped,
  ROUND(AVG(ft.minutes) FILTER (WHERE ft.to_status = 'shipped'), 2) as avg_packing_time_minutes,

  -- Delivery times (shipped → delivered)
  COUNT(*) FILTER (WHERE ft.to_status = 'delivered') as orders_delivered,
  ROUND(AVG(ft.minutes) FILTER (WHERE ft.to_status = 'delivered'), 2) as avg_delivery_time_minutes,

  -- Overall average
  ROUND(AVG(ft.minutes), 2) as avg_overall_time_minutes

FROM fulfillment_times ft
JOIN users u ON u.id = ft.changed_by_user_id
GROUP BY ft.changed_by_user_id, u.first_name, u.last_name, u.email, u.role
ORDER BY total_orders_processed DESC;

-- ============================================================================
-- PART 6: FUNCTION TO GET ORDER TIMELINE WITH STAFF
-- ============================================================================

CREATE OR REPLACE FUNCTION get_order_timeline(p_order_id uuid)
RETURNS TABLE(
  step_number int,
  status text,
  staff_name text,
  staff_email text,
  changed_at timestamptz,
  duration_minutes numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH timeline AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY osh.created_at) as step_num,
      osh.to_status,
      u.first_name || ' ' || u.last_name as name,
      u.email,
      osh.created_at,
      EXTRACT(EPOCH FROM (osh.created_at - LAG(osh.created_at) OVER (ORDER BY osh.created_at))) / 60 as mins
    FROM order_status_history osh
    LEFT JOIN users u ON u.id = osh.changed_by_user_id
    WHERE osh.order_id = p_order_id
    ORDER BY osh.created_at
  )
  SELECT
    step_num::int,
    to_status,
    name,
    email,
    created_at as changed_at,
    ROUND(mins, 2) as duration_minutes
  FROM timeline;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 7: BACKFILL EXISTING ORDERS (Optional)
-- ============================================================================

-- This will create initial status history entries for existing orders
-- Run this once to populate history for orders that already exist

CREATE OR REPLACE FUNCTION backfill_order_status_history()
RETURNS TABLE(
  orders_processed integer,
  history_entries_created integer
) AS $$
DECLARE
  v_orders_processed integer := 0;
  v_entries_created integer := 0;
  v_order RECORD;
BEGIN
  -- Loop through all orders that don't have history yet
  FOR v_order IN
    SELECT o.id, o.status, o.created_at, o.employee_id, o.created_by_user_id
    FROM orders o
    LEFT JOIN order_status_history osh ON osh.order_id = o.id
    WHERE osh.id IS NULL
    ORDER BY o.created_at DESC
  LOOP
    v_orders_processed := v_orders_processed + 1;

    -- Create initial history entry for this order
    INSERT INTO order_status_history (
      order_id,
      from_status,
      to_status,
      changed_by_user_id,
      created_at
    ) VALUES (
      v_order.id,
      NULL,
      v_order.status,
      COALESCE(v_order.employee_id, v_order.created_by_user_id),
      v_order.created_at
    );

    v_entries_created := v_entries_created + 1;

    -- Log progress every 100 orders
    IF v_orders_processed % 100 = 0 THEN
      RAISE NOTICE 'Processed % orders, created % history entries', v_orders_processed, v_entries_created;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_orders_processed, v_entries_created;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- EXECUTION NOTES
-- ============================================================================
-- After running this migration:
--
-- 1. Optional: Backfill existing orders
--    SELECT * FROM backfill_order_status_history();
--
-- 2. View employee performance:
--    SELECT * FROM employee_fulfillment_performance;
--
-- 3. View order timeline:
--    SELECT * FROM get_order_timeline('order-uuid-here');
--
-- 4. View fulfillment times:
--    SELECT * FROM order_fulfillment_times
--    WHERE staff_name = 'Summer Ball'
--    ORDER BY completed_at DESC;
--
-- 5. Track average fulfillment time by employee:
--    SELECT
--      staff_name,
--      COUNT(*) as orders_processed,
--      AVG(duration_minutes) as avg_minutes
--    FROM order_fulfillment_times
--    WHERE to_status = 'shipped'
--    GROUP BY staff_name;
-- ============================================================================
