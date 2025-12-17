# Analytics Improvement Plan - Prioritized

Based on comprehensive audit of Flora Distro analytics data.

---

## 🔴 Priority 1: Increase ZIP Code Coverage (20.8% → 80%+)

**Current State:**
- Only 20.8% of visitors have postal codes (2,012 / 9,650)
- 50.7% using `vercel_headers` (no ZIP codes)
- 20.9% using `ipinfo` (has ZIP codes) ✅
- 27.4% using `city_centroid_backfill` (no ZIP codes)

**Root Cause:**
ipinfo API calls are failing for ~50% of requests, falling back to vercel_headers

**Likely Issues:**
1. **Local/Private IPs** - Lines 145: Filters out `127.0.0.1` and `192.168.*` but production should have real IPs
2. **Missing IP Headers** - `x-forwarded-for` or `x-real-ip` may be empty
3. **ipinfo Rate Limits** - 50k requests/month on free tier, may be hitting limits
4. **Token Issues** - IPINFO_TOKEN may not be set in production

**Investigation:**
```bash
# Check production logs for ipinfo errors
vercel logs floradashboard --since 1h | grep "ipinfo"

# Or add debug logging to see why ipinfo isn't being called
```

**Expected Debug Output:**
```
[Track API] Fetching ipinfo for IP: 12.34.56.78
[Track API] ipinfo.io response: {...}
[Track API] ZIP code: 28205
```

**If you're NOT seeing these logs:**
- IP address extraction failing
- IPINFO_TOKEN not set in production env
- Edge function not reaching ipinfo code

**Solution:**
```typescript
// route.ts:145 - Add better logging
if (ipinfoToken && ip && ip !== '127.0.0.1' && !ip.startsWith('192.168.')) {
  console.log('[Track API] IP:', ip, 'Token:', ipinfoToken ? 'SET' : 'MISSING')
  // ... rest of code
} else {
  console.log('[Track API] Skipping ipinfo - Token:', ipinfoToken ? 'SET' : 'MISSING', 'IP:', ip)
}
```

**Expected Impact:**
- ZIP code coverage: 20.8% → 80%+
- Better neighborhood targeting
- More accurate delivery estimates

---

## 🟡 Priority 2: GPS Capture Rate (0.9% → 5-10%)

**Current State:**
- Only 90 out of 9,650 visitors granted GPS (0.9%)
- Age gate is capturing GPS successfully ✅
- Location modal exists but may not be showing

**Why GPS Matters:**
- ±50m accuracy vs ±2km for ipinfo
- Can show "You're 2.3 miles from nearest store"
- Perfect for delivery radius calculations

**Improvement Opportunities:**

### A. **Increase Modal Visibility**
Currently shows on `/shop` after 5 seconds, but may be dismissed quickly

**Better Triggers:**
```typescript
// Show modal on high-intent pages:
if (
  pathname === '/shop' ||
  pathname.startsWith('/product/') ||
  pathname === '/cart' ||
  pathname === '/checkout'
) {
  // Show after 3 seconds instead of 5
  setTimeout(showModal, 3000)
}
```

### B. **Add Value Proposition**
Current modal text: "Filter products by your location"

**Better Copy:**
```
"Get accurate delivery times"
"See stores near you"
"Unlock local deals"
```

### C. **Incentivize Permission**
```
"📍 Share your location to unlock:"
- Free delivery for orders within 5 miles
- See real-time inventory at nearby stores
- Get notified when products arrive near you
```

### D. **A/B Test Modal Timing**
- Test showing modal BEFORE age gate (if  user already 21+)
- Test showing on checkout page ("Confirm delivery address")
- Test showing after adding to cart

**Expected Impact:**
- GPS capture rate: 0.9% → 5-10% (5-10x improvement)
- 500-1000 GPS locations per 10k visitors
- Highly accurate delivery radius targeting

---

## 🟢 Priority 3: Conversion Funnel Analytics

**Current State:**
- ✅ Events tracked: 1,305 total, 13 types
- ✅ Product views: 910 events
- ❓ Conversion rates: Unknown (need to calculate)

**Build Funnel Dashboard:**

