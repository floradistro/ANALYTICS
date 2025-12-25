-- Enable RLS on email_campaigns
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their vendor's campaigns
CREATE POLICY "Users can view own vendor campaigns" ON email_campaigns
  FOR SELECT USING (vendor_id IN (
    SELECT vendor_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Policy: Users can insert campaigns for their vendor
CREATE POLICY "Users can insert own vendor campaigns" ON email_campaigns
  FOR INSERT WITH CHECK (vendor_id IN (
    SELECT vendor_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Policy: Users can update their vendor's campaigns
CREATE POLICY "Users can update own vendor campaigns" ON email_campaigns
  FOR UPDATE USING (vendor_id IN (
    SELECT vendor_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Policy: Users can delete their vendor's campaigns
CREATE POLICY "Users can delete own vendor campaigns" ON email_campaigns
  FOR DELETE USING (vendor_id IN (
    SELECT vendor_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Enable RLS on email_sends
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their vendor's email sends
CREATE POLICY "Users can view own vendor email sends" ON email_sends
  FOR SELECT USING (vendor_id IN (
    SELECT vendor_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Policy: Users can insert email sends for their vendor
CREATE POLICY "Users can insert own vendor email sends" ON email_sends
  FOR INSERT WITH CHECK (vendor_id IN (
    SELECT vendor_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Enable RLS on customer_segments
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their vendor's segments
CREATE POLICY "Users can view own vendor segments" ON customer_segments
  FOR SELECT USING (vendor_id IN (
    SELECT vendor_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Policy: Users can insert segments for their vendor
CREATE POLICY "Users can insert own vendor segments" ON customer_segments
  FOR INSERT WITH CHECK (vendor_id IN (
    SELECT vendor_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Policy: Users can update their vendor's segments
CREATE POLICY "Users can update own vendor segments" ON customer_segments
  FOR UPDATE USING (vendor_id IN (
    SELECT vendor_id FROM users WHERE auth_user_id = auth.uid()
  ));

-- Enable RLS on customer_segment_memberships
ALTER TABLE customer_segment_memberships ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view memberships for their segments
CREATE POLICY "Users can view segment memberships" ON customer_segment_memberships
  FOR SELECT USING (segment_id IN (
    SELECT id FROM customer_segments WHERE vendor_id IN (
      SELECT vendor_id FROM users WHERE auth_user_id = auth.uid()
    )
  ));
