-- Multi-CTA Support for QR Codes
-- Better than Linktree: GPS-tracked, smart ordering, rich media, compliance-ready

-- =============================================
-- 1. QR Code CTAs Table
-- =============================================
CREATE TABLE IF NOT EXISTS qr_code_ctas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,

  -- CTA Content
  label VARCHAR(100) NOT NULL, -- Button text (e.g., "View Lab Results", "Order Now")
  url TEXT NOT NULL, -- Destination URL
  icon VARCHAR(50), -- Icon name (e.g., "flask", "shopping-cart", "map-pin")

  -- Visual Style
  style VARCHAR(50) DEFAULT 'primary', -- primary, secondary, outline, ghost, link
  color VARCHAR(7), -- Custom hex color

  -- CTA Type & Category
  type VARCHAR(50) NOT NULL, -- url, phone, email, sms, app_link, video, pdf
  category VARCHAR(50), -- shop, info, social, compliance, support, navigate

  -- Rich Media
  thumbnail_url TEXT, -- Optional image/video thumbnail
  description TEXT, -- Subtitle/description under the button

  -- Compliance & Cannabis-Specific
  requires_age_verification BOOLEAN DEFAULT FALSE,
  compliance_warning TEXT, -- e.g., "Medical use only", "Check local laws"
  license_display VARCHAR(255), -- License number to show

  -- Smart Features
  display_order INTEGER DEFAULT 0, -- Manual ordering
  auto_reorder BOOLEAN DEFAULT FALSE, -- Auto-sort by performance
  is_featured BOOLEAN DEFAULT FALSE, -- Show at top
  is_visible BOOLEAN DEFAULT TRUE,

  -- Scheduling
  active_from TIMESTAMPTZ, -- Show only after this time
  active_until TIMESTAMPTZ, -- Hide after this time
  active_days_of_week INTEGER[], -- [0-6] Sunday=0, show only on these days
  active_hours_range INT4RANGE, -- e.g., [9,17] for 9am-5pm

  -- Geo-targeting
  show_in_cities TEXT[], -- Only show in these cities
  hide_in_cities TEXT[], -- Don't show in these cities
  show_in_regions TEXT[], -- Only show in these regions/states

  -- Analytics (denormalized)
  total_clicks INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qr_ctas_qr_code ON qr_code_ctas(qr_code_id);
CREATE INDEX idx_qr_ctas_order ON qr_code_ctas(qr_code_id, display_order, is_visible);
CREATE INDEX idx_qr_ctas_featured ON qr_code_ctas(qr_code_id, is_featured) WHERE is_featured = TRUE;

-- =============================================
-- 2. CTA Click Tracking
-- =============================================
CREATE TABLE IF NOT EXISTS qr_cta_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cta_id UUID NOT NULL REFERENCES qr_code_ctas(id) ON DELETE CASCADE,
  qr_code_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES qr_scans(id) ON DELETE SET NULL, -- Link to the scan that led to this click
  vendor_id UUID NOT NULL,

  -- Visitor Info
  visitor_id UUID REFERENCES website_visitors(id) ON DELETE SET NULL,
  fingerprint_id VARCHAR(255),
  session_id VARCHAR(255),

  -- Click Metadata
  clicked_at TIMESTAMPTZ DEFAULT NOW(),

  -- Location at click time (may be different from scan location)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  city VARCHAR(255),
  region VARCHAR(255),
  country VARCHAR(2),

  -- Context
  time_since_scan_seconds INTEGER, -- How long after QR scan did they click this?
  cta_position INTEGER, -- Where was this CTA in the list when clicked?
  total_ctas_shown INTEGER, -- How many CTAs were visible?

  -- Device context
  device_type VARCHAR(50),
  browser_name VARCHAR(100),

  -- Metadata
  user_agent TEXT,
  ip_address INET,
  referrer TEXT
);

