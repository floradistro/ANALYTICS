-- Simple order status history tracking
-- Just create the table and triggers first

CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_user ON order_status_history(changed_by_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_status ON order_status_history(to_status, created_at DESC);

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, changed_by_user_id, created_at)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.updated_by_user_id, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_order_status_change ON orders;
CREATE TRIGGER trigger_log_order_status_change
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION log_order_status_change();

-- Trigger to log order creation
CREATE OR REPLACE FUNCTION log_order_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO order_status_history (order_id, from_status, to_status, changed_by_user_id, created_at)
  VALUES (NEW.id, NULL, NEW.status, COALESCE(NEW.updated_by_user_id, NEW.employee_id, NEW.created_by_user_id), NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_order_creation ON orders;
CREATE TRIGGER trigger_log_order_creation
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_creation();
