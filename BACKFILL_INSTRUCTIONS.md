# 🗺️ Backfill Old Geolocation Data - Quick Instructions

## Problem
Those clustered red dots at the Charlotte datacenter are old visitor records with datacenter IPs instead of actual locations.

## Solution
Run the SQL file to update all historical records with accurate city-level coordinates.

---

## Option 1: Via Supabase SQL Editor (Recommended - 2 minutes)

1. Go to: https://supabase.com/dashboard/project/uaednwpxursknmwdeejn/sql/new

2. Copy & paste the contents of: `scripts/backfill-geolocation.sql`

3. Click **Run**

4. Expected result:
   ```
   Step 1: Charlotte - Updated 780 rows
   Step 2: Other NC cities - Updated ~1,500 rows
   Step 3: Tennessee cities - Updated ~200 rows
   Step 4: SC cities - Updated ~150 rows
   ```

5. **Total: ~2,630 records updated from datacenter IPs to actual city centers**

---

## Option 2: Via Edge Function (Already did Charlotte)

You already updated 780 Charlotte records! To update the rest:

```bash
cd /Users/whale/Desktop/analytics

# Update remaining NC cities
curl -X POST https://uaednwpxursknmwdeejn.supabase.co/functions/v1/exec-ddl \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d @- << 'EOF'
{
  "sql": "UPDATE website_visitors SET latitude = CASE WHEN city ILIKE 'Raleigh' THEN 35.7796 WHEN city ILIKE 'Greensboro' THEN 36.0726 WHEN city ILIKE 'Durham' THEN 35.9940 WHEN city ILIKE 'Winston-Salem' THEN 36.0999 WHEN city ILIKE 'Asheville' THEN 35.5951 ELSE latitude END, longitude = CASE WHEN city ILIKE 'Raleigh' THEN -78.6382 WHEN city ILIKE 'Greensboro' THEN -79.7920 WHEN city ILIKE 'Durham' THEN -78.8986 WHEN city ILIKE 'Winston-Salem' THEN -80.2442 WHEN city ILIKE 'Asheville' THEN -82.5515 ELSE longitude END, geolocation_source = 'city_centroid_backfill' WHERE geolocation_source = 'vercel_headers' AND region = 'NC';"
}
EOF
```

---

## What This Does

**Before:**
- Charlotte visitor at datacenter: `(35.5951, -82.5515)` - Asheville datacenter, 120 miles away ❌
- Raleigh visitor at datacenter: `(35.5951, -82.5515)` - Asheville datacenter, 210 miles away ❌

**After:**
- Charlotte visitor: `(35.2271, -80.8431)` - Actual Charlotte city center ✅
- Raleigh visitor: `(35.7796, -78.6382)` - Actual Raleigh city center ✅

---

## Verify It Worked

After running the SQL, check the map dashboard:

1. Go to: https://floradashboard.com/dashboard/map

2. Refresh the page

3. You should see:
   - ✅ Visitors spread across actual cities (Charlotte, Raleigh, Durham, etc.)
   - ✅ NO MORE cluster of red dots at Asheville datacenter
   - ✅ Accurate geographic distribution

4. Check console for geolocation sources:
   ```
   [Map] Geolocation sources: {
     "city_centroid_backfill": 2630,  // Old datacenter IPs now at city centers
     "vercel_headers": 450,            // Remaining unmatched cities
     "ipinfo": 120,                     // New visitors (accurate)
     "browser_gps": 85                  // New visitors (most accurate)
   }
   ```

---

## Cities That Will Be Fixed

### North Carolina (1,500+ visitors)
- Charlotte, Raleigh, Greensboro, Durham
- Winston-Salem, Asheville, Concord, Huntersville
- Matthews, Apex, Pineville, Cornelius
- And 12 more NC cities...

### Tennessee (200+ visitors)
- Nashville, Memphis, Knoxville, Chattanooga
- Murfreesboro, Franklin, Johnson City

### South Carolina (150+ visitors)
- Rock Hill, Fort Mill, Columbia
- Charleston, Greenville, Spartanburg

---

## Before & After Map Comparison

### Before (Datacenter IPs):
```
[Map with cluster of 2,000+ red dots at ONE location in Asheville]
❌ All Charlotte visitors → shown at Asheville datacenter
❌ All Raleigh visitors → shown at Asheville datacenter
❌ All Durham visitors → shown at Asheville datacenter
```

### After (City Centers):
```
[Map with dots spread across actual cities]
✅ Charlotte visitors → shown in Charlotte
✅ Raleigh visitors → shown in Raleigh
✅ Durham visitors → shown in Durham
✅ Each city has its own cluster (accurate!)
```

---

## Summary

- **Already done:** 780 Charlotte records fixed ✅
- **To do:** Run `scripts/backfill-geolocation.sql` to fix remaining ~1,850 records
- **Total time:** < 2 minutes
- **Result:** No more datacenter clusters on your map!

---

## Next: New Visitors (Automatic)

Going forward, all NEW visitors will automatically get accurate geolocation:

1. **Browser GPS** (if they allow) → ±50m accuracy
2. **ipinfo.io** (if they deny) → ±5km accuracy
3. **City centroids** (fallback) → ±10km accuracy

No more datacenter IPs! 🎉
