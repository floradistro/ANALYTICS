/**
 * Email Service
 * Handles all email operations via Supabase Edge Functions
 *
 * Supports:
 * - Transactional emails (receipts, order confirmations, shipping updates)
 * - Customer notifications (welcome, loyalty, back-in-stock)
 * - Test emails for configuration verification
 */

import { supabase } from '@/lib/supabase'

// =============================================================================
// TYPES
// =============================================================================

export type TemplateSlug =
  | 'receipt'
  | 'order_confirmation'
  | 'order_ready'
  | 'order_shipped'
  | 'welcome'
  | 'password_reset'
  | 'team_invite'
  | 'loyalty_update'
  | 'back_in_stock'
  | 'order_status_update'

export interface StoreEmailSettings {
  id: string
  store_id: string
  from_name: string
  from_email: string
  reply_to?: string
  domain: string
  domain_verified?: boolean
  resend_domain_id?: string
  email_header_image_url?: string
  // Transactional email toggles
  enable_receipts: boolean
  enable_order_confirmations: boolean
  enable_order_updates: boolean
  enable_loyalty_updates: boolean
  enable_password_resets: boolean
  enable_welcome_emails: boolean
  // Marketing email settings
  enable_marketing: boolean
  require_double_opt_in?: boolean
  // Custom content
  signature_html?: string
  unsubscribe_footer_html?: string
  // Alert settings
  slack_webhook_url?: string
  enable_failed_checkout_alerts?: boolean
  failed_checkout_alert_email?: string
  created_at?: string
  updated_at?: string
}

// Backward compatibility alias
export type VendorEmailSettings = StoreEmailSettings

export interface SendEmailParams {
  to: string
  toName?: string
  subject?: string
  templateSlug: TemplateSlug
  data: Record<string, unknown>
  storeId: string
  customerId?: string
  orderId?: string
}

export interface SendEmailResponse {
  success: boolean
  resendId?: string
  error?: string
}

// =============================================================================
// EMAIL SERVICE
// =============================================================================

