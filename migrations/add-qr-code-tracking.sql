-- QR Code Tracking System
-- Comprehensive tracking for all QR codes with full analytics integration

-- =============================================
-- 1. QR Codes Table
-- =============================================
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL,

  -- QR Code Metadata
  code VARCHAR(50) UNIQUE NOT NULL, -- Short unique code (e.g., "ORD123", "PROD456")
  name VARCHAR(255), -- Human-readable name (e.g., "Blue Dream QR", "Order #12345")
  type VARCHAR(50) NOT NULL, -- product, order, location, campaign, custom

  -- Destination
  destination_url TEXT NOT NULL, -- Where QR code redirects
  landing_page_url TEXT, -- Optional custom landing page (e.g., /qr/ABC123)

  -- Visual Style
  qr_style VARCHAR(50) DEFAULT 'rounded', -- standard, rounded, dots, sharp, leaf, squircle
  eye_style VARCHAR(50) DEFAULT 'rounded', -- standard, rounded, circle, leaf, shield, teardrop

  -- Branding
  logo_url TEXT, -- Vendor logo URL for branded QR
  brand_color VARCHAR(7), -- Hex color (e.g., "#10b981")

  -- Associated Resources
  product_id VARCHAR(255), -- From backend products
  order_id VARCHAR(255), -- From backend orders
  location_id VARCHAR(255), -- Store/location ID
  campaign_name VARCHAR(255), -- Marketing campaign

  -- Landing Page Content
  landing_page_title VARCHAR(255),
  landing_page_description TEXT,
  landing_page_image_url TEXT,
  landing_page_cta_text VARCHAR(100), -- Call to action button text
  landing_page_cta_url TEXT, -- Call to action button URL

  -- Status & Settings
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ, -- Optional expiration
  max_scans INTEGER, -- Optional scan limit

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- User who created it
  tags TEXT[], -- For organization/filtering

  -- Stats (denormalized for performance)
  total_scans INTEGER DEFAULT 0,
  unique_scans INTEGER DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,

  -- Indexes
  CONSTRAINT fk_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX idx_qr_codes_vendor_id ON qr_codes(vendor_id);
