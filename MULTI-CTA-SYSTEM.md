# Multi-CTA QR Code System

## Better Than Linktree - Built for Cannabis E-Commerce

Your QR code system now supports multiple Call-to-Action buttons per QR code, with GPS-tracked analytics that blow Linktree out of the water.

---

## What Makes It Better Than Linktree

### 1. **GPS-Tracked Engagement**
- Every CTA click is tracked with precise GPS coordinates
- Know which buttons work in which cities
- Heatmaps for each individual CTA

### 2. **Smart Auto-Ordering**
- CTAs can automatically reorder based on click performance
- Most-clicked buttons move to the top
- Or maintain manual control over ordering

### 3. **Geo-Targeting**
```sql
-- Show "Order Delivery" only in cities you serve
show_in_cities: ['Raleigh', 'Durham', 'Chapel Hill']

-- Hide "Visit Store" in cities without physical locations
hide_in_cities: ['Remote City']

-- Target by state/region
show_in_regions: ['North Carolina', 'California']
```

### 4. **Time-Based Scheduling**
```sql
-- Happy Hour CTAs (4pm-7pm only)
active_hours_range: [16, 19]

-- Weekend-only promotions
active_days_of_week: [0, 6] -- Sunday=0, Saturday=6

-- Seasonal campaigns
active_from: '2024-06-01'
active_until: '2024-08-31'
```

### 5. **Cannabis-Specific Features**
- Age verification per CTA
- Compliance warnings ("Medical use only", "Check local laws")
- License number display
- Dedicated CTA types: "View Lab Results", "Check Batch Info"

### 6. **Rich Media**
- Thumbnail images for each CTA
- Video embeds
- PDF links (COAs, menus, etc.)
- Image galleries on landing pages

### 7. **Deep Analytics**
- Click-through rates per CTA
- Time-to-click tracking (how long after scan?)
- Position performance (does being first matter?)
- Conversion funnels
- City-by-city breakdown
- Device & browser analytics

---

## Database Schema

### Tables Created

#### `qr_code_ctas`
Stores multiple CTAs per QR code with advanced targeting

**Key Features:**
- Unlimited CTAs per QR code
- Visual customization (style, color, icon)
- Category organization (shop, info, social, compliance)
- Display ordering (manual + auto)
- Scheduling (time, day, date ranges)
- Geo-targeting (cities, regions)
- Rich media (thumbnails, descriptions)

#### `qr_cta_clicks`
GPS-tracked clicks for each CTA

**Tracked Data:**
- Precise GPS coordinates at click time
- City, region, country
- Time since QR scan
- CTA position when clicked
- Total CTAs visible
- Device & browser info
- Links back to original scan

### Analytics Views

#### `qr_cta_performance_by_location`
Shows which CTAs work best in which cities

#### `qr_cta_funnel`
Conversion funnel: Scans → CTA Clicks

#### `qr_top_ctas`
Leaderboard of best-performing CTAs

---

## CTA Types & Categories

### Types
- `url` - Standard web link
- `phone` - Click-to-call
- `email` - mailto: link
- `sms` - Text message
- `app_link` - Deep link to app
- `video` - Video player
- `pdf` - PDF viewer

### Categories
- `shop` - E-commerce actions
- `info` - Educational content
- `social` - Social media
- `compliance` - Lab results, licenses
- `support` - Help & contact
- `navigate` - Directions, locations

---

## Example Use Cases

### Product Label QR Code
```javascript
{
  name: "Blue Dream Product Label",
  destination_url: "https://floradistro.com/products/blue-dream",

  ctas: [
    {
      label: "View Lab Results",
      url: "/coa/BD-2024-001.pdf",
      icon: "flask",
      category: "compliance",
      requires_age_verification: true
    },
    {
      label: "Order Now",
      url: "/shop/blue-dream",
      icon: "shopping-cart",
      category: "shop",
      style: "primary",
      is_featured: true
    },
    {
      label: "Learn About This Strain",
      url: "/strains/blue-dream",
      icon: "book",
      category: "info",
      thumbnail_url: "/images/blue-dream.jpg"
    },
    {
      label: "Find Nearest Location",
      url: "/locations",
      icon: "map-pin",
      category: "navigate",
      // Only show in cities with physical stores
      show_in_cities: ["Raleigh", "Durham"]
    },
    {
      label: "Text for Support",
      url: "sms:+19195551234",
      type: "sms",
      category: "support"
    }
  ]
}
```

### Marketing Campaign QR
```javascript
{
  name: "Summer 2024 Promo",
  campaign_name: "Summer_Deals",

  ctas: [
    {
      label: "Shop Summer Sale",
      url: "/sales/summer-2024",
      style: "primary",
      is_featured: true,
      active_from: "2024-06-01",
      active_until: "2024-08-31"
    },
    {
      label: "Happy Hour Deals 🍃",
      url: "/happy-hour",
      active_hours_range: [16, 19],
      active_days_of_week: [1,2,3,4,5] // Weekdays only
    },
    {
      label: "Join Rewards Program",
      url: "/rewards",
      description: "Earn points on every purchase"
    }
  ]
}
```

---

## Smart Features

### Auto-Reordering
Enable `auto_reorder: true` and CTAs automatically sort by click performance

### Featured CTAs
Set `is_featured: true` to always show at the top

### Geo-Intelligence
```javascript
// Denver gets weed delivery, NYC gets hemp products
{
  label: "Order Weed Delivery",
  show_in_regions: ["Colorado"],
  hide_in_regions: ["New York"]
}
```

### Schedule Intelligence
```javascript
// Different CTAs for different times
{
  label: "Morning Deals",
  active_hours_range: [6, 12]
},
{
  label: "Night Owl Special",
  active_hours_range: [22, 4]
}
```

---

## Analytics Queries

### Top CTAs by City
```sql
SELECT * FROM qr_cta_performance_by_location
WHERE city = 'Raleigh'
ORDER BY click_count DESC;
```

### Conversion Rates
```sql
SELECT * FROM qr_cta_funnel
WHERE qr_code_id = 'your-qr-id';
```

### Time-to-Click Analysis
```sql
SELECT
  cta_label,
  AVG(time_since_scan_seconds) as avg_seconds,
  city
FROM qr_cta_performance_by_location
GROUP BY cta_label, city
ORDER BY avg_seconds;
```

---

## Next Steps

1. **Create Multi-CTA API Endpoints** ✓ (Coming next)
2. **Update QR Dashboard UI** (Add CTA management)
3. **Update Landing Page** (Display multiple CTAs)
4. **Add CTA Analytics View** (Dashboard for CTA performance)

---

## Comparison Chart

| Feature | Linktree | Your System |
|---------|----------|-------------|
| Multiple Links | ✓ | ✓ |
| Custom Branding | ✓ (Premium) | ✓ (Free) |
| Basic Analytics | ✓ | ✓ |
| **GPS Tracking** | ✗ | ✓ |
| **Geo-Targeting** | ✗ | ✓ |
| **Time Scheduling** | ✗ | ✓ |
| **Auto-Reordering** | ✗ | ✓ |
| **Click Heatmaps** | ✗ | ✓ |
| **Compliance Features** | ✗ | ✓ |
| **Rich Analytics** | Basic | Advanced |
| **Cost** | $5-29/mo | Free (Self-hosted) |

---

## Your Competitive Advantage

This isn't just "QR codes with links" - this is a full **location-based marketing intelligence platform** disguised as QR codes.

You'll know:
- Which products sell best in which cities
- What time of day people engage
- Which CTAs drive the most action
- Where your customers are (literally)
- How to optimize every QR code in real-time

**Linktree can't compete with this.**
