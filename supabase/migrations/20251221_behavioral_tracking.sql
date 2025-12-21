-- Behavioral data table for storing heatmaps, scroll data, form analytics, rage clicks, and session recordings
CREATE TABLE IF NOT EXISTS behavioral_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  visitor_id TEXT,
  session_id TEXT,
  page_url TEXT,
  page_path TEXT,
  data_type TEXT NOT NULL, -- 'heatmap', 'scroll', 'form', 'rage', 'recording'
  data JSONB NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_behavioral_vendor_id ON behavioral_data(vendor_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_session_id ON behavioral_data(session_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_type ON behavioral_data(data_type);
CREATE INDEX IF NOT EXISTS idx_behavioral_collected_at ON behavioral_data(collected_at);
CREATE INDEX IF NOT EXISTS idx_behavioral_page_path ON behavioral_data(page_path);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_behavioral_vendor_type_time ON behavioral_data(vendor_id, data_type, collected_at DESC);

-- Add rage click tracking columns to website_visitors if they don't exist
ALTER TABLE website_visitors ADD COLUMN IF NOT EXISTS rage_click_count INTEGER DEFAULT 0;
ALTER TABLE website_visitors ADD COLUMN IF NOT EXISTS has_ux_issues BOOLEAN DEFAULT FALSE;

COMMENT ON TABLE behavioral_data IS 'Stores behavioral analytics data including heatmaps, scroll patterns, form analytics, rage clicks, and session recordings';
COMMENT ON COLUMN behavioral_data.data_type IS 'Type of behavioral data: heatmap, scroll, form, rage, or recording';
COMMENT ON COLUMN behavioral_data.data IS 'JSONB payload containing the behavioral data specific to the type';