CREATE INDEX idx_cta_clicks_cta ON qr_cta_clicks(cta_id);
CREATE INDEX idx_cta_clicks_qr_code ON qr_cta_clicks(qr_code_id);
CREATE INDEX idx_cta_clicks_scan ON qr_cta_clicks(scan_id) WHERE scan_id IS NOT NULL;
CREATE INDEX idx_cta_clicks_vendor ON qr_cta_clicks(vendor_id);
CREATE INDEX idx_cta_clicks_time ON qr_cta_clicks(clicked_at DESC);
CREATE INDEX idx_cta_clicks_location ON qr_cta_clicks(city, region) WHERE city IS NOT NULL;

-- =============================================
-- 3. Update QR Codes Table for Multi-CTA
-- =============================================
-- Remove single CTA columns (keep for backward compatibility, but deprecated)
COMMENT ON COLUMN qr_codes.landing_page_cta_text IS 'DEPRECATED: Use qr_code_ctas table instead';
COMMENT ON COLUMN qr_codes.landing_page_cta_url IS 'DEPRECATED: Use qr_code_ctas table instead';

-- Add new columns for enhanced landing pages
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS landing_page_background_color VARCHAR(7);
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS landing_page_text_color VARCHAR(7);
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS landing_page_layout VARCHAR(50) DEFAULT 'centered'; -- centered, grid, list, minimal
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS landing_page_theme VARCHAR(50) DEFAULT 'dark'; -- dark, light, brand

-- Age verification
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS requires_age_verification BOOLEAN DEFAULT FALSE;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS age_verification_type VARCHAR(50) DEFAULT 'simple'; -- simple, id_verify, ssn_last4

-- Rich media
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS landing_page_video_url TEXT;
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS landing_page_gallery_urls TEXT[]; -- Array of image URLs

-- =============================================
-- 4. Analytics Views for CTAs
-- =============================================

-- CTA Performance by Location
CREATE OR REPLACE VIEW qr_cta_performance_by_location AS
SELECT
  cta_id,
  qc.qr_code_id,
  qc.label as cta_label,
  cc.city,
  cc.region,
  cc.country,
  COUNT(*) as click_count,
  COUNT(DISTINCT cc.fingerprint_id) as unique_clickers,
  AVG(cc.time_since_scan_seconds) as avg_time_to_click_seconds,
  AVG(cc.cta_position) as avg_position_when_clicked,
  MIN(cc.clicked_at) as first_click,
  MAX(cc.clicked_at) as last_click
FROM qr_cta_clicks cc
JOIN qr_code_ctas qc ON qc.id = cc.cta_id
WHERE cc.city IS NOT NULL
GROUP BY cta_id, qc.qr_code_id, qc.label, cc.city, cc.region, cc.country;

-- CTA Conversion Funnel
CREATE OR REPLACE VIEW qr_cta_funnel AS
SELECT
  qr.id as qr_code_id,
  qr.name as qr_name,
  qr.total_scans,
  COUNT(DISTINCT qs.fingerprint_id) as unique_scanners,
  COUNT(DISTINCT cc.fingerprint_id) as unique_clickers,
  COUNT(cc.id) as total_cta_clicks,
  ROUND(
    (COUNT(DISTINCT cc.fingerprint_id)::DECIMAL / NULLIF(COUNT(DISTINCT qs.fingerprint_id), 0)) * 100,
    2
  ) as click_through_rate_pct,
  ROUND(
    (COUNT(cc.id)::DECIMAL / NULLIF(qr.total_scans, 0)),
    2
  ) as avg_ctas_per_scan
FROM qr_codes qr
LEFT JOIN qr_scans qs ON qs.qr_code_id = qr.id
LEFT JOIN qr_cta_clicks cc ON cc.qr_code_id = qr.id
GROUP BY qr.id, qr.name, qr.total_scans;

