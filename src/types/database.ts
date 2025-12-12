export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      vendors: {
        Row: {
          id: string
          store_name: string
          logo_url: string | null
          ecommerce_url: string | null
          free_shipping_enabled: boolean
          free_shipping_threshold: number | null
          default_shipping_cost: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_name: string
          logo_url?: string | null
          ecommerce_url?: string | null
          free_shipping_enabled?: boolean
          free_shipping_threshold?: number | null
          default_shipping_cost?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_name?: string
          logo_url?: string | null
          ecommerce_url?: string | null
          free_shipping_enabled?: boolean
          free_shipping_threshold?: number | null
          default_shipping_cost?: number
          created_at?: string
          updated_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          vendor_id: string
          name: string
          address: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          tax_rate: number
          tax_name: string
          is_primary: boolean
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          name: string
          address?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          tax_rate?: number
          tax_name?: string
          is_primary?: boolean
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          name?: string
          address?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          tax_rate?: number
          tax_name?: string
          is_primary?: boolean
          is_active?: boolean
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          role: string
          vendor_id: string | null
          created_by_user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email: string
          role?: string
          vendor_id?: string | null
          created_by_user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          role?: string
          vendor_id?: string | null
          created_by_user_id?: string | null
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          vendor_id: string
          order_number: string
          order_type: 'walk_in' | 'pickup' | 'delivery' | 'shipping'
          status: string
          payment_status: string
          fulfillment_status: string
          subtotal: number
          tax_amount: number
          discount_amount: number
          total_amount: number
          customer_id: string | null
          pickup_location_id: string | null
          shipping_name: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_state: string | null
          shipping_postal_code: string | null
          tracking_number: string | null
          created_at: string
          completed_at: string | null
          created_by_user_id: string | null
          prepared_at: string | null
          ready_at: string | null
          picked_up_at: string | null
          shipped_at: string | null
          delivered_at: string | null
        }
        Insert: {
          id?: string
          vendor_id: string
          order_number: string
          order_type?: 'walk_in' | 'pickup' | 'delivery' | 'shipping'
          status?: string
          payment_status?: string
          fulfillment_status?: string
          subtotal: number
          tax_amount: number
          discount_amount?: number
          total_amount: number
          customer_id?: string | null
          pickup_location_id?: string | null
          shipping_name?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_postal_code?: string | null
          tracking_number?: string | null
          created_at?: string
          completed_at?: string | null
          created_by_user_id?: string | null
        }
        Update: {
          id?: string
          vendor_id?: string
          order_number?: string
          order_type?: 'walk_in' | 'pickup' | 'delivery' | 'shipping'
          status?: string
          payment_status?: string
          fulfillment_status?: string
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          customer_id?: string | null
          pickup_location_id?: string | null
          shipping_name?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_postal_code?: string | null
          tracking_number?: string | null
          created_at?: string
          completed_at?: string | null
          created_by_user_id?: string | null
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          unit_price: number
          subtotal: number
          tax_amount: number
          discount_amount: number
          tier_name: string | null
          location_id: string | null
          fulfillment_status: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          quantity: number
          unit_price: number
          subtotal: number
          tax_amount?: number
          discount_amount?: number
          tier_name?: string | null
          location_id?: string | null
          fulfillment_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          unit_price?: number
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          tier_name?: string | null
          location_id?: string | null
          fulfillment_status?: string
          created_at?: string
        }
      }
      checkout_attempts: {
        Row: {
          id: string
          vendor_id: string
          order_id: string | null
          items: Json
          subtotal: number
          tax_amount: number
          shipping_cost: number
          discount_amount: number
          payment_method: string
          payment_processor: string
          status: 'pending' | 'processing' | 'approved' | 'declined' | 'held_for_review' | 'error' | 'completed'
          processor_response_code: string | null
          processor_transaction_id: string | null
          processor_auth_code: string | null
          processor_error_message: string | null
          staff_reviewed: boolean
          staff_notes: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          vendor_id: string
          order_id?: string | null
          items: Json
          subtotal: number
          tax_amount: number
          shipping_cost?: number
          discount_amount?: number
          payment_method: string
          payment_processor: string
          status?: 'pending' | 'processing' | 'approved' | 'declined' | 'held_for_review' | 'error' | 'completed'
          processor_response_code?: string | null
          processor_transaction_id?: string | null
          processor_auth_code?: string | null
          processor_error_message?: string | null
          staff_reviewed?: boolean
          staff_notes?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          vendor_id?: string
          order_id?: string | null
          items?: Json
          subtotal?: number
          tax_amount?: number
          shipping_cost?: number
          discount_amount?: number
          payment_method?: string
          payment_processor?: string
          status?: 'pending' | 'processing' | 'approved' | 'declined' | 'held_for_review' | 'error' | 'completed'
          processor_response_code?: string | null
          processor_transaction_id?: string | null
          processor_auth_code?: string | null
          processor_error_message?: string | null
          staff_reviewed?: boolean
          staff_notes?: string | null
          created_at?: string
          processed_at?: string | null
        }
      }
      customers: {
        Row: {
          id: string
          vendor_id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          loyalty_points: number
          loyalty_tier: string
          vendor_customer_number: string | null
          date_of_birth: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          loyalty_points?: number
          loyalty_tier?: string
          vendor_customer_number?: string | null
          date_of_birth?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          loyalty_points?: number
          loyalty_tier?: string
          vendor_customer_number?: string | null
          date_of_birth?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          vendor_id: string
          name: string
          sku: string | null
          price: number
          primary_category_id: string | null
          pricing_template_id: string | null
          image_url: string | null
          featured_image: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          name: string
          sku?: string | null
          price: number
          primary_category_id?: string | null
          pricing_template_id?: string | null
          image_url?: string | null
          featured_image?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          name?: string
          sku?: string | null
          price?: number
          primary_category_id?: string | null
          pricing_template_id?: string | null
          image_url?: string | null
          featured_image?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          vendor_id: string
          name: string
          discount_type: 'percentage' | 'fixed' | 'bogo'
          discount_value: number
          apply_to: 'all' | 'categories' | 'products'
          schedule_type: 'always' | 'date_range' | 'recurring'
          max_uses_per_customer: number | null
          max_total_uses: number | null
          current_uses: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          name: string
          discount_type?: 'percentage' | 'fixed' | 'bogo'
          discount_value: number
          apply_to?: 'all' | 'categories' | 'products'
          schedule_type?: 'always' | 'date_range' | 'recurring'
          max_uses_per_customer?: number | null
          max_total_uses?: number | null
          current_uses?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          name?: string
          discount_type?: 'percentage' | 'fixed' | 'bogo'
          discount_value?: number
          apply_to?: 'all' | 'categories' | 'products'
          schedule_type?: 'always' | 'date_range' | 'recurring'
          max_uses_per_customer?: number | null
          max_total_uses?: number | null
          current_uses?: number
          is_active?: boolean
          created_at?: string
        }
      }
      deal_usage: {
        Row: {
          id: string
          deal_id: string
          order_id: string
          customer_id: string | null
          discount_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          order_id: string
          customer_id?: string | null
          discount_amount: number
          created_at?: string
        }
        Update: {
          id?: string
          deal_id?: string
          order_id?: string
          customer_id?: string | null
          discount_amount?: number
          created_at?: string
        }
      }
      loyalty_points: {
        Row: {
          id: string
          customer_id: string
          order_id: string | null
          points: number
          points_earned_from_subtotal: number
          points_earned_from_tax: number
          reason: string
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          order_id?: string | null
          points: number
          points_earned_from_subtotal?: number
          points_earned_from_tax?: number
          reason: string
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          order_id?: string | null
          points?: number
          points_earned_from_subtotal?: number
          points_earned_from_tax?: number
          reason?: string
          reference_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type Order = Tables<'orders'>
export type OrderItem = Tables<'order_items'>
export type Customer = Tables<'customers'>
export type Product = Tables<'products'>
export type Vendor = Tables<'vendors'>
export type Location = Tables<'locations'>
export type Deal = Tables<'deals'>
export type CheckoutAttempt = Tables<'checkout_attempts'>
