// Geocoding utility using free Nominatim API (OpenStreetMap)
// For production, consider using Mapbox Geocoding API for better rate limits

export interface GeocodedLocation {
  lat: number
  lng: number
  displayName?: string
  confidence: 'high' | 'medium' | 'low'
}

export interface AddressInput {
  address?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
}

// State abbreviation to full name mapping for better geocoding results
const stateNames: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia'
}

// Cache for geocoded results to avoid repeated API calls
const geocodeCache = new Map<string, GeocodedLocation | null>()

export async function geocodeAddress(input: AddressInput): Promise<GeocodedLocation | null> {
  const { address, city, state, postalCode } = input

  // Build address string for geocoding
  const parts: string[] = []
  if (address) parts.push(address)
  if (city) parts.push(city)
  if (state) {
    // Convert state abbreviation to full name for better results
    const fullState = stateNames[state.toUpperCase()] || state
    parts.push(fullState)
  }
  if (postalCode) parts.push(postalCode)
  parts.push('USA')

  const addressString = parts.join(', ')

  // Check cache first
  if (geocodeCache.has(addressString)) {
    return geocodeCache.get(addressString) || null
  }

  try {
    const encodedAddress = encodeURIComponent(addressString)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=us`,
      {
        headers: {
          'User-Agent': 'WhaleTools Analytics Dashboard'
        }
      }
    )

    if (!response.ok) {
      console.error('Geocoding failed:', response.statusText)
      geocodeCache.set(addressString, null)
      return null
    }

    const data = await response.json()

    if (data.length === 0) {
      // Try with just city and state if full address fails
      if (city && state) {
        const fallbackString = `${city}, ${stateNames[state.toUpperCase()] || state}, USA`
        const fallbackResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackString)}&limit=1&countrycodes=us`,
          {
            headers: {
              'User-Agent': 'WhaleTools Analytics Dashboard'
            }
          }
        )

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          if (fallbackData.length > 0) {
            const result: GeocodedLocation = {
              lat: parseFloat(fallbackData[0].lat),
              lng: parseFloat(fallbackData[0].lon),
              displayName: fallbackData[0].display_name,
              confidence: 'medium'
            }
            geocodeCache.set(addressString, result)
            return result
          }
        }
      }

      geocodeCache.set(addressString, null)
      return null
    }

    const result: GeocodedLocation = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
      confidence: address ? 'high' : 'medium'
    }

    geocodeCache.set(addressString, result)
    return result
  } catch (error) {
    console.error('Geocoding error:', error)
    geocodeCache.set(addressString, null)
    return null
  }
}

