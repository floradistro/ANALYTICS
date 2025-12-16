# Staff Attribution System - POS Integration Guide

## Overview
The analytics dashboard now has a **complete staff attribution tracking system** that automatically records which staff member performed each action on an order.

**This tracks staff for BOTH online and POS orders:**
- **Online Orders**: Staff who prepare, pack, print labels, and ship
- **POS Orders**: Staff who create the sale, fulfill, and deliver

## Database Schema

### New Column
- `orders.updated_by_user_id` (uuid) - References `auth.users(id)`

### Existing Staff Tracking Columns
- `orders.employee_id` - The POS employee who created the order
- `orders.created_by_user_id` - Dashboard user who created/confirmed the order
- `orders.prepared_by_user_id` - Staff member who prepared the order
- `orders.shipped_by_user_id` - Staff member who shipped the order
- `orders.delivered_by_user_id` - Staff member who delivered the order

## How It Works

### Automatic Tracking via Database Triggers

When you update an order's status and include `updated_by_user_id`, the database **automatically** sets the appropriate staff attribution field:

```sql
-- Status: confirmed → sets created_by_user_id
-- Status: preparing/prepared → sets prepared_by_user_id
-- Status: shipped/in_transit → sets shipped_by_user_id
-- Status: delivered/completed → sets delivered_by_user_id
```

### POS Integration Requirements

To enable staff tracking in your POS system, you need to:

#### 1. When Creating Orders (POS Sale)

```javascript
// Get the currently signed-in user from your POS auth system
const currentUser = await supabase.auth.getUser()

// When inserting a new order
const { data, error } = await supabase
  .from('orders')
  .insert({
    vendor_id: vendorId,
    customer_id: customerId,
    order_number: `POS-${Date.now()}`,
    status: 'confirmed',
    // ... other order fields ...

    // IMPORTANT: Set these staff tracking fields
    employee_id: currentUser.id,           // POS employee who made the sale
    created_by_user_id: currentUser.id,    // Same user confirmed/created it
    updated_by_user_id: currentUser.id,    // For the trigger system
  })
```

#### 2. When Updating Order Status (Fulfillment, Shipping, etc.)

```javascript
// Get current signed-in user
const currentUser = await supabase.auth.getUser()

// When changing order status
const { data, error } = await supabase
  .from('orders')
  .update({
    status: 'shipped',                     // New status
    updated_by_user_id: currentUser.id,   // REQUIRED: Who made this change
    // The database trigger will automatically set shipped_by_user_id
  })
  .eq('id', orderId)
```

#### 3. When Printing Shipping Labels

```javascript
const currentUser = await supabase.auth.getUser()

await supabase
  .from('orders')
  .update({
    status: 'shipped',
    tracking_number: trackingNumber,
    shipping_carrier: 'USPS',
    updated_by_user_id: currentUser.id,  // Records who printed the label
  })
  .eq('id', orderId)
```

## POS System Examples

### Example 1: Complete POS Checkout Flow

```javascript
async function completePOSCheckout(cart, customerId, employeeId) {
  const currentUser = await supabase.auth.getUser()

  // Create the order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      vendor_id: vendorId,
      customer_id: customerId,
      order_number: generatePOSOrderNumber(),
      order_type: 'pickup',  // or 'shipping'
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: 'card',
      subtotal: cart.subtotal,
      tax_amount: cart.tax,
      total_amount: cart.total,

      // Staff attribution - POS employee who made the sale
      employee_id: employeeId || currentUser.id,
      created_by_user_id: currentUser.id,
      updated_by_user_id: currentUser.id,
    })
    .select()
    .single()

  // Create order items
  await supabase
    .from('order_items')
    .insert(
      cart.items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        line_total: item.quantity * item.price,
      }))
    )

  return order
}
```

### Example 2: Fulfill POS Order

```javascript
async function fulfillOrder(orderId) {
  const currentUser = await supabase.auth.getUser()

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'prepared',
      updated_by_user_id: currentUser.id,  // Trigger sets prepared_by_user_id
    })
    .eq('id', orderId)
}
```

### Example 3: Ship Order from POS

```javascript
async function shipOrderFromPOS(orderId, trackingInfo) {
  const currentUser = await supabase.auth.getUser()

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'shipped',
      tracking_number: trackingInfo.tracking,
      shipping_carrier: trackingInfo.carrier,
      shipping_service: trackingInfo.service,
      updated_by_user_id: currentUser.id,  // Trigger sets shipped_by_user_id
    })
    .eq('id', orderId)
}
```

## Dashboard Integration (Already Complete)

The analytics dashboard is already set up to:
- Pass `updated_by_user_id` when saving order changes
- Display staff attribution with **email addresses** instead of UUIDs
- Show staff tracking in both Overview and Status tabs
- Display detailed timeline with who did what and when

### Tracking Online Order Fulfillment

**Staff members fulfill online orders through the dashboard:**

1. **Staff logs into dashboard** → their user ID is tracked
2. **Opens an online order** → sees order details
3. **Changes status to "Preparing"** → `prepared_by_user_id` is automatically set to that staff member
4. **Prints shipping label** → changes status to "Shipped" → `shipped_by_user_id` is automatically set
5. **Marks as delivered** → `delivered_by_user_id` is automatically set

**This happens automatically** - staff just need to update the order status in the dashboard, and the system tracks who did it.

## Benefits

### For Management
- See which employee handled each order
- Track staff performance and accountability
- Identify bottlenecks in the fulfillment process
- Monitor who's processing shipments

### For Staff
- Clear attribution of who did what
- Accountability for order processing
- Easy tracking of individual contributions

## Important Notes

1. **User Authentication Required**: Your POS system MUST use Supabase Auth with `supabase.auth.getUser()` to get the current user
2. **Always Set `updated_by_user_id`**: This is the key field that triggers automatic staff attribution
3. **Backwards Compatible**: Existing orders without staff data will continue to work normally
4. **Future Data Only**: Staff attribution only tracks NEW actions going forward (can't backfill who did what in the past)

## Troubleshooting

### Staff Attribution Not Showing
- Verify `updated_by_user_id` is being set when updating orders
- Check that the user is authenticated with Supabase Auth
- Ensure the status transition is one of the tracked ones (confirmed, prepared, shipped, delivered)

### User Emails Not Displaying
- The dashboard fetches user emails automatically from Supabase Auth
- If you see UUIDs instead of emails, the user might not exist in auth.users table

## Database View for Reporting

Use the `orders_with_staff_attribution` view for advanced reporting:

```sql
SELECT
  order_number,
  status,
  created_by_email,
  prepared_by_email,
  shipped_by_email,
  delivered_by_email
FROM orders_with_staff_attribution
WHERE created_at >= '2025-12-16'
ORDER BY created_at DESC;
```

## Questions?

The system is fully operational and ready for POS integration. The database triggers are already in place - you just need to pass `updated_by_user_id` when creating/updating orders in your POS system.