CREATE INDEX idx_qr_codes_code ON qr_codes(code);
CREATE INDEX idx_qr_codes_type ON qr_codes(type);
CREATE INDEX idx_qr_codes_product_id ON qr_codes(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_qr_codes_order_id ON qr_codes(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_qr_codes_campaign ON qr_codes(campaign_name) WHERE campaign_name IS NOT NULL;
CREATE INDEX idx_qr_codes_active ON qr_codes(is_active, vendor_id);

-- =============================================
-- 2. QR Scans Table
-- =============================================
CREATE TABLE IF NOT EXISTS qr_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL,

  -- Visitor Tracking
  visitor_id UUID REFERENCES website_visitors(id) ON DELETE SET NULL,
  fingerprint_id VARCHAR(255), -- Device fingerprint
  session_id VARCHAR(255), -- Session identifier

  -- Scan Metadata
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  is_first_scan BOOLEAN DEFAULT FALSE, -- First time this device scanned this QR

  -- Location Data (high precision)
  latitude DECIMAL(10, 8), -- Browser GPS
  longitude DECIMAL(11, 8), -- Browser GPS
  geolocation_accuracy DECIMAL(10, 2), -- Meters
  geolocation_source VARCHAR(50), -- browser_gps, ip_lookup

  -- IP-based Location
  city VARCHAR(255),
  region VARCHAR(255),
  country VARCHAR(2),
  postal_code VARCHAR(20),
  timezone VARCHAR(100),

  -- Device & Browser
  user_agent TEXT,
  device_type VARCHAR(50), -- mobile, tablet, desktop
  device_brand VARCHAR(100),
  device_model VARCHAR(100),
  os_name VARCHAR(100),
  os_version VARCHAR(50),
  browser_name VARCHAR(100),
  browser_version VARCHAR(50),

  -- Network
  ip_address INET,
  isp VARCHAR(255),

  -- Referrer & UTM
  referrer TEXT,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_term VARCHAR(255),
  utm_content VARCHAR(255),

  -- Conversion Tracking
  converted BOOLEAN DEFAULT FALSE, -- Did they complete desired action?
  conversion_value DECIMAL(10, 2), -- Order total, signup value, etc.
  conversion_type VARCHAR(100), -- purchase, signup, download, etc.
  converted_at TIMESTAMPTZ,

  -- Additional Metadata
  notes TEXT, -- Optional notes
  custom_data JSONB, -- Flexible storage for custom tracking

  -- Indexes
  CONSTRAINT fk_qr_code FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE CASCADE,
  CONSTRAINT fk_vendor_scan FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX idx_qr_scans_qr_code ON qr_scans(qr_code_id);
CREATE INDEX idx_qr_scans_vendor ON qr_scans(vendor_id);
CREATE INDEX idx_qr_scans_visitor ON qr_scans(visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX idx_qr_scans_fingerprint ON qr_scans(fingerprint_id) WHERE fingerprint_id IS NOT NULL;
CREATE INDEX idx_qr_scans_scanned_at ON qr_scans(scanned_at DESC);
CREATE INDEX idx_qr_scans_location ON qr_scans(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_qr_scans_conversion ON qr_scans(converted, vendor_id) WHERE converted = TRUE;
CREATE INDEX idx_qr_scans_city ON qr_scans(city, region) WHERE city IS NOT NULL;

-- =============================================
-- 3. QR Campaign Stats View
-- =============================================
CREATE OR REPLACE VIEW qr_campaign_stats AS
SELECT
  qc.vendor_id,
  qc.campaign_name,
  qc.type,
  COUNT(DISTINCT qc.id) as total_qr_codes,
  SUM(qc.total_scans) as total_scans,
  SUM(qc.unique_scans) as unique_scans,
  COUNT(DISTINCT qs.visitor_id) FILTER (WHERE qs.converted = TRUE) as total_conversions,
  SUM(qs.conversion_value) as total_conversion_value,
  COUNT(DISTINCT qs.city) as unique_cities,
  COUNT(DISTINCT qs.country) as unique_countries,
  MAX(qc.last_scanned_at) as last_scan_date,
  MIN(qc.created_at) as campaign_start_date
FROM qr_codes qc
LEFT JOIN qr_scans qs ON qs.qr_code_id = qc.id
WHERE qc.campaign_name IS NOT NULL
GROUP BY qc.vendor_id, qc.campaign_name, qc.type;

-- =============================================
-- 4. QR Heatmap View (Geographic Distribution)
-- =============================================
CREATE OR REPLACE VIEW qr_scan_heatmap AS
SELECT
  vendor_id,
  qr_code_id,
  city,
  region,
  country,
  postal_code,
  AVG(latitude) as avg_latitude,
  AVG(longitude) as avg_longitude,
  COUNT(*) as scan_count,
  COUNT(DISTINCT fingerprint_id) as unique_devices,
  COUNT(*) FILTER (WHERE converted = TRUE) as conversions,
  SUM(conversion_value) as total_value,
  MAX(scanned_at) as last_scan
FROM qr_scans
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
GROUP BY vendor_id, qr_code_id, city, region, country, postal_code;

-- =============================================
-- 5. QR Performance Summary View
-- =============================================
CREATE OR REPLACE VIEW qr_performance_summary AS
SELECT
  qc.id as qr_code_id,
  qc.vendor_id,
  qc.code,
  qc.name,
  qc.type,
  qc.campaign_name,
  qc.is_active,
  qc.created_at,
  qc.total_scans,
  qc.unique_scans,
  qc.last_scanned_at,

  -- Scan metrics
  COUNT(qs.id) as total_scan_events,
  COUNT(DISTINCT qs.visitor_id) as unique_visitors,
  COUNT(DISTINCT qs.fingerprint_id) as unique_devices,
  COUNT(DISTINCT qs.session_id) as unique_sessions,

  -- Location metrics
  COUNT(DISTINCT qs.city) as unique_cities,
  COUNT(DISTINCT qs.region) as unique_regions,
  COUNT(DISTINCT qs.country) as unique_countries,
  COUNT(*) FILTER (WHERE qs.geolocation_source = 'browser_gps') as gps_scans,

  -- Device metrics
  COUNT(*) FILTER (WHERE qs.device_type = 'mobile') as mobile_scans,
  COUNT(*) FILTER (WHERE qs.device_type = 'tablet') as tablet_scans,
  COUNT(*) FILTER (WHERE qs.device_type = 'desktop') as desktop_scans,

  -- Conversion metrics
  COUNT(*) FILTER (WHERE qs.converted = TRUE) as conversions,
  SUM(qs.conversion_value) as total_conversion_value,
  ROUND(
    (COUNT(*) FILTER (WHERE qs.converted = TRUE)::DECIMAL / NULLIF(COUNT(qs.id), 0)) * 100,
    2
  ) as conversion_rate,

  -- Timing metrics
  MIN(qs.scanned_at) as first_scan,
  MAX(qs.scanned_at) as most_recent_scan,
  EXTRACT(EPOCH FROM (MAX(qs.scanned_at) - MIN(qs.scanned_at))) / 86400 as active_days

FROM qr_codes qc
LEFT JOIN qr_scans qs ON qs.qr_code_id = qc.id
GROUP BY qc.id, qc.vendor_id, qc.code, qc.name, qc.type, qc.campaign_name,
         qc.is_active, qc.created_at, qc.total_scans, qc.unique_scans, qc.last_scanned_at;

-- =============================================
-- 6. Top Performing QR Codes View
-- =============================================
CREATE OR REPLACE VIEW qr_top_performers AS
SELECT
  qc.vendor_id,
  qc.id,
  qc.code,
  qc.name,
  qc.type,
  qc.campaign_name,
  COUNT(qs.id) as total_scans,
  COUNT(DISTINCT qs.fingerprint_id) as unique_devices,
  COUNT(*) FILTER (WHERE qs.converted = TRUE) as conversions,
  SUM(qs.conversion_value) as revenue,
  ROUND(
    (COUNT(*) FILTER (WHERE qs.converted = TRUE)::DECIMAL / NULLIF(COUNT(qs.id), 0)) * 100,
    2
  ) as conversion_rate,
  MAX(qs.scanned_at) as last_scan
FROM qr_codes qc
LEFT JOIN qr_scans qs ON qs.qr_code_id = qc.id
WHERE qc.is_active = TRUE
GROUP BY qc.vendor_id, qc.id, qc.code, qc.name, qc.type, qc.campaign_name
HAVING COUNT(qs.id) > 0
ORDER BY total_scans DESC;

-- =============================================
-- 7. Functions
-- =============================================

-- Update QR code stats after scan
CREATE OR REPLACE FUNCTION update_qr_code_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE qr_codes
  SET
    total_scans = total_scans + 1,
    unique_scans = (
      SELECT COUNT(DISTINCT fingerprint_id)
      FROM qr_scans
      WHERE qr_code_id = NEW.qr_code_id
    ),
    last_scanned_at = NEW.scanned_at,
    updated_at = NOW()
  WHERE id = NEW.qr_code_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats
DROP TRIGGER IF EXISTS trigger_update_qr_stats ON qr_scans;
CREATE TRIGGER trigger_update_qr_stats
  AFTER INSERT ON qr_scans
  FOR EACH ROW
  EXECUTE FUNCTION update_qr_code_stats();

-- Check if this is first scan for this device
CREATE OR REPLACE FUNCTION check_first_scan()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_first_scan := NOT EXISTS (
    SELECT 1 FROM qr_scans
    WHERE qr_code_id = NEW.qr_code_id
    AND fingerprint_id = NEW.fingerprint_id
    AND id != NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check first scan
DROP TRIGGER IF EXISTS trigger_check_first_scan ON qr_scans;
CREATE TRIGGER trigger_check_first_scan
  BEFORE INSERT ON qr_scans
  FOR EACH ROW
  EXECUTE FUNCTION check_first_scan();

-- =============================================
-- 8. Row Level Security
-- =============================================

ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

-- QR Codes Policies
CREATE POLICY qr_codes_vendor_access ON qr_codes
  FOR ALL
  USING (vendor_id = current_setting('app.vendor_id')::UUID);

-- QR Scans Policies
CREATE POLICY qr_scans_vendor_access ON qr_scans
  FOR ALL
  USING (vendor_id = current_setting('app.vendor_id')::UUID);

-- Public read for active QR codes (needed for landing pages)
CREATE POLICY qr_codes_public_read ON qr_codes
  FOR SELECT
  USING (is_active = TRUE);

-- =============================================
-- 9. Comments
-- =============================================

COMMENT ON TABLE qr_codes IS 'QR code registry with metadata, branding, and landing page configuration';
COMMENT ON TABLE qr_scans IS 'Individual QR code scan events with full analytics data';
COMMENT ON VIEW qr_campaign_stats IS 'Campaign-level QR code performance metrics';
COMMENT ON VIEW qr_scan_heatmap IS 'Geographic distribution of QR scans for heatmap visualization';
COMMENT ON VIEW qr_performance_summary IS 'Comprehensive performance metrics for each QR code';
COMMENT ON VIEW qr_top_performers IS 'Ranked list of top performing QR codes by scan volume';

COMMENT ON COLUMN qr_codes.code IS 'Short unique identifier for the QR code (e.g., ORD123, PROD456)';
COMMENT ON COLUMN qr_codes.type IS 'Category: product, order, location, campaign, custom';
COMMENT ON COLUMN qr_codes.landing_page_url IS 'Custom landing page path on storefront (e.g., /qr/ABC123)';
COMMENT ON COLUMN qr_scans.is_first_scan IS 'First time this device has scanned this specific QR code';
COMMENT ON COLUMN qr_scans.geolocation_source IS 'browser_gps (high precision) or ip_lookup (approximate)';
COMMENT ON COLUMN qr_scans.converted IS 'User completed desired action (purchase, signup, etc.)';
