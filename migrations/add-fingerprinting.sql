-- Browser Fingerprinting Database Schema
-- Adds fingerprint tracking for fraud detection, cart recovery, and returning visitor detection

-- Table to store device fingerprints
CREATE TABLE IF NOT EXISTS device_fingerprints (
  id SERIAL PRIMARY KEY,
  fingerprint_id TEXT NOT NULL UNIQUE,
  vendor_id UUID NOT NULL,

  -- Fingerprint components
  canvas_fingerprint TEXT,
  webgl_fingerprint TEXT,
  audio_fingerprint TEXT,
  screen_resolution TEXT,
  fonts TEXT[], -- Array of detected fonts
  plugins TEXT[], -- Array of detected plugins
  timezone TEXT,
  language TEXT,
  platform TEXT,
  hardware_concurrency INT,
  device_memory INT,
  color_depth INT,
  pixel_ratio DECIMAL,
  touch_support BOOLEAN,
  cookie_enabled BOOLEAN,
  do_not_track TEXT,

  -- Metadata
  confidence_score INT, -- 0-100 confidence
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  total_visits INT DEFAULT 1,

  -- Linked visitors (many visitor_ids can map to same fingerprint)
  linked_visitor_ids TEXT[],

  -- Fraud detection flags
  is_suspicious BOOLEAN DEFAULT FALSE,
  suspicious_reason TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_fingerprints_fingerprint_id ON device_fingerprints(fingerprint_id);
CREATE INDEX IF NOT EXISTS idx_fingerprints_vendor_id ON device_fingerprints(vendor_id);
CREATE INDEX IF NOT EXISTS idx_fingerprints_suspicious ON device_fingerprints(is_suspicious);

-- Add fingerprint_id to website_visitors table
ALTER TABLE website_visitors
ADD COLUMN IF NOT EXISTS fingerprint_id TEXT;

CREATE INDEX IF NOT EXISTS idx_visitors_fingerprint_id ON website_visitors(fingerprint_id);

-- Add fingerprint_id to analytics_events table
ALTER TABLE analytics_events
ADD COLUMN IF NOT EXISTS fingerprint_id TEXT;

CREATE INDEX IF NOT EXISTS idx_events_fingerprint_id ON analytics_events(fingerprint_id);

-- Table to track cart abandonment for recovery
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id SERIAL PRIMARY KEY,
  vendor_id UUID NOT NULL,
  visitor_id TEXT NOT NULL,
  fingerprint_id TEXT,

  -- Cart data
  cart_items JSONB NOT NULL,
  cart_total DECIMAL NOT NULL,
  item_count INT NOT NULL,

  -- Customer data (if provided during checkout)
  email TEXT,
  phone TEXT,
  name TEXT,

  -- Tracking
  abandoned_at TIMESTAMP DEFAULT NOW(),
  last_reminded_at TIMESTAMP,
  reminder_count INT DEFAULT 0,
  recovered BOOLEAN DEFAULT FALSE,
  recovered_at TIMESTAMP,
  recovery_order_id TEXT,

  -- URL to resume checkout
  checkout_url TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for cart recovery
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_vendor_id ON abandoned_carts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_visitor_id ON abandoned_carts(visitor_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_fingerprint_id ON abandoned_carts(fingerprint_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON abandoned_carts(email);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_recovered ON abandoned_carts(recovered);

-- Table to link fingerprints to customer accounts
CREATE TABLE IF NOT EXISTS fingerprint_customer_links (
  id SERIAL PRIMARY KEY,
  fingerprint_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  vendor_id UUID NOT NULL,

  -- How this link was established
  link_source TEXT, -- 'purchase', 'login', 'signup', etc.
  confidence TEXT, -- 'high', 'medium', 'low'

  first_linked TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(fingerprint_id, customer_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_fp_customer_links_fp ON fingerprint_customer_links(fingerprint_id);
CREATE INDEX IF NOT EXISTS idx_fp_customer_links_customer ON fingerprint_customer_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_fp_customer_links_vendor ON fingerprint_customer_links(vendor_id);

-- Function to update device_fingerprints.updated_at
CREATE OR REPLACE FUNCTION update_fingerprint_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamps
CREATE TRIGGER fingerprint_updated
  BEFORE UPDATE ON device_fingerprints
  FOR EACH ROW
  EXECUTE FUNCTION update_fingerprint_timestamp();

-- View for returning visitor detection
CREATE OR REPLACE VIEW returning_visitors AS
SELECT
  f.fingerprint_id,
  f.vendor_id,
  f.total_visits,
  f.first_seen,
  f.last_seen,
  ARRAY_LENGTH(f.linked_visitor_ids, 1) as unique_visitor_count,
  f.linked_visitor_ids,
  fcl.customer_id,
  fcl.link_source,
  f.is_suspicious
FROM device_fingerprints f
LEFT JOIN fingerprint_customer_links fcl ON f.fingerprint_id = fcl.fingerprint_id
WHERE f.total_visits > 1;

-- View for fraud detection - suspicious patterns
CREATE OR REPLACE VIEW suspicious_fingerprints AS
SELECT
  f.fingerprint_id,
  f.vendor_id,
  f.total_visits,
  ARRAY_LENGTH(f.linked_visitor_ids, 1) as unique_visitor_count,
  f.first_seen,
  f.last_seen,
  f.suspicious_reason,
  f.is_blocked,
  -- Flag if too many visitor IDs for same fingerprint (potential fraud)
  CASE
    WHEN ARRAY_LENGTH(f.linked_visitor_ids, 1) > 10 THEN 'multiple_identities'
    WHEN f.total_visits > 100 AND ARRAY_LENGTH(f.linked_visitor_ids, 1) = 1 THEN 'bot_pattern'
    ELSE f.suspicious_reason
  END as detected_pattern
FROM device_fingerprints f
WHERE f.is_suspicious = TRUE
  OR ARRAY_LENGTH(f.linked_visitor_ids, 1) > 10
  OR (f.total_visits > 100 AND ARRAY_LENGTH(f.linked_visitor_ids, 1) = 1);

COMMENT ON TABLE device_fingerprints IS 'Stores unique device fingerprints for fraud detection and visitor tracking';
COMMENT ON TABLE abandoned_carts IS 'Tracks abandoned carts for recovery campaigns';
COMMENT ON TABLE fingerprint_customer_links IS 'Links device fingerprints to customer accounts';
COMMENT ON VIEW returning_visitors IS 'Identifies returning visitors across sessions';
COMMENT ON VIEW suspicious_fingerprints IS 'Detects suspicious patterns for fraud prevention';