export class EmailService {
  /**
   * Send email via edge function
   */
  static async send(params: SendEmailParams): Promise<SendEmailResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: params.to,
          toName: params.toName,
          subject: params.subject,
          templateSlug: params.templateSlug,
          data: params.data,
          storeId: params.storeId,
          customerId: params.customerId,
          orderId: params.orderId,
          emailType: 'transactional',
        },
      })

      if (error) {
        console.error('[EmailService] Send error:', error)
        return { success: false, error: error.message }
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Unknown error' }
      }

      return { success: true, resendId: data.resendId }
    } catch (error) {
      console.error('[EmailService] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // ===========================================================================
  // TRANSACTIONAL EMAILS
  // ===========================================================================

  static async sendReceipt(params: {
    storeId: string
    orderId: string
    customerEmail: string
    customerName?: string
    orderNumber: string
    items: Array<{ name: string; quantity: number; price: string }>
    subtotal?: string
    tax?: string
    shipping?: string
    discount?: string
    total: string
    customerId?: string
  }): Promise<SendEmailResponse> {
    return this.send({
      to: params.customerEmail,
      toName: params.customerName,
      templateSlug: 'receipt',
      storeId: params.storeId,
      orderId: params.orderId,
      customerId: params.customerId,
      data: {
        order_number: params.orderNumber,
        items: params.items,
        subtotal: params.subtotal,
        tax_amount: params.tax,
        shipping_cost: params.shipping,
        discount_amount: params.discount,
        total: params.total,
      },
    })
  }

  static async sendOrderConfirmation(params: {
    storeId: string
    orderId: string
    customerEmail: string
    customerName?: string
    orderNumber: string
    items: Array<{ name: string; quantity: number; price: string }>
    total: string
    isPickup: boolean
    pickupLocation?: string
    estimatedTime?: string
    shippingAddress?: string
    customerId?: string
  }): Promise<SendEmailResponse> {
    return this.send({
      to: params.customerEmail,
      toName: params.customerName,
      templateSlug: 'order_confirmation',
      storeId: params.storeId,
      orderId: params.orderId,
      customerId: params.customerId,
      data: {
        customer_name: params.customerName || 'Customer',
        order_number: params.orderNumber,
        items: params.items,
        total: params.total,
        is_pickup: params.isPickup,
        pickup_location: params.pickupLocation,
        estimated_time: params.estimatedTime,
        shipping_address: params.shippingAddress,
      },
    })
  }

  static async sendOrderShipped(params: {
    storeId: string
    orderId: string
    customerEmail: string
    customerName?: string
    orderNumber: string
    shippingAddress: string
    trackingNumber?: string
    trackingUrl?: string
    carrier?: string
    customerId?: string
  }): Promise<SendEmailResponse> {
    return this.send({
      to: params.customerEmail,
      toName: params.customerName,
      templateSlug: 'order_shipped',
      storeId: params.storeId,
      orderId: params.orderId,
      customerId: params.customerId,
      data: {
        customer_name: params.customerName,
        order_number: params.orderNumber,
        shipping_address: params.shippingAddress,
        tracking_number: params.trackingNumber,
        tracking_url: params.trackingUrl,
        carrier: params.carrier,
      },
    })
  }

  // ===========================================================================
  // STORE SETTINGS
  // ===========================================================================

  static async getStoreSettings(storeId: string): Promise<StoreEmailSettings | null> {
    const { data, error } = await supabase
      .from('store_email_settings')
      .select('*')
      .eq('store_id', storeId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      console.error('[EmailService] Error fetching settings:', error)
      return null
    }

    return data
  }

  // Backward compatibility alias
  static async getVendorSettings(storeId: string): Promise<StoreEmailSettings | null> {
    return this.getStoreSettings(storeId)
  }

  static async updateStoreSettings(
    storeId: string,
    settings: Partial<StoreEmailSettings>
  ): Promise<StoreEmailSettings | null> {
    const { data, error } = await supabase
      .from('store_email_settings')
      .upsert(
        { store_id: storeId, ...settings, updated_at: new Date().toISOString() },
        { onConflict: 'store_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[EmailService] Error updating settings:', error)
      return null
    }

    return data
  }

  // Backward compatibility alias
  static async updateVendorSettings(
    storeId: string,
    settings: Partial<StoreEmailSettings>
  ): Promise<StoreEmailSettings | null> {
    return this.updateStoreSettings(storeId, settings)
  }

  // ===========================================================================
  // TEST EMAILS
  // ===========================================================================

  static async sendTestEmail(params: {
    storeId: string
    to: string
    templateSlug?: TemplateSlug
    // Backward compat
    vendorId?: string
  }): Promise<SendEmailResponse> {
    const template = params.templateSlug || 'welcome'
    const storeId = params.storeId || params.vendorId!

    const testData: Record<TemplateSlug, Record<string, unknown>> = {
      receipt: {
        order_number: 'TEST-001',
        items: [
          { name: 'Sample Product', quantity: 2, price: '$39.99' },
          { name: 'Another Item', quantity: 1, price: '$20.00' },
        ],
        subtotal: '$99.98',
        tax_amount: '$8.00',
        total: '$107.98',
      },
      order_confirmation: {
        customer_name: 'Test Customer',
        order_number: 'TEST-001',
        items: [{ name: 'Sample Product', quantity: 1, price: '$49.99' }],
        total: '$54.99',
        is_pickup: true,
        pickup_location: 'Main Store',
        estimated_time: '15 minutes',
      },
      order_ready: {
        order_number: 'TEST-001',
        pickup_location: 'Main Store',
        pickup_address: '123 Test Street',
      },
      order_shipped: {
        customer_name: 'Test Customer',
        order_number: 'TEST-001',
        shipping_address: '123 Test St, City, ST 12345',
        tracking_number: '1Z999AA10123456784',
        carrier: 'UPS',
      },
      welcome: {
        customer_name: 'Test Customer',
      },
      password_reset: {
        customer_name: 'Test Customer',
        reset_url: '#',
      },
      team_invite: {
        name: 'New Team Member',
        first_name: 'New',
        last_name: 'Team Member',
        email: 'newmember@example.com',
        role: 'pos_staff',
        invite_url: '#',
      },
      loyalty_update: {
        customer_name: 'Test Customer',
        action: 'earned',
        points: 150,
        total_points: 1250,
        order_number: 'TEST-001',
      },
      back_in_stock: {
        customer_name: 'Test Customer',
        product_name: 'Sample Product',
        product_url: '#',
      },
      order_status_update: {
        order_number: 'TEST-001',
        status_title: 'Order Update',
        status_message: 'This is a test status update.',
      },
    }

    return this.send({
      to: params.to,
      templateSlug: template,
      storeId: storeId,
      data: testData[template],
    })
  }
}
