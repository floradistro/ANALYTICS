-- Add geolocation tracking fields to website_visitors table
-- This allows us to track the source and accuracy of geolocation data

ALTER TABLE website_visitors
ADD COLUMN IF NOT EXISTS geolocation_source TEXT,
ADD COLUMN IF NOT EXISTS geolocation_accuracy NUMERIC;

-- Add comment to explain the geolocation_source values
COMMENT ON COLUMN website_visitors.geolocation_source IS 'Source of geolocation: browser_gps (most accurate), ipinfo (city-accurate), vercel_headers (datacenter/fallback)';
COMMENT ON COLUMN website_visitors.geolocation_accuracy IS 'Accuracy in meters (only available for browser_gps)';

-- Create index for filtering by geolocation source
CREATE INDEX IF NOT EXISTS idx_website_visitors_geo_source ON website_visitors(geolocation_source);

-- Update existing rows to mark as vercel_headers (datacenter IPs)
UPDATE website_visitors
SET geolocation_source = 'vercel_headers'
WHERE geolocation_source IS NULL AND latitude IS NOT NULL;
