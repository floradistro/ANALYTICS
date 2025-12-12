/**
 * WhaleTools Analytics - E-commerce Event Tracking
 *
 * Add this script to your storefront to track:
 * - Product views
 * - Add to cart
 * - Purchases
 *
 * SETUP:
 * 1. Replace VENDOR_ID with your actual vendor ID from Supabase
 * 2. Replace ANALYTICS_URL with your analytics dashboard URL
 * 3. Call the tracking functions from your storefront code
 */

(function() {
  // CONFIGURATION - Update these values
  const VENDOR_ID = 'YOUR_VENDOR_ID'; // Get this from your Supabase vendors table
  const ANALYTICS_URL = 'https://your-analytics-dashboard.vercel.app'; // Your analytics URL

  // Generate or retrieve visitor/session IDs
  function getVisitorId() {
    let id = localStorage.getItem('wt_visitor_id');
    if (!id) {
      id = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('wt_visitor_id', id);
    }
    return id;
  }

  function getSessionId() {
    let id = sessionStorage.getItem('wt_session_id');
    if (!id) {
      id = 's_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      sessionStorage.setItem('wt_session_id', id);
    }
    return id;
  }

  // Core tracking function
  async function trackEvent(eventName, eventData = {}, revenue = null) {
    try {
      const payload = {
        vendor_id: VENDOR_ID,
        visitor_id: getVisitorId(),
        session_id: getSessionId(),
        event_name: eventName,
        event_data: eventData,
        revenue: revenue,
        utm_source: new URLSearchParams(window.location.search).get('utm_source'),
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
      };

      // Use sendBeacon for reliability (doesn't block page unload)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `${ANALYTICS_URL}/api/event`,
          JSON.stringify(payload)
        );
      } else {
        // Fallback to fetch
        await fetch(`${ANALYTICS_URL}/api/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }

      console.log(`[Analytics] Tracked: ${eventName}`, eventData);
    } catch (err) {
      console.error('[Analytics] Failed to track event:', err);
    }
  }

  // Expose tracking functions globally
  window.WhaleAnalytics = {
    // Track when a product is viewed
    trackProductView: function(product) {
      trackEvent('view_product', {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        category: product.category,
      });
    },

    // Track when item is added to cart
    trackAddToCart: function(product, quantity = 1) {
      trackEvent('add_to_cart', {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        quantity: quantity,
        category: product.category,
      });
    },

    // Track when item is removed from cart
    trackRemoveFromCart: function(product, quantity = 1) {
      trackEvent('remove_from_cart', {
        product_id: product.id,
        product_name: product.name,
        quantity: quantity,
      });
    },

    // Track completed purchase
    trackPurchase: function(order) {
      trackEvent('purchase', {
        order_id: order.id,
        order_number: order.order_number,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
      }, order.total); // revenue parameter
    },

    // Track checkout started
    trackCheckoutStarted: function(cart) {
      trackEvent('checkout_started', {
        item_count: cart.items?.length || 0,
        total: cart.total,
      });
    },

    // Generic event tracking
    track: trackEvent,
  };

  console.log('[Analytics] WhaleTools Analytics loaded');
})();


/**
 * USAGE EXAMPLES:
 *
 * 1. Product View (on product page load):
 *    WhaleAnalytics.trackProductView({
 *      id: 'prod_123',
 *      name: 'Premium CBD Oil',
 *      price: 49.99,
 *      category: 'CBD'
 *    });
 *
 * 2. Add to Cart:
 *    WhaleAnalytics.trackAddToCart({
 *      id: 'prod_123',
 *      name: 'Premium CBD Oil',
 *      price: 49.99,
 *      category: 'CBD'
 *    }, 2); // quantity
 *
 * 3. Purchase Complete:
 *    WhaleAnalytics.trackPurchase({
 *      id: 'order_456',
 *      order_number: 'ORD-2024-001',
 *      items: [...],
 *      subtotal: 99.98,
 *      tax: 7.50,
 *      shipping: 5.00,
 *      total: 112.48
 *    });
 *
 * 4. Custom Event:
 *    WhaleAnalytics.track('newsletter_signup', { email: 'user@example.com' });
 */
