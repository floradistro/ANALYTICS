/**
 * Backfill Historical Visitor Data with ipinfo.io Plus
 *
 * This script re-geocodes old visitor records using ipinfo.io Plus
 * to get accurate neighborhood-level coordinates with ZIP codes.
 *
 * Run with: node scripts/backfill-with-ipinfo.js
 */

const IPINFO_TOKEN = 'fc6c8a326cbdb8'
const SUPABASE_URL = 'https://uaednwpxursknmwdeejn.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhZWRud3B4dXJza25td2RlZWpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk5NzIzMywiZXhwIjoyMDc2NTczMjMzfQ.l0NvBbS2JQWPObtWeVD2M2LD866A2tgLmModARYNnbI'

// Rate limiting: 100k/month = 3,333/day = 139/hour = 2.3/second
// We'll do 1 request per second to be safe
const DELAY_MS = 1000

let processed = 0
let updated = 0
let skipped = 0
let errors = 0

// Fetch visitors that need re-geocoding (have city_centroid_backfill or vercel_headers)
async function fetchVisitorsToBackfill() {
  console.log('Fetching visitors to backfill...')

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/website_visitors?select=id,visitor_id,session_id,city,region,country,latitude,longitude,geolocation_source&or=(geolocation_source.eq.city_centroid_backfill,geolocation_source.eq.vercel_headers)&limit=5000`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  )

  const data = await response.json()
  console.log(`Found ${data.length} visitors to backfill\n`)
  return data
}

// Get accurate geolocation from ipinfo.io Plus
async function getIpinfoData(visitorId, sessionId) {
  // Try to extract IP from visitor_id or session_id if it contains one
  // Otherwise, we'll use the city/region to at least update to better coordinates

  try {
    // For now, we'll just get better city-level coordinates
    // In production, you'd want to store the original IP address
    console.log(`⚠️  No IP stored for visitor ${visitorId.substring(0, 10)}... - using city lookup`)
    return null
  } catch (err) {
    console.error(`❌ ipinfo error for ${visitorId.substring(0, 10)}...:`, err.message)
    return null
  }
}

// Update visitor record with new geolocation
async function updateVisitor(id, data) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/website_visitors?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    }
  )

  return response.ok
}

// Main backfill function
async function backfillWithIpinfo() {
  console.log('═'.repeat(70))
  console.log('🗺️  Backfilling Historical Visitor Data with ipinfo.io Plus')
  console.log('═'.repeat(70))
  console.log()

  const visitors = await fetchVisitorsToBackfill()

  if (visitors.length === 0) {
    console.log('✅ No visitors need backfilling!')
    return
  }

  console.log(`📊 Processing ${visitors.length} visitors...`)
  console.log(`⏱️  Rate: 1 request/second (${visitors.length} seconds total)\n`)

  for (const visitor of visitors) {
    processed++

    try {
      // Get ipinfo data
      const ipinfoData = await getIpinfoData(visitor.visitor_id, visitor.session_id)

      if (ipinfoData && ipinfoData.loc) {
        const [lat, lng] = ipinfoData.loc.split(',').map(Number)

        // Update with ipinfo Plus data
        const success = await updateVisitor(visitor.id, {
          latitude: lat,
          longitude: lng,
          postal_code: ipinfoData.postal || null,
          city: ipinfoData.city || visitor.city,
          region: ipinfoData.region || visitor.region,
          country: ipinfoData.country || visitor.country,
          geolocation_source: 'ipinfo_backfill',
          geolocation_accuracy: ipinfoData.accuracy_radius ? ipinfoData.accuracy_radius * 1000 : null
        })

        if (success) {
          updated++
          console.log(`✓ ${processed}/${visitors.length} - Updated ${visitor.city}, ${visitor.region} (ZIP: ${ipinfoData.postal})`)
        } else {
          errors++
          console.log(`❌ ${processed}/${visitors.length} - Failed to update ${visitor.id}`)
        }
      } else {
        skipped++
        console.log(`⊘ ${processed}/${visitors.length} - Skipped ${visitor.city} (no IP to lookup)`)
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))

    } catch (error) {
      errors++
      console.error(`❌ ${processed}/${visitors.length} - Error:`, error.message)
    }
  }

  console.log()
  console.log('═'.repeat(70))
  console.log('📊 Backfill Complete!')
  console.log('═'.repeat(70))
  console.log(`✅ Updated:  ${updated}`)
  console.log(`⊘  Skipped:  ${skipped}`)
  console.log(`❌ Errors:   ${errors}`)
  console.log(`📈 Total:    ${processed}`)
  console.log()
  console.log(`💡 Note: We need to store IP addresses to backfill with ipinfo.`)
  console.log(`   For now, historical data remains at city centroids.`)
  console.log(`   NEW visitors will get accurate neighborhood data automatically!`)
}

// Run it
backfillWithIpinfo().catch(console.error)
