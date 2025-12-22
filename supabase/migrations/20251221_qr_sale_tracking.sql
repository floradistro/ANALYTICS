-- Add sale-level tracking columns to qr_codes table
-- These enable per-unit QR tracking with order/customer/staff/location data

ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS staff_id UUID;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS unit_price DECIMAL;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS quantity_index INTEGER;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS location_name TEXT;

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_qr_codes_customer_id ON qr_codes(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_codes_staff_id ON qr_codes(staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_codes_sold_at ON qr_codes(sold_at) WHERE sold_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_codes_type ON qr_codes(type);

-- Comment on columns for documentation
COMMENT ON COLUMN qr_codes.customer_id IS 'Customer who purchased this item (for sale-level QR codes)';
COMMENT ON COLUMN qr_codes.staff_id IS 'Staff member who processed the sale';
COMMENT ON COLUMN qr_codes.sold_at IS 'Timestamp when the item was sold';
COMMENT ON COLUMN qr_codes.unit_price IS 'Price paid for this unit';
COMMENT ON COLUMN qr_codes.quantity_index IS 'Index if multiple units sold (1, 2, 3...)';
COMMENT ON COLUMN qr_codes.location_name IS 'Name of the location where sold';
