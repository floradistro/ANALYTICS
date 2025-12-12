import { useDashboardStore } from '@/stores/dashboard.store'
import { startOfDay, endOfDay, isValid, parseISO } from 'date-fns'

export interface DateRangeQuery {
  start: string
  end: string
  startDate: Date
  endDate: Date
  isValid: boolean
  dayCount: number
}

/**
 * Gets the current date range from the store and returns validated,
 * properly formatted values for Supabase queries.
 *
 * This function should be called at the START of every data fetch
 * to ensure we always use the latest date range values.
 *
 * Returns ISO strings that are safe for Supabase .gte() and .lte() filters.
 */
export function getDateRangeForQuery(): DateRangeQuery {
  const { dateRange } = useDashboardStore.getState()

  // Validate dates
  const startDate = dateRange.start instanceof Date && isValid(dateRange.start)
    ? dateRange.start
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // fallback to 30 days ago

  const endDate = dateRange.end instanceof Date && isValid(dateRange.end)
    ? dateRange.end
    : new Date() // fallback to now

  // Ensure start is before end
  const [validStart, validEnd] = startDate <= endDate
    ? [startDate, endDate]
    : [endDate, startDate]

  // Normalize to start of day for start, end of day for end
  // This ensures we capture all records on the boundary dates
  const normalizedStart = startOfDay(validStart)
  const normalizedEnd = endOfDay(validEnd)

  // Calculate day count for the range
  const dayCount = Math.ceil(
    (normalizedEnd.getTime() - normalizedStart.getTime()) / (24 * 60 * 60 * 1000)
  )

  return {
    start: normalizedStart.toISOString(),
    end: normalizedEnd.toISOString(),
    startDate: normalizedStart,
    endDate: normalizedEnd,
    isValid: true,
    dayCount: Math.max(1, dayCount),
  }
}

/**
 * Generates an array of date strings for initializing chart data
 * Ensures all dates in the range are represented even if no data exists
 */
export function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Formats a date string for consistent display
 */
export function formatDateForDisplay(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return isValid(date)
      ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : dateString
  } catch {
    return dateString
  }
}

/**
 * Debug helper - logs date range info in development
 */
export function logDateRange(context: string): void {
  if (process.env.NODE_ENV === 'development') {
    const range = getDateRangeForQuery()
    console.log(`[DateRange:${context}]`, {
      start: range.start,
      end: range.end,
      dayCount: range.dayCount,
    })
  }
}
