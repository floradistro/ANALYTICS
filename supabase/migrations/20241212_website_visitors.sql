-- Website Visitors table for tracking site traffic with geolocation
CREATE TABLE IF NOT EXISTS website_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- Session info
  session_id TEXT NOT NULL,
  visitor_id TEXT, -- anonymous persistent ID from cookie

  -- Geolocation from Vercel headers
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  city TEXT,
  region TEXT,
  country TEXT,

  -- Page/referrer info
  page_url TEXT,
  referrer TEXT,

  -- Device info
  user_agent TEXT,
  device_type TEXT, -- mobile, tablet, desktop

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for efficient querying
  CONSTRAINT unique_session UNIQUE (vendor_id, session_id)
);

-- Index for fast lookups by vendor and time
CREATE INDEX idx_website_visitors_vendor_time ON website_visitors(vendor_id, created_at DESC);

-- Index for geolocation queries
CREATE INDEX idx_website_visitors_geo ON website_visitors(vendor_id, latitude, longitude) WHERE latitude IS NOT NULL;

-- Enable RLS
ALTER TABLE website_visitors ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their vendor's visitors
CREATE POLICY "Users can view own vendor visitors" ON website_visitors
  FOR SELECT USING (vendor_id IN (
    SELECT vendor_id FROM users WHERE id = auth.uid()
  ));

-- Policy: Allow insert from API (service role or anon with vendor_id)
CREATE POLICY "Allow visitor tracking inserts" ON website_visitors
  FOR INSERT WITH CHECK (true);
