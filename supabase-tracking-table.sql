-- Shipment Tracking Table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS shipment_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_number TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL,

  -- EasyPost tracker info
  easypost_tracker_id TEXT,
  carrier TEXT DEFAULT 'USPS',

  -- Status info
  status TEXT DEFAULT 'unknown', -- delivered, out_for_delivery, in_transit, pre_transit, alert, unknown
  status_category TEXT,
  status_description TEXT,

  -- Delivery info
  estimated_delivery DATE,
  actual_delivery TIMESTAMPTZ,

  -- Location info
  last_location TEXT,
  last_update TIMESTAMPTZ,

  -- Full tracking events (JSON array)
  events JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_tracking_number ON shipment_tracking(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_vendor_id ON shipment_tracking(vendor_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_order_id ON shipment_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_status ON shipment_tracking(status);

-- Enable RLS
ALTER TABLE shipment_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own vendor's tracking data
CREATE POLICY "Users can view own vendor tracking" ON shipment_tracking
  FOR SELECT USING (vendor_id IN (
    SELECT vendor_id FROM profiles WHERE id = auth.uid()
  ));

-- Policy: Service role can do everything (for webhooks)
CREATE POLICY "Service role full access" ON shipment_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_shipment_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shipment_tracking_updated_at
  BEFORE UPDATE ON shipment_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_shipment_tracking_updated_at();
