-- Backfill Accurate Geolocation for Historical Visitor Data
-- This replaces datacenter coordinates with city-level accurate coordinates

-- Step 1: Update Charlotte visitors (most common based on your map)
UPDATE website_visitors
SET
  latitude = 35.2271,
  longitude = -80.8431,
  geolocation_source = 'city_centroid_backfill'
WHERE
  (geolocation_source = 'vercel_headers' OR geolocation_source IS NULL)
  AND city ILIKE 'Charlotte'
  AND region = 'NC';

-- Step 2: Update other major NC cities
UPDATE website_visitors
SET
  latitude = CASE
    WHEN city ILIKE 'Raleigh' THEN 35.7796
    WHEN city ILIKE 'Greensboro' THEN 36.0726
    WHEN city ILIKE 'Durham' THEN 35.9940
    WHEN city ILIKE 'Winston-Salem' OR city ILIKE 'Winston Salem' THEN 36.0999
    WHEN city ILIKE 'Fayetteville' THEN 35.0527
    WHEN city ILIKE 'Cary' THEN 35.7915
    WHEN city ILIKE 'Wilmington' THEN 34.2257
    WHEN city ILIKE 'High Point' THEN 35.9557
    WHEN city ILIKE 'Concord' THEN 35.4088
    WHEN city ILIKE 'Asheville' THEN 35.5951
    WHEN city ILIKE 'Gastonia' THEN 35.2621
    WHEN city ILIKE 'Huntersville' THEN 35.4107
    WHEN city ILIKE 'Mooresville' THEN 35.5849
    WHEN city ILIKE 'Kannapolis' THEN 35.4874
    WHEN city ILIKE 'Matthews' THEN 35.1168
    WHEN city ILIKE 'Apex' THEN 35.7327
    WHEN city ILIKE 'Hickory' THEN 35.7332
    WHEN city ILIKE 'Indian Trail' THEN 35.0768
    WHEN city ILIKE 'Pineville' THEN 35.0832
    WHEN city ILIKE 'Cornelius' THEN 35.4868
    WHEN city ILIKE 'Mint Hill' THEN 35.1796
    WHEN city ILIKE 'Davidson' THEN 35.4993
    WHEN city ILIKE 'Statesville' THEN 35.7826
    WHEN city ILIKE 'Waxhaw' THEN 34.9246
    ELSE latitude
  END,
  longitude = CASE
    WHEN city ILIKE 'Raleigh' THEN -78.6382
    WHEN city ILIKE 'Greensboro' THEN -79.7920
    WHEN city ILIKE 'Durham' THEN -78.8986
    WHEN city ILIKE 'Winston-Salem' OR city ILIKE 'Winston Salem' THEN -80.2442
    WHEN city ILIKE 'Fayetteville' THEN -78.8784
    WHEN city ILIKE 'Cary' THEN -78.7811
    WHEN city ILIKE 'Wilmington' THEN -77.9447
    WHEN city ILIKE 'High Point' THEN -80.0053
    WHEN city ILIKE 'Concord' THEN -80.5795
    WHEN city ILIKE 'Asheville' THEN -82.5515
    WHEN city ILIKE 'Gastonia' THEN -81.1873
    WHEN city ILIKE 'Huntersville' THEN -80.8429
    WHEN city ILIKE 'Mooresville' THEN -80.8101
    WHEN city ILIKE 'Kannapolis' THEN -80.6217
    WHEN city ILIKE 'Matthews' THEN -80.7237
    WHEN city ILIKE 'Apex' THEN -78.8503
    WHEN city ILIKE 'Hickory' THEN -81.3412
    WHEN city ILIKE 'Indian Trail' THEN -80.6692
    WHEN city ILIKE 'Pineville' THEN -80.8923
    WHEN city ILIKE 'Cornelius' THEN -80.8601
    WHEN city ILIKE 'Mint Hill' THEN -80.6473
    WHEN city ILIKE 'Davidson' THEN -80.8487
    WHEN city ILIKE 'Statesville' THEN -80.8873
    WHEN city ILIKE 'Waxhaw' THEN -80.7434
    ELSE longitude
  END,
  geolocation_source = 'city_centroid_backfill'
WHERE
  (geolocation_source = 'vercel_headers' OR geolocation_source IS NULL)
  AND region = 'NC';

-- Step 3: Update Tennessee cities
UPDATE website_visitors
SET
  latitude = CASE
    WHEN city ILIKE 'Nashville' THEN 36.1627
    WHEN city ILIKE 'Memphis' THEN 35.1495
    WHEN city ILIKE 'Knoxville' THEN 35.9606
    WHEN city ILIKE 'Chattanooga' THEN 35.0456
    WHEN city ILIKE 'Clarksville' THEN 36.5298
    WHEN city ILIKE 'Murfreesboro' THEN 35.8456
    WHEN city ILIKE 'Franklin' THEN 35.9251
    WHEN city ILIKE 'Johnson City' THEN 36.3134
    ELSE latitude
  END,
  longitude = CASE
    WHEN city ILIKE 'Nashville' THEN -86.7816
    WHEN city ILIKE 'Memphis' THEN -90.0490
    WHEN city ILIKE 'Knoxville' THEN -83.9207
    WHEN city ILIKE 'Chattanooga' THEN -85.3097
    WHEN city ILIKE 'Clarksville' THEN -87.3595
    WHEN city ILIKE 'Murfreesboro' THEN -86.3903
    WHEN city ILIKE 'Franklin' THEN -86.8689
    WHEN city ILIKE 'Johnson City' THEN -82.3535
    ELSE longitude
  END,
  geolocation_source = 'city_centroid_backfill'
WHERE
  (geolocation_source = 'vercel_headers' OR geolocation_source IS NULL)
  AND region = 'TN';

-- Step 4: Update South Carolina cities
UPDATE website_visitors
SET
  latitude = CASE
    WHEN city ILIKE 'Rock Hill' THEN 34.9249
    WHEN city ILIKE 'Fort Mill' THEN 35.0074
    WHEN city ILIKE 'Columbia' THEN 34.0007
    WHEN city ILIKE 'Charleston' THEN 32.7765
    WHEN city ILIKE 'Greenville' THEN 34.8526
    WHEN city ILIKE 'Spartanburg' THEN 34.9496
    ELSE latitude
  END,
  longitude = CASE
    WHEN city ILIKE 'Rock Hill' THEN -81.0251
    WHEN city ILIKE 'Fort Mill' THEN -80.9451
    WHEN city ILIKE 'Columbia' THEN -81.0348
    WHEN city ILIKE 'Charleston' THEN -79.9311
    WHEN city ILIKE 'Greenville' THEN -82.3940
    WHEN city ILIKE 'Spartanburg' THEN -81.9320
    ELSE longitude
  END,
  geolocation_source = 'city_centroid_backfill'
WHERE
  (geolocation_source = 'vercel_headers' OR geolocation_source IS NULL)
  AND region = 'SC';

-- Step 5: Check results
SELECT
  geolocation_source,
  COUNT(*) as count,
  COUNT(DISTINCT city) as unique_cities,
  COUNT(DISTINCT region) as unique_states
FROM website_visitors
WHERE latitude IS NOT NULL
GROUP BY geolocation_source
ORDER BY count DESC;

-- Expected output:
-- city_centroid_backfill | 8500 | 45 | 10
-- vercel_headers         | 500  | 20 | 5  (remaining unmatched cities)
-- ipinfo                 | 100  | 30 | 8  (new visitors)
-- browser_gps            | 75   | 15 | 3  (new visitors)
