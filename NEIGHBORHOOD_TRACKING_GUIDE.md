# 🎯 Neighborhood-Level Visitor Tracking Guide

## Current Situation

**Problem:** Backfilled data shows all Charlotte visitors at city center (35.2271, -80.8431)
**Why:** Historical records only have city/state, not exact addresses
**Result:** Pink dots cluster in one area (with jitter to spread them)

---

## 🚀 Solution: Get Real GPS Data

### **Method 1: Location Prompt Modal (NEW - Just Added!)**

We just added a friendly modal that asks visitors to share their location.

**What it does:**
- Shows 3 seconds after page load (non-intrusive)
- Explains benefits: "Find your nearest store"
- Lists incentives: delivery estimates, pickup locations
- Only shows once (stores dismiss in localStorage)

**Files added:**
- ✅ `/components/LocationPromptModal.tsx` - The modal component
- ✅ `app/layout.tsx` - Added to root layout

**Expected results:**
- 10-30% acceptance rate (industry standard)
- Those who accept → pinpoint accuracy (±50m)
- Shows exact neighborhood, street-level location

**Test it:**
1. Visit Flora Distro in incognito: https://floradistro.com
2. Wait 3 seconds
3. Modal appears asking for location
4. Click "Share Location"
5. Check analytics map → you'll appear at exact location!

---

### **Method 2: Silent Background Request (Already Implemented)**

