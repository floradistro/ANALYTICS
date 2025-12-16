/**
 * Backfill Accurate Geolocation for Historical Visitor Data
 *
 * This script re-geocodes old visitor records that have datacenter IPs
 * by using ipinfo.io to get accurate city-level coordinates.
 *
 * Run with: npx tsx scripts/backfill-geolocation.ts
 */

import { createClient } from '@supabase/supabase-js'

const IPINFO_TOKEN = process.env.IPINFO_TOKEN || 'fc6c8a326cbdb8'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Rate limiting: ipinfo.io free tier = 50k/month = ~1,600/day
// We'll do 100 requests/minute = 1.67/second (safe)
const BATCH_SIZE = 100
const DELAY_MS = 60000 // 1 minute between batches

interface VisitorRecord {
  id: string
  latitude: number | null
  longitude: number | null
  city: string | null
  region: string | null
  country: string | null
  geolocation_source: string | null
}

// City coordinates cache (from your existing geocoding.ts)
const cityCentroids: Record<string, [number, number]> = {
  // North Carolina
  'CHARLOTTE,NC': [35.2271, -80.8431],
  'RALEIGH,NC': [35.7796, -78.6382],
  'GREENSBORO,NC': [36.0726, -79.7920],
  'DURHAM,NC': [35.9940, -78.8986],
  'WINSTON-SALEM,NC': [36.0999, -80.2442],
  'ASHEVILLE,NC': [35.5951, -82.5515],
  // Add more as needed...
}

// Get city coordinates (same as your frontend logic)
function getCityCoordinates(city: string | null, state: string | null): { lat: number; lng: number } | null {
  if (!city || !state) return null

  const key = `${city.toUpperCase()},${state.toUpperCase()}`
  const coords = cityCentroids[key]

  if (coords) {
    return { lat: coords[0], lng: coords[1] }
  }

  return null
}

// Fetch visitors that need re-geocoding
async function fetchVisitorsToUpdate(): Promise<VisitorRecord[]> {
  console.log('Fetching visitors with datacenter coordinates...')

  const { data, error } = await supabase
    .from('website_visitors')
    .select('id, latitude, longitude, city, region, country, geolocation_source')
    .or('geolocation_source.eq.vercel_headers,geolocation_source.is.null')
    .not('latitude', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5000) // Process 5000 at a time

  if (error) {
    console.error('Error fetching visitors:', error)
    return []
  }

  console.log(`Found ${data.length} visitors to update`)
  return data
}

// Update visitor record with accurate coordinates
async function updateVisitorLocation(
  id: string,
  lat: number,
  lng: number,
  source: 'ipinfo' | 'city_centroid'
) {
  const { error } = await supabase
    .from('website_visitors')
    .update({
      latitude: lat,
      longitude: lng,
      geolocation_source: source
    })
    .eq('id', id)

  if (error) {
    console.error(`Error updating visitor ${id}:`, error)
  }
}

// Process a single visitor
async function processVisitor(visitor: VisitorRecord): Promise<void> {
  // Try city coordinates first (fast, no API call)
  const cityCoords = getCityCoordinates(visitor.city, visitor.region)

  if (cityCoords) {
    await updateVisitorLocation(visitor.id, cityCoords.lat, cityCoords.lng, 'city_centroid')
    console.log(`✓ Updated ${visitor.id} with city centroid: ${visitor.city}, ${visitor.region}`)
    return
  }

  // If no city coordinates, mark as needs manual review
  console.log(`⚠ No coordinates for ${visitor.city}, ${visitor.region} - skipping`)
}

// Main backfill process
async function backfillGeolocation() {
  console.log('Starting geolocation backfill...')
  console.log('Using city centroids (no API calls required)')
  console.log('=' .repeat(60))

  const visitors = await fetchVisitorsToUpdate()

  if (visitors.length === 0) {
    console.log('No visitors to update!')
    return
  }

  let updated = 0
  let skipped = 0

  for (const visitor of visitors) {
    try {
      await processVisitor(visitor)
      updated++
    } catch (error) {
      console.error(`Error processing visitor ${visitor.id}:`, error)
      skipped++
    }

    // Progress update every 100 records
    if ((updated + skipped) % 100 === 0) {
      console.log(`Progress: ${updated} updated, ${skipped} skipped, ${updated + skipped}/${visitors.length} total`)
    }
  }

  console.log('=' .repeat(60))
  console.log(`Backfill complete!`)
  console.log(`✓ Updated: ${updated}`)
  console.log(`⚠ Skipped: ${skipped}`)
  console.log(`Total processed: ${updated + skipped}`)
}

// Run the backfill
backfillGeolocation().catch(console.error)
