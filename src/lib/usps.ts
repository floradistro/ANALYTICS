// USPS Tracking Utility Functions
// Tracking is now handled via EasyPost webhooks (see /api/webhooks/easypost)
// and /api/tracking/register for initial registration

export type TrackingStatus = 'in_transit' | 'delivered' | 'alert' | 'pre_transit' | 'out_for_delivery' | 'unknown'

// Get status color for UI
export function getStatusColor(status: TrackingStatus): string {
  switch (status) {
    case 'delivered':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    case 'out_for_delivery':
      return 'text-green-400 bg-green-500/10 border-green-500/20'
    case 'in_transit':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    case 'pre_transit':
      return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
    case 'alert':
      return 'text-red-400 bg-red-500/10 border-red-500/20'
    default:
      return 'text-zinc-400 bg-zinc-800 border-zinc-700'
  }
}

// Get status display text
export function getStatusDisplayText(status: TrackingStatus): string {
  switch (status) {
    case 'delivered':
      return 'Delivered'
    case 'out_for_delivery':
      return 'Out for Delivery'
    case 'in_transit':
      return 'In Transit'
    case 'pre_transit':
      return 'Pre-Transit'
    case 'alert':
      return 'Alert'
    default:
      return 'Unknown'
  }
}

// Format event timestamp for display
export function formatEventTimestamp(timestamp: string): string {
  if (!timestamp) return ''
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return timestamp
  }
}
