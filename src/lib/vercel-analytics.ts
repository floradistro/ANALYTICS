// Vercel Analytics API integration for visitor geo data
// Requires VERCEL_ANALYTICS_TOKEN and VERCEL_PROJECT_ID environment variables

interface VercelAnalyticsConfig {
  token: string
  projectId: string
  teamId?: string
}

export interface VercelGeoData {
  country: string
  region?: string
  city?: string
  visitors: number
  pageViews: number
}

export interface VercelAnalyticsResponse {
  data: {
    key: string
    total: number
    devices?: number
  }[]
}

// US state codes for filtering
const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
])

export async function fetchVercelAnalyticsGeo(
  config: VercelAnalyticsConfig,
  options: {
    from: Date
    to: Date
    filter?: 'country' | 'region' | 'city'
  }
): Promise<VercelGeoData[]> {
  const { token, projectId, teamId } = config
  const { from, to, filter = 'region' } = options

  if (!token || !projectId) {
    console.warn('Vercel Analytics credentials not configured')
    return []
  }

  try {
    // Build query params
    const params = new URLSearchParams({
      projectId,
      from: from.toISOString(),
      to: to.toISOString(),
      filter,
    })

    if (teamId) {
      params.append('teamId', teamId)
    }

    const response = await fetch(
      `https://vercel.com/api/web-analytics?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Vercel Analytics API error:', response.status, errorText)
      return []
    }

    const data: VercelAnalyticsResponse = await response.json()

    // Transform response to our format
    return data.data.map(item => {
      // Parse region key (format: "US-NC" for North Carolina, US)
      const parts = item.key.split('-')
      const country = parts[0] || item.key
      const region = parts[1]

      return {
        country,
        region,
        visitors: item.devices || item.total,
        pageViews: item.total,
      }
    }).filter(item => {
      // For US-focused analytics, only include US regions
      if (filter === 'region') {
        return item.country === 'US' && item.region && US_STATES.has(item.region)
      }
      return true
    })
  } catch (error) {
    console.error('Failed to fetch Vercel Analytics:', error)
    return []
  }
}

// Alternative: Fetch from Vercel Analytics REST API v1
export async function fetchVercelWebVitals(
  config: VercelAnalyticsConfig,
  options: {
    from: Date
    to: Date
  }
) {
  const { token, projectId, teamId } = config
  const { from, to } = options

  if (!token || !projectId) {
    return null
  }

  try {
    const params = new URLSearchParams({
      projectId,
      from: from.toISOString(),
      to: to.toISOString(),
    })

    if (teamId) {
      params.append('teamId', teamId)
    }

    const response = await fetch(
      `https://vercel.com/api/web-vitals?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

// Get aggregated visitor data by US state
export async function getUSStateVisitors(
  config: VercelAnalyticsConfig,
  dateRange: { start: Date; end: Date }
): Promise<Map<string, { visitors: number; pageViews: number }>> {
  const geoData = await fetchVercelAnalyticsGeo(config, {
    from: dateRange.start,
    to: dateRange.end,
    filter: 'region',
  })

  const stateMap = new Map<string, { visitors: number; pageViews: number }>()

  for (const item of geoData) {
    if (item.region && US_STATES.has(item.region)) {
      const existing = stateMap.get(item.region)
      if (existing) {
        existing.visitors += item.visitors
        existing.pageViews += item.pageViews
      } else {
        stateMap.set(item.region, {
          visitors: item.visitors,
          pageViews: item.pageViews,
        })
      }
    }
  }

  return stateMap
}
