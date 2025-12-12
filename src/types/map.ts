export type LocationType = 'store' | 'customer' | 'shipping' | 'visitor'

export interface MapLocation {
  id: string
  type: LocationType
  lat: number
  lng: number
  name?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  // Metrics
  orderCount?: number
  totalRevenue?: number
  // Visitor data (from Vercel Analytics)
  visitorCount?: number
  // Metadata
  lastOrderDate?: string
  confidence: 'high' | 'medium' | 'low'
}

export interface ClusteredLocation {
  type: 'cluster'
  lat: number
  lng: number
  count: number
  totalRevenue: number
  locationTypes: LocationType[]
}

export interface MapStats {
  totalLocations: number
  totalCustomers: number
  totalShipments: number
  totalRevenue: number
  topStates: { state: string; count: number; revenue: number }[]
  topCities: { city: string; state: string; count: number; revenue: number }[]
}

export interface MapFilters {
  showStores: boolean
  showCustomers: boolean
  showShipping: boolean
  showVisitors: boolean
  dateRange: {
    start: Date
    end: Date
  }
  minOrderValue?: number
  selectedStates?: string[]
}

export interface VercelAnalyticsGeoData {
  country: string
  region?: string
  city?: string
  visitors: number
  pageViews: number
}
