-- ============================================================================
-- Staff Attribution System - Automatic tracking of who did what
-- Created: 2025-12-16
-- Purpose: Track which staff member performed each order action
-- ============================================================================

-- ============================================================================
-- PART 1: ADD updated_by_user_id COLUMN IF IT DOESN'T EXIST
-- ============================================================================
-- This column should be set by the application whenever an order is updated

DO $$
BEGIN
  -- Check if updated_by_user_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders'
    AND column_name = 'updated_by_user_id'
  ) THEN
    -- Add the column
    ALTER TABLE orders ADD COLUMN updated_by_user_id uuid REFERENCES auth.users(id);

    -- Add index for performance
    CREATE INDEX idx_orders_updated_by_user_id ON orders(updated_by_user_id);

    RAISE NOTICE 'Added updated_by_user_id column to orders table';
  ELSE
    RAISE NOTICE 'updated_by_user_id column already exists';
  END IF;
END $$;

-- ============================================================================
-- PART 2: FUNCTION TO TRACK STAFF ON STATUS CHANGES
-- ============================================================================
-- When order status changes, automatically record who made the change

CREATE OR REPLACE FUNCTION track_staff_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'confirmed', record who confirmed it
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    -- Only set if not already set
    IF NEW.created_by_user_id IS NULL THEN
      NEW.created_by_user_id := NEW.updated_by_user_id;
    END IF;
  END IF;

  -- When status changes to 'preparing' or 'prepared', record who prepared it
  IF NEW.status IN ('preparing', 'prepared') AND OLD.status NOT IN ('preparing', 'prepared') THEN
    NEW.prepared_by_user_id := NEW.updated_by_user_id;
  END IF;

  -- When status changes to 'shipped' or 'in_transit', record who shipped it
  IF NEW.status IN ('shipped', 'in_transit') AND OLD.status NOT IN ('shipped', 'in_transit') THEN
    NEW.shipped_by_user_id := NEW.updated_by_user_id;
  END IF;

  -- When status changes to 'delivered' or 'completed', record who delivered it
  IF NEW.status IN ('delivered', 'completed') AND OLD.status NOT IN ('delivered', 'completed') THEN
    NEW.delivered_by_user_id := NEW.updated_by_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic staff attribution
DROP TRIGGER IF EXISTS trigger_track_staff_on_status_change ON orders;
CREATE TRIGGER trigger_track_staff_on_status_change
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status AND NEW.updated_by_user_id IS NOT NULL)
  EXECUTE FUNCTION track_staff_on_status_change();

-- ============================================================================
-- PART 3: FUNCTION TO SET created_by_user_id ON INSERT
-- ============================================================================
-- When a new order is created via the dashboard, record who created it

CREATE OR REPLACE FUNCTION set_created_by_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- If created_by_user_id is not set and updated_by_user_id is provided, use it
  IF NEW.created_by_user_id IS NULL AND NEW.updated_by_user_id IS NOT NULL THEN
    NEW.created_by_user_id := NEW.updated_by_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order creation tracking
DROP TRIGGER IF EXISTS trigger_set_created_by_on_insert ON orders;
CREATE TRIGGER trigger_set_created_by_on_insert
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_created_by_on_insert();

-- ============================================================================
-- PART 4: HELPER VIEW FOR STAFF ATTRIBUTION REPORTING
-- ============================================================================
-- View to see orders with staff member names (if users table has name fields)

CREATE OR REPLACE VIEW orders_with_staff_attribution AS
SELECT
  o.id,
  o.order_number,
  o.status,
  o.created_at,
  o.updated_at,
  -- Staff IDs
  o.employee_id,
  o.created_by_user_id,
  o.prepared_by_user_id,
  o.shipped_by_user_id,
  o.delivered_by_user_id,
  o.updated_by_user_id,
  -- Try to join with users table for names (if columns exist)
  u_created.email as created_by_email,
  u_prepared.email as prepared_by_email,
  u_shipped.email as shipped_by_email,
  u_delivered.email as delivered_by_email,
  u_updated.email as updated_by_email
FROM orders o
LEFT JOIN auth.users u_created ON u_created.id = o.created_by_user_id
LEFT JOIN auth.users u_prepared ON u_prepared.id = o.prepared_by_user_id
LEFT JOIN auth.users u_shipped ON u_shipped.id = o.shipped_by_user_id
LEFT JOIN auth.users u_delivered ON u_delivered.id = o.delivered_by_user_id
LEFT JOIN auth.users u_updated ON u_updated.id = o.updated_by_user_id;

-- ============================================================================
-- EXECUTION NOTES
-- ============================================================================
-- After running this migration:
--
-- 1. Update your application code to pass updated_by_user_id when updating orders:
--    const { data, error } = await supabase
--      .from('orders')
--      .update({
--        status: 'shipped',
--        updated_by_user_id: currentUser.id  // <-- Add this!
--      })
--      .eq('id', orderId)
--
-- 2. The trigger will automatically populate the staff tracking fields
--    based on the status transition and who made the change
--
-- 3. Use the orders_with_staff_attribution view for reporting:
--    SELECT * FROM orders_with_staff_attribution WHERE status = 'shipped'
-- ============================================================================