-- Top Performing CTAs
CREATE OR REPLACE VIEW qr_top_ctas AS
SELECT
  cta.id,
  cta.qr_code_id,
  qr.name as qr_name,
  cta.label,
  cta.category,
  cta.total_clicks,
  cta.unique_clicks,
  ROUND(
    (cta.unique_clicks::DECIMAL / NULLIF(cta.total_clicks, 0)) * 100,
    2
  ) as unique_click_rate_pct,
  COUNT(DISTINCT cc.city) as cities_reached,
  cta.last_clicked_at
FROM qr_code_ctas cta
JOIN qr_codes qr ON qr.id = cta.qr_code_id
LEFT JOIN qr_cta_clicks cc ON cc.cta_id = cta.id
WHERE cta.is_visible = TRUE
GROUP BY cta.id, qr.id, qr.name, cta.label, cta.category, cta.total_clicks, cta.unique_clicks, cta.last_clicked_at
ORDER BY cta.total_clicks DESC;

-- =============================================
-- 5. Triggers for Auto-Updates
-- =============================================

-- Update CTA stats on click
CREATE OR REPLACE FUNCTION update_cta_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE qr_code_ctas
  SET
    total_clicks = total_clicks + 1,
    unique_clicks = (
      SELECT COUNT(DISTINCT fingerprint_id)
      FROM qr_cta_clicks
      WHERE cta_id = NEW.cta_id
    ),
    last_clicked_at = NEW.clicked_at,
    updated_at = NOW()
  WHERE id = NEW.cta_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cta_stats
AFTER INSERT ON qr_cta_clicks
FOR EACH ROW
EXECUTE FUNCTION update_cta_stats();

-- =============================================
-- 6. Helper Functions
-- =============================================

-- Get active CTAs for a QR code (respects scheduling, geo-targeting, visibility)
CREATE OR REPLACE FUNCTION get_active_ctas_for_qr(
  p_qr_code_id UUID,
  p_city VARCHAR DEFAULT NULL,
  p_region VARCHAR DEFAULT NULL,
  p_check_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  id UUID,
  label VARCHAR,
  url TEXT,
  icon VARCHAR,
  style VARCHAR,
  color VARCHAR,
  type VARCHAR,
  category VARCHAR,
  thumbnail_url TEXT,
  description TEXT,
  display_order INTEGER,
  is_featured BOOLEAN,
  total_clicks INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cta.id,
    cta.label,
    cta.url,
    cta.icon,
    cta.style,
    cta.color,
    cta.type,
    cta.category,
    cta.thumbnail_url,
    cta.description,
    cta.display_order,
    cta.is_featured,
    cta.total_clicks
  FROM qr_code_ctas cta
  WHERE cta.qr_code_id = p_qr_code_id
    AND cta.is_visible = TRUE

    -- Time-based filters
    AND (cta.active_from IS NULL OR cta.active_from <= p_check_time)
    AND (cta.active_until IS NULL OR cta.active_until >= p_check_time)

    -- Day of week filter
    AND (
      cta.active_days_of_week IS NULL
      OR EXTRACT(DOW FROM p_check_time)::INTEGER = ANY(cta.active_days_of_week)
    )

    -- Hour range filter
    AND (
      cta.active_hours_range IS NULL
      OR EXTRACT(HOUR FROM p_check_time)::INTEGER <@ cta.active_hours_range
    )

    -- Geo-targeting filters
    AND (
      cta.show_in_cities IS NULL
      OR p_city = ANY(cta.show_in_cities)
    )
    AND (
      cta.hide_in_cities IS NULL
      OR p_city != ALL(cta.hide_in_cities)
    )
    AND (
      cta.show_in_regions IS NULL
      OR p_region = ANY(cta.show_in_regions)
    )

  ORDER BY
    cta.is_featured DESC,
    CASE WHEN cta.auto_reorder THEN cta.total_clicks ELSE 0 END DESC,
    cta.display_order ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_ctas_for_qr IS 'Returns active CTAs for a QR code, filtered by time, location, and visibility rules';
