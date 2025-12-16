-- Add postal code column for neighborhood-level analysis
ALTER TABLE website_visitors
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

-- Add index for ZIP-based queries
CREATE INDEX IF NOT EXISTS idx_website_visitors_postal ON website_visitors(postal_code);

-- Add index for combined city+postal queries
CREATE INDEX IF NOT EXISTS idx_website_visitors_city_postal ON website_visitors(city, postal_code);

COMMENT ON COLUMN website_visitors.postal_code IS 'ZIP/postal code from IP geolocation (for neighborhood analysis)';
