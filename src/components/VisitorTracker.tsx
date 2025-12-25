'use client'

import { useEffect } from 'react'

interface VisitorTrackerProps {
  storeId: string
}

// Generate or retrieve persistent visitor ID
function getVisitorId(): string {
  if (typeof window === 'undefined') return ''

  const key = 'wt_visitor_id'
  let visitorId = localStorage.getItem(key)

  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem(key, visitorId)
  }

  return visitorId
}

export default function VisitorTracker({ storeId }: VisitorTrackerProps) {
  useEffect(() => {
    if (!storeId) return

    const trackVisit = async () => {
      try {
        const visitorId = getVisitorId()

        await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: storeId,
            visitor_id: visitorId,
            page_url: window.location.href,
            referrer: document.referrer || null,
          }),
        })
      } catch (err) {
        // Silently fail - don't break the app for analytics
        console.debug('Visitor tracking failed:', err)
      }
    }

    // Track after a short delay to not block page load
    const timer = setTimeout(trackVisit, 100)
    return () => clearTimeout(timer)
  }, [storeId])

  return null
}

// For external sites - embed script
export function getTrackingSnippet(storeId: string, analyticsUrl: string): string {
  return `
<!-- WhaleTools Analytics -->
<script>
(function() {
  var v = '${storeId}';
  var u = '${analyticsUrl}/api/track';
  var d = document, s = d.createElement('script');
  s.async = true;
  s.src = u + '?v=' + v + '&t=' + Date.now();
  d.head.appendChild(s);

  // Also send via beacon for more data
  if (navigator.sendBeacon) {
    navigator.sendBeacon(u, JSON.stringify({
      store_id: v,
      page_url: location.href,
      referrer: d.referrer
    }));
  }
})();
</script>
<!-- End WhaleTools Analytics -->
`.trim()
}