### Step 1: Calculate Current Funnel
```sql
WITH funnel AS (
  SELECT
    COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'view_product') as viewed_product,
    COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'add_to_cart') as added_to_cart,
    COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'begin_checkout') as began_checkout,
    COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'checkout_success') as completed_checkout,
    COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'purchase') as purchased
  FROM analytics_events
  WHERE timestamp > NOW() - INTERVAL '30 days'
)
SELECT
  viewed_product as "1. Viewed Product",
  added_to_cart as "2. Added to Cart",
  (added_to_cart::float / viewed_product * 100)::int || '%' as "Add to Cart Rate",
  began_checkout as "3. Began Checkout",
  (began_checkout::float / added_to_cart * 100)::int || '%' as "Checkout Rate",
  purchased as "4. Purchased",
  (purchased::float / began_checkout * 100)::int || '%' as "Purchase Rate",
  (purchased::float / viewed_product * 100)::decimal(5,2) || '%' as "Overall Conversion"
FROM funnel;
```

### Step 2: Identify Drop-off Points
```sql
-- Where are users abandoning checkout?
SELECT
  event_name,
  COUNT(*) as occurrences,
  COUNT(DISTINCT visitor_id) as unique_visitors
FROM analytics_events
WHERE event_name LIKE 'checkout_%'
GROUP BY event_name
ORDER BY occurrences DESC;
```

**Typical E-Commerce Benchmarks:**
- View → Add to Cart: 2-5%
- Add to Cart → Checkout: 40-60%
- Checkout → Purchase: 60-80%
- Overall Conversion: 1-3%

### Step 3: Build Dashboard Component
Create `/dashboard/conversion-funnel` page showing:
- Visual funnel chart
- Drop-off percentages
- Average order value
- Revenue attribution by channel

**Expected Impact:**
- Identify checkout friction points
- Optimize for higher conversion
- Increase revenue 10-30% by fixing drop-offs

---

## 🔵 Priority 4: Session Tracking Validation

**Current Status:**
- ✅ Middleware fix deployed 20 minutes ago
- ⏳ Waiting for new sessions to flow in
- ❓ Need to verify fix is working

**Action Items:**

### 1. Wait 1 Hour, Then Verify
```bash
node /Users/whale/Desktop/analytics/check-bounce-rate.js
```

**Expected Result:**
```
Session bounce rate: 65-75% (down from 100%)
Multi-page sessions: 25-35%
Avg pages/session: 1.5-2.5
```

### 2. If Still 100% Bounce Rate
**Debug Steps:**
```bash
# Check Vercel deployment status
vercel ls flora-distro-storefront --limit 5

# Check if middleware changes deployed
git log --oneline -5

# Test session cookie in browser
# DevTools → Application → Cookies → sid
# Should persist across page navigations
```

### 3. Add Session Debug Logging
```typescript
// middleware.ts:72
let sessionId = request.cookies.get('sid')?.value
console.log('[Middleware] Session cookie:', sessionId ? 'EXISTS' : 'NEW')
const isNewSession = !sessionId
if (!sessionId) {
  sessionId = `s_${Date.now()}_${Math.random()...}`
  console.log('[Middleware] Created new session:', sessionId)
  response.cookies.set('sid', sessionId, {...})
} else {
  console.log('[Middleware] Reusing session:', sessionId)
}
```

**Expected Impact:**
- Accurate multi-page session tracking
- Proper bounce rate (60-80%)
- User journey analysis

---

## 🟣 Priority 5: Real-Time Analytics Dashboard

**Current State:**
- Data exists in database
- No real-time visualization
- Manual SQL queries required

**Build Real-Time Dashboard:**

### Components Needed:

#### 1. **Live Visitors Counter**
```typescript
// Update every 5 seconds
const liveVisitors = await supabase
  .from('website_visitors')
  .select('visitor_id')
  .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
  .distinct('visitor_id')

// Show: "🟢 23 visitors in last 5 minutes"
```

#### 2. **Today's Metrics Card**
```
📊 Today's Performance
───────────────────────
Visitors:        1,234
Page Views:      3,456
Avg Session:     2.3 pages
Conversion:      2.1%
Revenue:         $1,234.56
```

#### 3. **Live Activity Feed**
```
🛒 Anonymous visitor added "Blue Dream 1/8oz" to cart
📍 Visitor from Charlotte, NC (28205) viewed shop
🎯 Visitor from Durham completed checkout ($45.00)
```

#### 4. **Geographic Heatmap**
- Show ZIP codes on Charlotte metro map
- Color intensity = visitor count
- Click ZIP to see visitors from that area

#### 5. **Conversion Funnel (Live)**
Real-time visualization of checkout funnel

**Expected Impact:**
- Identify issues in real-time
- Monitor campaign performance live
- Faster decision making

---

## 🟠 Priority 6: Customer Journey Mapping

**Current State:**
- Events track individual actions
- No connection between events
- Can't see full user journey

**Build Journey Tracker:**