// Batch geocode with rate limiting (Nominatim requires 1 request per second)
export async function batchGeocode(
  addresses: AddressInput[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<number, GeocodedLocation | null>> {
  const results = new Map<number, GeocodedLocation | null>()

  for (let i = 0; i < addresses.length; i++) {
    const result = await geocodeAddress(addresses[i])
    results.set(i, result)

    if (onProgress) {
      onProgress(i + 1, addresses.length)
    }

    // Rate limit: wait 1 second between requests (Nominatim policy)
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}

// City coordinates for common US cities (lat, lng)
// This provides accurate positioning without needing external geocoding
const cityCentroids: Record<string, [number, number]> = {
  // North Carolina
  'CHARLOTTE,NC': [35.2271, -80.8431],
  'RALEIGH,NC': [35.7796, -78.6382],
  'GREENSBORO,NC': [36.0726, -79.7920],
  'DURHAM,NC': [35.9940, -78.8986],
  'WINSTON-SALEM,NC': [36.0999, -80.2442],
  'FAYETTEVILLE,NC': [35.0527, -78.8784],
  'CARY,NC': [35.7915, -78.7811],
  'WILMINGTON,NC': [34.2257, -77.9447],
  'HIGH POINT,NC': [35.9557, -80.0053],
  'CONCORD,NC': [35.4088, -80.5795],
  'ASHEVILLE,NC': [35.5951, -82.5515],
  'GASTONIA,NC': [35.2621, -81.1873],
  'HUNTERSVILLE,NC': [35.4107, -80.8429],
  'MOORESVILLE,NC': [35.5849, -80.8101],
  'KANNAPOLIS,NC': [35.4874, -80.6217],
  'ROCK HILL,NC': [34.9249, -81.0251],
  'MATTHEWS,NC': [35.1168, -80.7237],
  'APEX,NC': [35.7327, -78.8503],
  'HICKORY,NC': [35.7332, -81.3412],
  'INDIAN TRAIL,NC': [35.0768, -80.6692],
  'PINEVILLE,NC': [35.0832, -80.8923],
  'CORNELIUS,NC': [35.4868, -80.8601],
  'MINT HILL,NC': [35.1796, -80.6473],
  'DAVIDSON,NC': [35.4993, -80.8487],
  'STATESVILLE,NC': [35.7826, -80.8873],
  'WAXHAW,NC': [34.9246, -80.7434],
  'FORT MILL,NC': [35.0074, -80.9451],
  // Tennessee
  'NASHVILLE,TN': [36.1627, -86.7816],
  'MEMPHIS,TN': [35.1495, -90.0490],
  'KNOXVILLE,TN': [35.9606, -83.9207],
  'CHATTANOOGA,TN': [35.0456, -85.3097],
  'CLARKSVILLE,TN': [36.5298, -87.3595],
  'MURFREESBORO,TN': [35.8456, -86.3903],
  'FRANKLIN,TN': [35.9251, -86.8689],
  'JOHNSON CITY,TN': [36.3134, -82.3535],
  'JACKSON,TN': [35.6145, -88.8139],
  'HENDERSONVILLE,TN': [36.3048, -86.6200],
  'KINGSPORT,TN': [36.5484, -82.5618],
  // South Carolina (near Charlotte)
  'ROCK HILL,SC': [34.9249, -81.0251],
  'FORT MILL,SC': [35.0074, -80.9451],
  'COLUMBIA,SC': [34.0007, -81.0348],
  'CHARLESTON,SC': [32.7765, -79.9311],
  'GREENVILLE,SC': [34.8526, -82.3940],
  'SPARTANBURG,SC': [34.9496, -81.9320],
  // Georgia
  'ATLANTA,GA': [33.7490, -84.3880],
  'SAVANNAH,GA': [32.0809, -81.0912],
  'AUGUSTA,GA': [33.4735, -82.0105],
  // Virginia
  'RICHMOND,VA': [37.5407, -77.4360],
  'VIRGINIA BEACH,VA': [36.8529, -75.9780],
  'NORFOLK,VA': [36.8508, -76.2859],
  // Florida
  'MIAMI,FL': [25.7617, -80.1918],
  'ORLANDO,FL': [28.5383, -81.3792],
  'TAMPA,FL': [27.9506, -82.4572],
  'JACKSONVILLE,FL': [30.3322, -81.6557],
  // Other major cities
  'NEW YORK,NY': [40.7128, -74.0060],
  'LOS ANGELES,CA': [34.0522, -118.2437],
  'CHICAGO,IL': [41.8781, -87.6298],
  'HOUSTON,TX': [29.7604, -95.3698],
  'DALLAS,TX': [32.7767, -96.7970],
  'AUSTIN,TX': [30.2672, -97.7431],
  'SAN FRANCISCO,CA': [37.7749, -122.4194],
  'SEATTLE,WA': [47.6062, -122.3321],
  'DENVER,CO': [39.7392, -104.9903],
  'PHOENIX,AZ': [33.4484, -112.0740],
}

// Estimate coordinates from state centroid (fallback for when geocoding fails)
const stateCentroids: Record<string, [number, number]> = {
  AL: [32.806671, -86.791130],
  AK: [61.370716, -152.404419],
  AZ: [33.729759, -111.431221],
  AR: [34.969704, -92.373123],
  CA: [36.116203, -119.681564],
  CO: [39.059811, -105.311104],
  CT: [41.597782, -72.755371],
  DE: [39.318523, -75.507141],
  FL: [27.766279, -81.686783],
  GA: [33.040619, -83.643074],
  HI: [21.094318, -157.498337],
  ID: [44.240459, -114.478828],
  IL: [40.349457, -88.986137],
  IN: [39.849426, -86.258278],
  IA: [42.011539, -93.210526],
  KS: [38.526600, -96.726486],
  KY: [37.668140, -84.670067],
  LA: [31.169546, -91.867805],
  ME: [44.693947, -69.381927],
  MD: [39.063946, -76.802101],
  MA: [42.230171, -71.530106],
  MI: [43.326618, -84.536095],
  MN: [45.694454, -93.900192],
  MS: [32.741646, -89.678696],
  MO: [38.456085, -92.288368],
  MT: [46.921925, -110.454353],
  NE: [41.125370, -98.268082],
  NV: [38.313515, -117.055374],
  NH: [43.452492, -71.563896],
  NJ: [40.298904, -74.521011],
  NM: [34.840515, -106.248482],
  NY: [42.165726, -74.948051],
  NC: [35.630066, -79.806419],
  ND: [47.528912, -99.784012],
  OH: [40.388783, -82.764915],
  OK: [35.565342, -96.928917],
  OR: [44.572021, -122.070938],
  PA: [40.590752, -77.209755],
  RI: [41.680893, -71.511780],
  SC: [33.856892, -80.945007],
  SD: [44.299782, -99.438828],
  TN: [35.747845, -86.692345],
  TX: [31.054487, -97.563461],
  UT: [40.150032, -111.862434],
  VT: [44.045876, -72.710686],
  VA: [37.769337, -78.169968],
  WA: [47.400902, -121.490494],
  WV: [38.491226, -80.954453],
  WI: [44.268543, -89.616508],
  WY: [42.755966, -107.302490],
  DC: [38.897438, -77.026817]
}

// Full state name to abbreviation mapping
const stateAbbreviations: Record<string, string> = {
  'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR', 'CALIFORNIA': 'CA',
  'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE', 'FLORIDA': 'FL', 'GEORGIA': 'GA',
  'HAWAII': 'HI', 'IDAHO': 'ID', 'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA',
  'KANSAS': 'KS', 'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
  'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS', 'MISSOURI': 'MO',
  'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ',
  'NEW MEXICO': 'NM', 'NEW YORK': 'NY', 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH',
  'OKLAHOMA': 'OK', 'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
  'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT', 'VERMONT': 'VT',
  'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV', 'WISCONSIN': 'WI', 'WYOMING': 'WY',
  'DISTRICT OF COLUMBIA': 'DC'
}

// Normalize state input to 2-letter abbreviation
export function normalizeState(state: string): string {
  if (!state) return ''
  const upper = state.trim().toUpperCase()

  // Already an abbreviation
  if (upper.length === 2 && stateCentroids[upper]) {
    return upper
  }

  // Full state name
  if (stateAbbreviations[upper]) {
    return stateAbbreviations[upper]
  }

  // Return as-is if not found
  return upper
}

export function getStateCentroid(state: string): GeocodedLocation | null {
  const normalized = normalizeState(state)
  const coords = stateCentroids[normalized]

  if (!coords) return null

  return {
    lat: coords[0],
    lng: coords[1],
    confidence: 'low'
  }
}

// Get coordinates for a city - returns actual city location or falls back to state centroid
export function getCityCoordinates(city: string | null | undefined, state: string): GeocodedLocation | null {
  const normalizedState = normalizeState(state)
  if (!normalizedState) return null

  // Try exact city match first
  if (city) {
    const normalizedCity = city.trim().toUpperCase()
    const key = `${normalizedCity},${normalizedState}`
    const coords = cityCentroids[key]

    if (coords) {
      return {
        lat: coords[0],
        lng: coords[1],
        confidence: 'high'
      }
    }

    // Try partial match (for variations like "Charlotte" vs "CHARLOTTE")
    for (const [cityKey, cityCoords] of Object.entries(cityCentroids)) {
      if (cityKey.startsWith(normalizedCity + ',') || cityKey.includes(normalizedCity)) {
        const [, keyState] = cityKey.split(',')
        if (keyState === normalizedState) {
          return {
            lat: cityCoords[0],
            lng: cityCoords[1],
            confidence: 'medium'
          }
        }
      }
    }
  }

  // Fall back to state centroid
  return getStateCentroid(normalizedState)
}

// Get state abbreviation for display
export function getStateAbbreviation(state: string): string {
  return normalizeState(state)
}

// LocalStorage cache key for geocoded addresses
const GEOCODE_CACHE_KEY = 'geocode_cache_v1'

// Get cached geocode results from localStorage
function getGeocodeCacheFromStorage(): Record<string, { lat: number; lng: number } | null> {
  if (typeof window === 'undefined') return {}
  try {
    const cached = localStorage.getItem(GEOCODE_CACHE_KEY)
    return cached ? JSON.parse(cached) : {}
  } catch {
    return {}
  }
}

// Save geocode cache to localStorage
function saveGeocodeCacheToStorage(cache: Record<string, { lat: number; lng: number } | null>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Storage full or unavailable
  }
}

// Geocode a full address string using Mapbox (fast, no rate limiting)
export async function geocodeFullAddress(
  address: string,
  city: string,
  state: string,
  postalCode?: string,
  mapboxToken?: string
): Promise<{ lat: number; lng: number } | null> {
  // Build cache key
  const cacheKey = `${address}|${city}|${state}|${postalCode || ''}`.toLowerCase()

  // Check memory cache first
  if (geocodeCache.has(cacheKey)) {
    const cached = geocodeCache.get(cacheKey)
    return cached ? { lat: cached.lat, lng: cached.lng } : null
  }

  // Check localStorage cache
  const storageCache = getGeocodeCacheFromStorage()
  if (cacheKey in storageCache) {
    const cached = storageCache[cacheKey]
    if (cached) {
      geocodeCache.set(cacheKey, { lat: cached.lat, lng: cached.lng, confidence: 'high' })
    }
    return cached
  }

  // If no token, fall back to city coordinates
  if (!mapboxToken) {
    const fallback = getCityCoordinates(city, state)
    return fallback ? { lat: fallback.lat, lng: fallback.lng } : null
  }

  // Build address string
  const parts: string[] = []
  if (address) parts.push(address)
  if (city) parts.push(city)
  if (state) {
    const fullState = stateNames[state.toUpperCase()] || state
    parts.push(fullState)
  }
  if (postalCode) {
    const zip = postalCode.substring(0, 5)
    parts.push(zip)
  }

  const addressString = parts.join(', ')

  try {
    // Use Mapbox Geocoding API - fast, no rate limiting
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressString)}.json?access_token=${mapboxToken}&country=us&limit=1&types=address,place`
    )

    if (!response.ok) {
      // Fall back to city coordinates
      const fallback = getCityCoordinates(city, state)
      if (fallback) {
        storageCache[cacheKey] = { lat: fallback.lat, lng: fallback.lng }
        saveGeocodeCacheToStorage(storageCache)
        return { lat: fallback.lat, lng: fallback.lng }
      }
      return null
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      // Fall back to city coordinates
      const fallback = getCityCoordinates(city, state)
      if (fallback) {
        storageCache[cacheKey] = { lat: fallback.lat, lng: fallback.lng }
        saveGeocodeCacheToStorage(storageCache)
        return { lat: fallback.lat, lng: fallback.lng }
      }
      storageCache[cacheKey] = null
      saveGeocodeCacheToStorage(storageCache)
      return null
    }

    // Mapbox returns [lng, lat]
    const [lng, lat] = data.features[0].center
    const result = { lat, lng }

    // Cache the result
    geocodeCache.set(cacheKey, { ...result, confidence: 'high' })
    storageCache[cacheKey] = result
    saveGeocodeCacheToStorage(storageCache)

    return result
  } catch (error) {
    console.error('Geocoding error:', error)
    // Fall back to city coordinates
    const fallback = getCityCoordinates(city, state)
    if (fallback) {
      storageCache[cacheKey] = { lat: fallback.lat, lng: fallback.lng }
      saveGeocodeCacheToStorage(storageCache)
      return { lat: fallback.lat, lng: fallback.lng }
    }
    return null
  }
}

// Batch geocode addresses in parallel using Mapbox (fast!)
export async function batchGeocodeAddresses(
  addresses: Array<{ address: string; city: string; state: string; postalCode?: string; id: string }>,
  mapboxToken: string,
  onProgress?: (completed: number, total: number, results: Map<string, { lat: number; lng: number } | null>) => void
): Promise<Map<string, { lat: number; lng: number } | null>> {
  const results = new Map<string, { lat: number; lng: number } | null>()
  const storageCache = getGeocodeCacheFromStorage()

  // First, resolve all cached entries immediately
  const uncached: typeof addresses = []
  for (const addr of addresses) {
    const cacheKey = `${addr.address}|${addr.city}|${addr.state}|${addr.postalCode || ''}`.toLowerCase()
    if (cacheKey in storageCache) {
      results.set(addr.id, storageCache[cacheKey])
    } else {
      uncached.push(addr)
    }
  }

  // Report initial progress with cached results
  if (onProgress) {
    onProgress(results.size, addresses.length, results)
  }

  // If all cached, we're done
  if (uncached.length === 0) {
    return results
  }

  // Geocode uncached addresses in parallel batches (Mapbox is fast!)
  const BATCH_SIZE = 20 // Process 20 at a time to avoid overwhelming the browser

  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE)

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (addr) => {
        const result = await geocodeFullAddress(
          addr.address,
          addr.city,
          addr.state,
          addr.postalCode,
          mapboxToken
        )
        return { id: addr.id, result }
      })
    )

    // Add results
    for (const { id, result } of batchResults) {
      results.set(id, result)
    }

    // Report progress
    if (onProgress) {
      onProgress(results.size, addresses.length, results)
    }
  }

  return results
}
