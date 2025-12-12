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

// Get state abbreviation for display
export function getStateAbbreviation(state: string): string {
  return normalizeState(state)
}