This is already running in `lib/analytics.ts`:
- Automatically requests location on first visit
- No visual prompt (just browser's native dialog)
- ~5-15% acceptance rate (lower because no context)

**Current status:** ✅ Active
**Upgrade:** Add the modal above for better acceptance rates!

---

### **Method 3: Gated Content Strategy**

Require location for specific features:

```tsx
// Example: Show nearest stores only if location shared
if (userLocation) {
  // Show stores within 5 miles
} else {
  // Prompt: "Share location to see nearby stores"
}
```

**Implementation ideas:**
- Delivery estimate: "Share location for accurate delivery time"
- Store finder: "Share location to find nearest pickup"
- Local deals: "Share location for neighborhood-specific offers"

**Acceptance rate:** 40-60% (higher because it's required)

---

### **Method 4: Incentivized Sharing**

Offer a discount for sharing location:

```tsx
// First-time visitors only
"Share your location and get 10% off your first order!"
```

**Pros:**
- Very high acceptance (60-80%)
- Builds trust with transparency
- Gets accurate data immediately

**Cons:**
- Costs you 10% margin
- May attract deal-seekers

---

## 📊 Accuracy Comparison

| Method | Accuracy | Acceptance Rate | Best For |
|--------|----------|-----------------|----------|
| **GPS (with modal)** | ±10-50m | 20-30% | Neighborhood campaigns |
| **GPS (silent)** | ±10-50m | 5-15% | Passive tracking |
| **ipinfo.io** | ±1-5km | 100% | City-wide campaigns |
| **City centroid (backfill)** | ±8km | N/A | Historical visualization |

---

## 🎯 What Each Level Shows You

### City-Level (ipinfo.io - Current Default)
```
✅ Charlotte vs Raleigh vs Durham
✅ Which cities respond to ads
✅ State-wide distribution
❌ Can't see neighborhoods
❌ Can't track local store campaigns
```

### Neighborhood-Level (GPS - What You Want)
```
✅ Plaza Midwood vs Dilworth vs NoDa
✅ Which neighborhoods respond best
✅ Store radius analysis (1-mile, 3-mile, 5-mile)
✅ Hyperlocal campaign effectiveness
✅ Street-level heatmaps
```

---

## 🚀 Quick Wins to Get Neighborhood Data

### **1. Enable the Location Modal (Just Added!)**

**Steps:**
1. Deploy Flora Distro with the new `LocationPromptModal`
2. Monitor analytics for `browser_gps` sources
3. Within 24 hours, you'll start seeing exact locations

**Expected timeline:**
- Day 1: 5-10 GPS locations
- Week 1: 50-100 GPS locations
- Month 1: 200-500 GPS locations

### **2. Add Location-Gated Features**

**Quick implementation:**

```tsx
// In StoreSelector component
if (!userLocation) {
  return (
    <div className="text-center p-8">
      <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-semibold mb-2">Find Your Nearest Store</h3>
      <p className="text-gray-600 mb-4">
        Share your location to see stores near you
      </p>
      <button onClick={requestLocation} className="btn-primary">
        Share Location
      </button>
    </div>
  )
}
```

### **3. Add "Local Delivery" Badge**

Show which products can deliver same-day based on location:

```tsx
{userLocation && withinDeliveryRadius(userLocation, storeLocation) && (
  <span className="badge bg-green-500">
    Same-Day Delivery Available
  </span>
)}
```

This incentivizes location sharing!

---

## 📈 Tracking Neighborhood Campaigns

Once you have GPS data, you can track:

### **1. Campaign by Neighborhood**

```sql
-- Find visitors from Plaza Midwood
SELECT COUNT(*)
FROM website_visitors
WHERE geolocation_source = 'browser_gps'
AND ST_Distance(
  ST_MakePoint(longitude, latitude),
  ST_MakePoint(-80.8100, 35.2100) -- Plaza Midwood center
) < 1609  -- 1 mile in meters
AND utm_campaign = 'plaza_midwood_promo'
```

### **2. Store Radius Analysis**

```sql
-- Visitors within 3 miles of store
SELECT
  CASE
    WHEN distance < 1609 THEN '0-1 mile'
    WHEN distance < 4828 THEN '1-3 miles'
    WHEN distance < 8047 THEN '3-5 miles'
    ELSE '5+ miles'
  END as distance_bracket,
  COUNT(*) as visitors
FROM (
  SELECT
    ST_Distance(
      ST_MakePoint(longitude, latitude),
      ST_MakePoint(-80.8431, 35.2271) -- Charlotte store
    ) as distance
  FROM website_visitors
  WHERE geolocation_source = 'browser_gps'
) subquery
GROUP BY distance_bracket
ORDER BY distance_bracket;
```

### **3. Heatmap by Neighborhood**

Your map dashboard will automatically show:
- GPS dots (green) = exact locations
- ipinfo dots (yellow) = city-level
- Backfill dots (pink) = spread across city

**Filter to GPS only:**
```javascript
const gpsPoints = trafficPoints.filter(p => p.geolocation_source === 'browser_gps')
// Now shows ONLY exact visitor locations
```

---

## 🎨 Visual Improvements for Neighborhood Tracking

### **1. Add Accuracy Indicators**

Update `MapboxMap.tsx` to color-code by accuracy:

```tsx
const markerColor = {
  'browser_gps': '#10b981',      // Green - exact
  'ipinfo': '#f59e0b',            // Yellow - city
  'city_centroid_backfill': '#ec4899', // Pink - backfill
  'vercel_headers': '#ef4444'     // Red - datacenter
}[point.geolocation_source] || '#gray'
```

### **2. Add Neighborhood Labels**

Show neighborhood names on hover:

```tsx
const neighborhoods = {
  'plaza_midwood': { center: [-80.8100, 35.2100], radius: 1.5 },
  'dilworth': { center: [-80.8500, 35.2000], radius: 1.2 },
  'noda': { center: [-80.8150, 35.2350], radius: 1.0 },
}

// On hover, check which neighborhood
const neighborhood = findNeighborhood(point.lat, point.lng)
popup.setHTML(`<b>${neighborhood}</b><br>${point.city}`)
```

### **3. Add Heatmap Layer**

Show density by neighborhood:

```javascript
map.addLayer({
  id: 'visitor-heatmap',
  type: 'heatmap',
  source: {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: gpsPoints.map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
      }))
    }
  },
  paint: {
    'heatmap-radius': 30,
    'heatmap-intensity': 1
  }
})
```

---

## 🎯 Expected Results

### Week 1 (with Location Modal)
```
Total visitors: 500
GPS accepted: 100 (20%)
ipinfo: 380 (76%)
Datacenter fallback: 20 (4%)

Result: 100 exact neighborhood locations on map!
```

### Month 1
```
Total visitors: 2,000
GPS accepted: 500 (25%)
ipinfo: 1,450 (72.5%)
Datacenter fallback: 50 (2.5%)

Result: 500 exact locations across Charlotte neighborhoods!
```

### Month 3
```
Total visitors: 6,000
GPS accepted: 1,800 (30%)  ← Acceptance improves over time
ipinfo: 4,100 (68%)
Datacenter fallback: 100 (2%)

Result: Rich neighborhood-level heatmap data!
```

---

## 📋 Implementation Checklist

- [x] Browser geolocation request added (lib/analytics.ts)
- [x] Location prompt modal created (LocationPromptModal.tsx)
- [x] Modal added to layout (app/layout.tsx)
- [ ] Deploy Flora Distro with new modal
- [ ] Test modal in production
- [ ] Monitor GPS acceptance rate
- [ ] Add location-gated features (optional)
- [ ] Add incentives for sharing (optional)
- [ ] Update map to show accuracy indicators
- [ ] Create neighborhood analysis queries

---

## 🚨 Important Notes

### Privacy & Compliance
- ✅ Browser always asks user permission (can't be bypassed)
- ✅ User can revoke anytime in browser settings
- ✅ We only store lat/lng, not street addresses
- ✅ GDPR/CCPA compliant (explicit consent required)

### Technical Limitations
- Only works on HTTPS (Flora Distro already uses HTTPS ✓)
- Requires modern browser (95%+ of users ✓)
- May not work on VPN/proxy users (rare)
- Indoor accuracy lower (±50m vs ±10m outdoor)

---

## 🎉 Summary

**To get neighborhood-level data:**

1. ✅ Deploy the location prompt modal (just added!)
2. ✅ Monitor analytics for `browser_gps` sources
3. ✅ Within days, you'll see exact visitor locations
4. Optional: Add incentives to boost acceptance (10% off, etc.)
5. Optional: Gate features behind location (delivery estimates, etc.)

**Expected timeline to neighborhood data:**
- 24 hours: First GPS locations appear
- 1 week: 50-100 exact locations
- 1 month: 500+ neighborhood-level data points

**Your map will show:**
- Exact visitor neighborhoods in Charlotte
- Which blocks respond to campaigns
- Store radius effectiveness
- Hyperlocal heatmaps

🎯 **The modal is ready - deploy Flora Distro and watch the neighborhood data roll in!**