### Example Journey:
```
Visitor v_123456789:
  1. 2:30 PM - Landed on homepage (Google Organic)
  2. 2:31 PM - Viewed "Blue Dream" product
  3. 2:32 PM - Added to cart ($35.00)
  4. 2:33 PM - Began checkout
  5. 2:34 PM - Validation error (missing phone)
  6. 2:35 PM - Fixed error, submitted order
  7. 2:36 PM - Purchase complete ($35.00)

  Session: 6 minutes
  Pages: 7
  Revenue: $35.00
  Source: Google Organic
  Location: Charlotte, NC 28205
```

### SQL Query:
```sql
SELECT
  e.visitor_id,
  e.timestamp,
  e.event_name,
  e.event_properties,
  e.revenue,
  v.city,
  v.postal_code,
  v.channel
FROM analytics_events e
LEFT JOIN website_visitors v ON e.visitor_id = v.visitor_id
WHERE e.visitor_id = 'v_123456789'
ORDER BY e.timestamp ASC;
```

### Dashboard View:
- Timeline visualization
- Event grouping by session
- Attribution to first/last touch
- Revenue per journey step

**Expected Impact:**
- Understand user behavior patterns
- Identify common paths to purchase
- Optimize checkout flow

---

## 🟤 Priority 7: Alert System

**Scenarios to Monitor:**

### 1. **Checkout Errors Spike**
```javascript
if (checkoutErrors > 10 in last hour) {
  sendAlert('Checkout errors spiking', {
    count: checkoutErrors,
    commonError: topError
  })
}
```

### 2. **Conversion Rate Drop**
```javascript
if (todayConversionRate < yesterdayConversionRate * 0.5) {
  sendAlert('Conversion rate dropped 50%')
}
```

### 3. **GPS Capture Rate Drop**
```javascript
if (gpsCaptureRate < 0.5% for 24 hours) {
  sendAlert('GPS capture rate low - modal may be broken')
}
```

### 4. **High Bounce Rate**
```javascript
if (bounceRate > 90%) {
  sendAlert('Bounce rate critical - check session tracking')
}
```

**Alert Channels:**
- Email (critical only)
- Slack webhook
- Dashboard notification

**Expected Impact:**
- Catch issues within minutes
- Prevent revenue loss
- Maintain data quality

---

## 📊 Summary: Expected Impact

| Improvement | Current | Target | Impact |
|-------------|---------|--------|--------|
| ZIP Code Coverage | 20.8% | 80%+ | 4x increase |
| GPS Capture Rate | 0.9% | 5-10% | 10x increase |
| Session Tracking | 0% multi-page | 25-35% | ∞ improvement |
| Conversion Visibility | Manual queries | Real-time dashboard | Faster decisions |
| Issue Detection | Reactive | Proactive alerts | Prevent losses |

---

## 🚀 Implementation Priority

### **This Week:**
1. ✅ Fix session tracking (IN PROGRESS - deployed)
2. 🔍 Investigate why ipinfo failing for 50% of requests
3. 📊 Build basic conversion funnel query
4. 🎯 Add GPS modal to product pages

### **Next Week:**
1. 📈 Build real-time dashboard
2. 🗺️ Add ZIP code heatmap
3. 🔔 Set up critical alerts
4. 🎨 A/B test GPS modal copy

### **This Month:**
1. 👤 Customer journey mapping
2. 📊 Advanced analytics features
3. 🤖 ML-based conversion prediction
4. 📧 Automated weekly reports

---

## 💡 Quick Wins (Can Do Today)

### 1. **Add Debug Logging to ipinfo**
```typescript
// route.ts:147
console.log('[Track API] IP detection:', {
  forwardedFor: request.headers.get('x-forwarded-for'),
  realIp: request.headers.get('x-real-ip'),
  extractedIp: ip,
  hasToken: !!ipinfoToken
})
```

### 2. **Create Conversion Funnel Query**
Save as `/Users/whale/Desktop/analytics/conversion-funnel.sql` for quick reference

### 3. **Test GPS Modal on More Pages**
```typescript
// LocationPermissionModal.tsx:26
if (
  window.location.pathname === '/shop' ||
  window.location.pathname.startsWith('/product/') ||
  window.location.pathname === '/cart'
) {
  // Show modal
}
```

### 4. **Verify Session Fix**
```bash
# In 30 minutes, run:
node check-bounce-rate.js
```

---

**Bottom Line:** You have a solid analytics foundation. The biggest ROI improvements are:
1. Fix ipinfo coverage (20% → 80% ZIP codes)
2. Increase GPS capture (0.9% → 5-10%)
3. Verify session tracking is working

These three fixes will give you neighborhood-level targeting for 80%+ of visitors and accurate user journey tracking.
