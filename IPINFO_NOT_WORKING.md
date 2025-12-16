# 🚨 ipinfo.io Not Being Called - Fix Required

## Problem

Recent visitors showing:
- `geolocation_source: vercel_headers` ❌ (datacenter IPs)
- `postal_code: null` ❌ (no ZIP codes)
- Should be: `ipinfo` with ZIP codes ✓

## Root Cause

The `IPINFO_TOKEN` environment variable is **NOT set in Vercel production**.

Looking at the code in `/api/track/route.ts` line 139:
```typescript
const ipinfoToken = process.env.IPINFO_TOKEN
```

If this is `undefined`, the ipinfo API call is skipped entirely, falling back to Vercel headers (datacenter IPs).

## Solution

### Set Environment Variable in Vercel

1. Go to: https://vercel.com/floradistro/analytics/settings/environment-variables

2. Add environment variable:
   - **Key:** `IPINFO_TOKEN`
   - **Value:** `fc6c8a326cbdb8`
   - **Environment:** Production, Preview, Development (check all)

3. Click "Save"

4. **Redeploy:**
   ```bash
   # Either:
   # A) Push a new commit (triggers auto-deploy)
   # B) Or manually redeploy in Vercel Dashboard
   ```

## How to Verify It's Working

### After redeployment, check logs:

```sql
-- Should see 'ipinfo' source with ZIP codes
SELECT
  geolocation_source,
  postal_code,
  city,
  region,
  COUNT(*) as count
FROM website_visitors
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY geolocation_source, postal_code, city, region
ORDER BY created_at DESC;

-- Expected:
-- ipinfo | 28205 | Charlotte | NC | 15
-- ipinfo | 28277 | Charlotte | NC | 12
-- ipinfo | 27215 | Durham    | NC | 8
```

### Check API logs in Vercel:

Look for:
```
[Track API] Fetching ipinfo for IP: 174.127.45.12
[Track API] ZIP code: 28205
[Track API] ipinfo accuracy radius: 2400 meters
[Track API] Using ipinfo.io coordinates: {...}
```

If you see these logs → ipinfo is working ✓

## Why "Hartsville, SC" Showed Up

The visitor tooltip showing "Hartsville, SC" is reading from OLD database records that have:
- Wrong city/region from before ipinfo was set up
- OR you're testing from an IP that really is assigned to Hartsville, SC by your ISP

Once ipinfo is enabled, NEW visitors will get accurate Charlotte, NC coordinates.

## Quick Fix Command

```bash
# Set in Vercel via CLI
cd /Users/whale/Desktop/analytics
vercel env add IPINFO_TOKEN
# Paste: fc6c8a326cbdb8
# Select: Production, Preview, Development

# Redeploy
vercel --prod
```

## Verification Checklist

After setting the env var and redeploying:

- [ ] Visit floradistro.com
- [ ] Check database: `SELECT * FROM website_visitors ORDER BY created_at DESC LIMIT 1`
- [ ] Verify:
  - [x] `geolocation_source = 'ipinfo'`
  - [x] `postal_code` is NOT null (e.g., '28205')
  - [x] `city` is accurate (not Hartsville if you're in Charlotte)
  - [x] `geolocation_accuracy` has a value (e.g., 2400)

---

**Once fixed, you'll see:**
- Accurate city/region for all visitors
- ZIP codes populated (28205, 28277, etc.)
- Neighborhood-level coordinates
- No more "Hartsville, SC" for Charlotte visitors

🎯 **This is critical - without ipinfo, you're still using datacenter IPs!**
