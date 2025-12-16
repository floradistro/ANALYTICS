export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ab_test_assignments: {
        Row: {
          assigned_at: string
          id: string
          test_id: string | null
          user_id: string
          variant_id: string | null
        }
        Insert: {
          assigned_at?: string
          id?: string
          test_id?: string | null
          user_id: string
          variant_id?: string | null
        }
        Update: {
          assigned_at?: string
          id?: string
          test_id?: string | null
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_test_assignments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ab_test_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_test_conversions: {
        Row: {
          converted_at: string
          goal_id: string
          id: string
          test_id: string | null
          user_id: string | null
          value: number | null
          variant_id: string | null
        }
        Insert: {
          converted_at?: string
          goal_id: string
          id?: string
          test_id?: string | null
          user_id?: string | null
          value?: number | null
          variant_id?: string | null
        }
        Update: {
          converted_at?: string
          goal_id?: string
          id?: string
          test_id?: string | null
          user_id?: string | null
          value?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_conversions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_test_conversions_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ab_test_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_test_variants: {
        Row: {
          component_overrides: Json | null
          created_at: string
          description: string | null
          id: string
          is_control: boolean | null
          name: string
          test_id: string | null
          traffic_allocation: number
          updated_at: string
        }
        Insert: {
          component_overrides?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_control?: boolean | null
          name: string
          test_id?: string | null
          traffic_allocation?: number
          updated_at?: string
        }
        Update: {
          component_overrides?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_control?: boolean | null
          name?: string
          test_id?: string | null
          traffic_allocation?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_variants_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_tests: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          goals: Json | null
          id: string
          name: string
          start_date: string | null
          status: string
          targeting_rules: Json | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          goals?: Json | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          targeting_rules?: Json | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          goals?: Json | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          targeting_rules?: Json | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_tests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      adjustment_reconciliation_queue: {
        Row: {
          adjustment_id: string | null
          adjustment_type: string | null
          created_at: string | null
          error: string
          error_details: Json | null
          id: string
          location_id: string | null
          product_id: string | null
          quantity_change: number | null
          reason: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          adjustment_id?: string | null
          adjustment_type?: string | null
          created_at?: string | null
          error: string
          error_details?: Json | null
          id?: string
          location_id?: string | null
          product_id?: string | null
          quantity_change?: number | null
          reason?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          adjustment_id?: string | null
          adjustment_type?: string | null
          created_at?: string | null
          error?: string
          error_details?: Json | null
          id?: string
          location_id?: string | null
          product_id?: string | null
          quantity_change?: number | null
          reason?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          affiliate_id: string
          clicked_at: string
          converted: boolean
          converted_at: string | null
          customer_id: string | null
          id: string
          ip_address: unknown
          landing_page: string | null
          order_id: string | null
          referrer_url: string | null
          session_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          vendor_id: string
        }
        Insert: {
          affiliate_id: string
          clicked_at?: string
          converted?: boolean
          converted_at?: string | null
          customer_id?: string | null
          id?: string
          ip_address?: unknown
          landing_page?: string | null
          order_id?: string | null
          referrer_url?: string | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vendor_id: string
        }
        Update: {
          affiliate_id?: string
          clicked_at?: string
          converted?: boolean
          converted_at?: string | null
          customer_id?: string | null
          id?: string
          ip_address?: unknown
          landing_page?: string | null
          order_id?: string | null
          referrer_url?: string | null
          session_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_staff_attribution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_conversions: {
        Row: {
          affiliate_id: string
          approved_at: string | null
          approved_by: string | null
          click_id: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          order_id: string
          order_subtotal: number
          order_total: number
          paid_at: string | null
          payout_id: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          affiliate_id: string
          approved_at?: string | null
          approved_by?: string | null
          click_id?: string | null
          commission_amount: number
          commission_rate: number
          created_at?: string
          id?: string
          order_id: string
          order_subtotal: number
          order_total: number
          paid_at?: string | null
          payout_id?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          affiliate_id?: string
          approved_at?: string | null
          approved_by?: string | null
          click_id?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          order_id?: string
          order_subtotal?: number
          order_total?: number
          paid_at?: string | null
          payout_id?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders_with_staff_attribution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          failure_reason: string | null
          id: string
          notes: string | null
          payment_method: string
          payment_reference: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          notes?: string | null
          payment_method: string
          payment_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_payouts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auth_user_id: string | null
          commission_rate: number
          company_name: string | null
          created_at: string
          customer_discount_rate: number
          customer_discount_type: string
          email: string
          first_name: string
          id: string
          last_name: string
          minimum_payout: number
          notes: string | null
          password_hash: string | null
          payment_details: Json | null
          payment_method: string | null
          pending_commission: number
          phone: string | null
          referral_code: string
          referral_link: string | null
          status: string
          total_clicks: number
          total_commission_earned: number
          total_commission_paid: number
          total_orders: number
          total_revenue: number
          updated_at: string
          vendor_id: string
          website_url: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          auth_user_id?: string | null
          commission_rate?: number
          company_name?: string | null
          created_at?: string
          customer_discount_rate?: number
          customer_discount_type?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          minimum_payout?: number
          notes?: string | null
          password_hash?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          pending_commission?: number
          phone?: string | null
          referral_code: string
          referral_link?: string | null
          status?: string
          total_clicks?: number
          total_commission_earned?: number
          total_commission_paid?: number
          total_orders?: number
          total_revenue?: number
          updated_at?: string
          vendor_id: string
          website_url?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          auth_user_id?: string | null
          commission_rate?: number
          company_name?: string | null
          created_at?: string
          customer_discount_rate?: number
          customer_discount_type?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          minimum_payout?: number
          notes?: string | null
          password_hash?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          pending_commission?: number
          phone?: string | null
          referral_code?: string
          referral_link?: string | null
          status?: string
          total_clicks?: number
          total_commission_earned?: number
          total_commission_paid?: number
          total_orders?: number
          total_revenue?: number
          updated_at?: string
          vendor_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          max_tokens: number | null
          metadata: Json | null
          model: string
          name: string
          provider: string
          status: string | null
          system_prompt: string | null
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          max_tokens?: number | null
          metadata?: Json | null
          model: string
          name: string
          provider?: string
          status?: string | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          max_tokens?: number | null
          metadata?: Json | null
          model?: string
          name?: string
          provider?: string
          status?: string | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_artifact_favorites: {
        Row: {
          artifact_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          artifact_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          artifact_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_artifact_favorites_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "ai_artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_artifacts: {
        Row: {
          artifact_type: string
          code: string
          created_at: string | null
          created_by: string
          description: string | null
          fork_count: number | null
          id: string
          is_global: boolean | null
          language: string
          parent_artifact_id: string | null
          published_at: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          version: number | null
          view_count: number | null
        }
        Insert: {
          artifact_type: string
          code: string
          created_at?: string | null
          created_by: string
          description?: string | null
          fork_count?: number | null
          id?: string
          is_global?: boolean | null
          language: string
          parent_artifact_id?: string | null
          published_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          version?: number | null
          view_count?: number | null
        }
        Update: {
          artifact_type?: string
          code?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          fork_count?: number | null
          id?: string
          is_global?: boolean | null
          language?: string
          parent_artifact_id?: string | null
          published_at?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          version?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_artifacts_parent_artifact_id_fkey"
            columns: ["parent_artifact_id"]
            isOneToOne: false
            referencedRelation: "ai_artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_config: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          max_tokens: number | null
          model: string | null
          provider: string
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          max_tokens?: number | null
          model?: string | null
          provider: string
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          max_tokens?: number | null
          model?: string | null
          provider?: string
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          agent_id: string
          context: Json | null
          created_at: string | null
          id: string
          message_count: number | null
          metadata: Json | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          context?: Json | null
          created_at?: string | null
          id?: string
          message_count?: number | null
          metadata?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          context?: Json | null
          created_at?: string | null
          id?: string
          message_count?: number | null
          metadata?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_layout_performance: {
        Row: {
          avg_view_time_seconds: number | null
          created_at: string | null
          device_id: string
          display_uptime_percentage: number | null
          error_count: number | null
          estimated_conversions: number | null
          id: string
          interaction_rate: number | null
          measured_from: string
          measured_to: string
          recommendation_id: string
        }
        Insert: {
          avg_view_time_seconds?: number | null
          created_at?: string | null
          device_id: string
          display_uptime_percentage?: number | null
          error_count?: number | null
          estimated_conversions?: number | null
          id?: string
          interaction_rate?: number | null
          measured_from: string
          measured_to: string
          recommendation_id: string
        }
        Update: {
          avg_view_time_seconds?: number | null
          created_at?: string | null
          device_id?: string
          display_uptime_percentage?: number | null
          error_count?: number | null
          estimated_conversions?: number | null
          id?: string
          interaction_rate?: number | null
          measured_from?: string
          measured_to?: string
          recommendation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_layout_performance_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "tv_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_layout_performance_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "ai_layout_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_layout_recommendations: {
        Row: {
          ai_type: string
          alternatives: Json | null
          applied_at: string | null
          categories_at_time: string[] | null
          confidence_score: number | null
          created_at: string | null
          customization_tips: string[] | null
          device_id: string
          expires_at: string | null
          id: string
          menu_id: string | null
          product_count_at_time: number | null
          reasoning: string[] | null
          recommended_layout: Json
          user_feedback: string | null
          user_modifications: Json | null
          vendor_id: string
          was_applied: boolean | null
        }
        Insert: {
          ai_type: string
          alternatives?: Json | null
          applied_at?: string | null
          categories_at_time?: string[] | null
          confidence_score?: number | null
          created_at?: string | null
          customization_tips?: string[] | null
          device_id: string
          expires_at?: string | null
          id?: string
          menu_id?: string | null
          product_count_at_time?: number | null
          reasoning?: string[] | null
          recommended_layout: Json
          user_feedback?: string | null
          user_modifications?: Json | null
          vendor_id: string
          was_applied?: boolean | null
        }
        Update: {
          ai_type?: string
          alternatives?: Json | null
          applied_at?: string | null
          categories_at_time?: string[] | null
          confidence_score?: number | null
          created_at?: string | null
          customization_tips?: string[] | null
          device_id?: string
          expires_at?: string | null
          id?: string
          menu_id?: string | null
          product_count_at_time?: number | null
          reasoning?: string[] | null
          recommended_layout?: Json
          user_feedback?: string | null
          user_modifications?: Json | null
          vendor_id?: string
          was_applied?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_layout_recommendations_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "tv_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_layout_recommendations_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "tv_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_layout_recommendations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          model_version: string | null
          role: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_version?: string | null
          role: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_version?: string | null
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_daily_cache: {
        Row: {
          avg_items_per_order: number | null
          avg_order_value: number | null
          avg_quantity_per_order: number | null
          category_breakdown: Json | null
          cost_of_goods: number | null
          created_at: string | null
          date: string
          discount_amount: number | null
          gross_margin: number | null
          gross_profit: number | null
          gross_sales: number | null
          id: string
          location_id: string | null
          net_sales: number | null
          payment_breakdown: Json | null
          refund_amount: number | null
          subtotal: number | null
          tax_amount: number | null
          tip_amount: number | null
          total_items: number | null
          total_orders: number | null
          total_quantity: number | null
          total_refunds: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          avg_items_per_order?: number | null
          avg_order_value?: number | null
          avg_quantity_per_order?: number | null
          category_breakdown?: Json | null
          cost_of_goods?: number | null
          created_at?: string | null
          date: string
          discount_amount?: number | null
          gross_margin?: number | null
          gross_profit?: number | null
          gross_sales?: number | null
          id?: string
          location_id?: string | null
          net_sales?: number | null
          payment_breakdown?: Json | null
          refund_amount?: number | null
          subtotal?: number | null
          tax_amount?: number | null
          tip_amount?: number | null
          total_items?: number | null
          total_orders?: number | null
          total_quantity?: number | null
          total_refunds?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          avg_items_per_order?: number | null
          avg_order_value?: number | null
          avg_quantity_per_order?: number | null
          category_breakdown?: Json | null
          cost_of_goods?: number | null
          created_at?: string | null
          date?: string
          discount_amount?: number | null
          gross_margin?: number | null
          gross_profit?: number | null
          gross_sales?: number | null
          id?: string
          location_id?: string | null
          net_sales?: number | null
          payment_breakdown?: Json | null
          refund_amount?: number | null
          subtotal?: number | null
          tax_amount?: number | null
          tip_amount?: number | null
          total_items?: number | null
          total_orders?: number | null
          total_quantity?: number | null
          total_refunds?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_cache_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_daily_cache_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_employee_cache: {
        Row: {
          avg_items_per_transaction: number | null
          avg_transaction_value: number | null
          card_processed: number | null
          cash_collected: number | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string | null
          employee_id: string
          gross_margin: number | null
          gross_profit: number | null
          id: string
          location_id: string | null
          period_end: string
          period_start: string
          tips_collected: number | null
          total_discounts: number | null
          total_items: number | null
          total_quantity: number | null
          total_refunds: number | null
          total_sales: number | null
          total_transactions: number | null
          transactions_per_hour: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          avg_items_per_transaction?: number | null
          avg_transaction_value?: number | null
          card_processed?: number | null
          cash_collected?: number | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          employee_id: string
          gross_margin?: number | null
          gross_profit?: number | null
          id?: string
          location_id?: string | null
          period_end: string
          period_start: string
          tips_collected?: number | null
          total_discounts?: number | null
          total_items?: number | null
          total_quantity?: number | null
          total_refunds?: number | null
          total_sales?: number | null
          total_transactions?: number | null
          transactions_per_hour?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          avg_items_per_transaction?: number | null
          avg_transaction_value?: number | null
          card_processed?: number | null
          cash_collected?: number | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string | null
          employee_id?: string
          gross_margin?: number | null
          gross_profit?: number | null
          id?: string
          location_id?: string | null
          period_end?: string
          period_start?: string
          tips_collected?: number | null
          total_discounts?: number | null
          total_items?: number | null
          total_quantity?: number | null
          total_refunds?: number | null
          total_sales?: number | null
          total_transactions?: number | null
          transactions_per_hour?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_employee_cache_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_employee_cache_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_employee_cache_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          channel: string | null
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_name: string
          event_properties: Json | null
          id: string
          latitude: number | null
          longitude: number | null
          region: string | null
          revenue: number | null
          session_id: string | null
          timestamp: string
          user_id: string | null
          utm_campaign: string | null
          utm_source: string | null
          vendor_id: string | null
          visitor_id: string | null
        }
        Insert: {
          channel?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_name: string
          event_properties?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          revenue?: number | null
          session_id?: string | null
          timestamp?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
          vendor_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          channel?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_name?: string
          event_properties?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          region?: string | null
          revenue?: number | null
          session_id?: string | null
          timestamp?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
          vendor_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_product_cache: {
        Row: {
          avg_price: number | null
          cost: number | null
          created_at: string | null
          days_of_inventory: number | null
          discount_given: number | null
          id: string
          location_id: string | null
          margin: number | null
          markdown_percent: number | null
          period_end: string
          period_start: string
          product_id: string
          profit: number | null
          quantity_sold: number | null
          revenue: number | null
          stock_on_hand: number | null
          total_orders: number | null
          turnover_rate: number | null
          units_sold: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          avg_price?: number | null
          cost?: number | null
          created_at?: string | null
          days_of_inventory?: number | null
          discount_given?: number | null
          id?: string
          location_id?: string | null
          margin?: number | null
          markdown_percent?: number | null
          period_end: string
          period_start: string
          product_id: string
          profit?: number | null
          quantity_sold?: number | null
          revenue?: number | null
          stock_on_hand?: number | null
          total_orders?: number | null
          turnover_rate?: number | null
          units_sold?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          avg_price?: number | null
          cost?: number | null
          created_at?: string | null
          days_of_inventory?: number | null
          discount_given?: number | null
          id?: string
          location_id?: string | null
          margin?: number | null
          markdown_percent?: number | null
          period_end?: string
          period_start?: string
          product_id?: string
          profit?: number | null
          quantity_sold?: number | null
          revenue?: number | null
          stock_on_hand?: number | null
          total_orders?: number | null
          turnover_rate?: number | null
          units_sold?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_product_cache_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_product_cache_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_product_cache_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "analytics_product_cache_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "analytics_product_cache_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      app_files: {
        Row: {
          app_id: string
          content: string
          content_hash: string | null
          created_at: string | null
          file_type: string | null
          filepath: string
          id: string
          updated_at: string | null
        }
        Insert: {
          app_id: string
          content: string
          content_hash?: string | null
          created_at?: string | null
          file_type?: string | null
          filepath: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          app_id?: string
          content?: string
          content_hash?: string | null
          created_at?: string | null
          file_type?: string | null
          filepath?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_files_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "vendor_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_templates: {
        Row: {
          app_type: string
          created_at: string | null
          description: string | null
          features: Json | null
          github_template_repo: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_image: string | null
          required_subscription_tier: string | null
          slug: string
        }
        Insert: {
          app_type: string
          created_at?: string | null
          description?: string | null
          features?: Json | null
          github_template_repo?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_image?: string | null
          required_subscription_tier?: string | null
          slug: string
        }
        Update: {
          app_type?: string
          created_at?: string | null
          description?: string | null
          features?: Json | null
          github_template_repo?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_image?: string | null
          required_subscription_tier?: string | null
          slug?: string
        }
        Relationships: []
      }
      business_templates: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          image_url: string | null
          industry_type: string | null
          is_active: boolean | null
          metadata: Json | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          industry_type?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          industry_type?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cache_entries: {
        Row: {
          cache_key: string
          created_at: string
          data: Json
          expires_at: string
          id: string
          tags: string[] | null
          updated_at: string
          version: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string
          data: Json
          expires_at: string
          id?: string
          tags?: string[] | null
          updated_at?: string
          version?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string
          data?: Json
          expires_at?: string
          id?: string
          tags?: string[] | null
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      campaign_channels: {
        Row: {
          campaign_id: string
          channel: string
          content: Json
          created_at: string | null
          id: string
          status: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          campaign_id: string
          channel: string
          content?: Json
          created_at?: string | null
          id?: string
          status?: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          campaign_id?: string
          channel?: string
          content?: Json
          created_at?: string | null
          id?: string
          status?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_channels_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_channels_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          banner_url: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          featured: boolean | null
          featured_image: string | null
          field_visibility: Json | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          meta_description: string | null
          meta_title: string | null
          metadata: Json | null
          name: string
          parent_id: string | null
          product_count: number | null
          slug: string
          source_template_category_id: string | null
          source_template_id: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          featured?: boolean | null
          featured_image?: string | null
          field_visibility?: Json | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          metadata?: Json | null
          name: string
          parent_id?: string | null
          product_count?: number | null
          slug: string
          source_template_category_id?: string | null
          source_template_id?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          featured?: boolean | null
          featured_image?: string | null
          field_visibility?: Json | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          product_count?: number | null
          slug?: string
          source_template_category_id?: string | null
          source_template_id?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "business_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      category_variant_templates: {
        Row: {
          allow_on_demand_conversion: boolean | null
          category_id: string
          conversion_ratio: number
          conversion_unit: string | null
          created_at: string | null
          created_by_user_id: string | null
          description: string | null
          display_order: number | null
          featured_image_url: string | null
          icon: string | null
          id: string
          indicator_icon_url: string | null
          is_active: boolean | null
          metadata: Json | null
          pricing_template_id: string | null
          share_parent_inventory: boolean | null
          thumbnail_url: string | null
          track_separate_inventory: boolean | null
          updated_at: string | null
          variant_name: string
          variant_slug: string
          vendor_id: string
        }
        Insert: {
          allow_on_demand_conversion?: boolean | null
          category_id: string
          conversion_ratio?: number
          conversion_unit?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          display_order?: number | null
          featured_image_url?: string | null
          icon?: string | null
          id?: string
          indicator_icon_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          pricing_template_id?: string | null
          share_parent_inventory?: boolean | null
          thumbnail_url?: string | null
          track_separate_inventory?: boolean | null
          updated_at?: string | null
          variant_name: string
          variant_slug: string
          vendor_id: string
        }
        Update: {
          allow_on_demand_conversion?: boolean | null
          category_id?: string
          conversion_ratio?: number
          conversion_unit?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          description?: string | null
          display_order?: number | null
          featured_image_url?: string | null
          icon?: string | null
          id?: string
          indicator_icon_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          pricing_template_id?: string | null
          share_parent_inventory?: boolean | null
          thumbnail_url?: string | null
          track_separate_inventory?: boolean | null
          updated_at?: string | null
          variant_name?: string
          variant_slug?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_variant_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_variant_templates_pricing_template_id_fkey"
            columns: ["pricing_template_id"]
            isOneToOne: false
            referencedRelation: "pricing_tier_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_variant_templates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_attempts: {
        Row: {
          billing_address: Json | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number | null
          id: string
          ip_address: string | null
          items: Json
          order_id: string | null
          order_number: string | null
          payment_method: string | null
          payment_processor: string | null
          processed_at: string | null
          processor_auth_code: string | null
          processor_error_message: string | null
          processor_response_code: string | null
          processor_transaction_id: string | null
          shipping_address: Json | null
          shipping_cost: number | null
          source: string | null
          staff_notes: string | null
          staff_reviewed: boolean | null
          staff_reviewed_at: string | null
          staff_reviewed_by: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string
          user_agent: string | null
          vendor_id: string
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          ip_address?: string | null
          items: Json
          order_id?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_processor?: string | null
          processed_at?: string | null
          processor_auth_code?: string | null
          processor_error_message?: string | null
          processor_response_code?: string | null
          processor_transaction_id?: string | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          source?: string | null
          staff_notes?: string | null
          staff_reviewed?: boolean | null
          staff_reviewed_at?: string | null
          staff_reviewed_by?: string | null
          status?: string
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          updated_at?: string
          user_agent?: string | null
          vendor_id: string
        }
        Update: {
          billing_address?: Json | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          ip_address?: string | null
          items?: Json
          order_id?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_processor?: string | null
          processed_at?: string | null
          processor_auth_code?: string | null
          processor_error_message?: string | null
          processor_response_code?: string | null
          processor_transaction_id?: string | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          source?: string | null
          staff_notes?: string | null
          staff_reviewed?: boolean | null
          staff_reviewed_at?: string | null
          staff_reviewed_by?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string
          user_agent?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_attempts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_staff_attribution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_attempts_staff_reviewed_by_fkey"
            columns: ["staff_reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_attempts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      coa_metadata: {
        Row: {
          approval_date: string | null
          batch_number: string | null
          cannabinoid_breakdown: Json | null
          client_id: string | null
          created_at: string | null
          date_received: string | null
          date_tested: string | null
          id: string
          lab_director: string | null
          pdf_url: string | null
          product_type: string | null
          qr_code_url: string | null
          sample_id: string
          strain: string
          total_cannabinoids: number | null
          total_cbd: number | null
          total_thc: number | null
          updated_at: string | null
        }
        Insert: {
          approval_date?: string | null
          batch_number?: string | null
          cannabinoid_breakdown?: Json | null
          client_id?: string | null
          created_at?: string | null
          date_received?: string | null
          date_tested?: string | null
          id?: string
          lab_director?: string | null
          pdf_url?: string | null
          product_type?: string | null
          qr_code_url?: string | null
          sample_id: string
          strain: string
          total_cannabinoids?: number | null
          total_cbd?: number | null
          total_thc?: number | null
          updated_at?: string | null
        }
        Update: {
          approval_date?: string | null
          batch_number?: string | null
          cannabinoid_breakdown?: Json | null
          client_id?: string | null
          created_at?: string | null
          date_received?: string | null
          date_tested?: string | null
          id?: string
          lab_director?: string | null
          pdf_url?: string | null
          product_type?: string | null
          qr_code_url?: string | null
          sample_id?: string
          strain?: string
          total_cannabinoids?: number | null
          total_cbd?: number | null
          total_thc?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          created_at: string | null
          customer_id: string | null
          discount_amount: number
          id: string
          order_id: string | null
        }
        Insert: {
          coupon_id: string
          created_at?: string | null
          customer_id?: string | null
          discount_amount: number
          id?: string
          order_id?: string | null
        }
        Update: {
          coupon_id?: string
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number
          id?: string
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_with_staff_attribution"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          allowed_categories: string[] | null
          allowed_emails: string[] | null
          allowed_products: string[] | null
          code: string
          created_at: string | null
          description: string | null
          discount_amount: number
          discount_type: string
          end_date: string | null
          exclude_sale_items: boolean | null
          excluded_categories: string[] | null
          excluded_products: string[] | null
          free_shipping: boolean | null
          id: string
          individual_use: boolean | null
          is_active: boolean | null
          maximum_amount: number | null
          metadata: Json | null
          minimum_amount: number | null
          start_date: string | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          usage_limit_per_user: number | null
        }
        Insert: {
          allowed_categories?: string[] | null
          allowed_emails?: string[] | null
          allowed_products?: string[] | null
          code: string
          created_at?: string | null
          description?: string | null
          discount_amount: number
          discount_type: string
          end_date?: string | null
          exclude_sale_items?: boolean | null
          excluded_categories?: string[] | null
          excluded_products?: string[] | null
          free_shipping?: boolean | null
          id?: string
          individual_use?: boolean | null
          is_active?: boolean | null
          maximum_amount?: number | null
          metadata?: Json | null
          minimum_amount?: number | null
          start_date?: string | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          usage_limit_per_user?: number | null
        }
        Update: {
          allowed_categories?: string[] | null
          allowed_emails?: string[] | null
          allowed_products?: string[] | null
          code?: string
          created_at?: string | null
          description?: string | null
          discount_amount?: number
          discount_type?: string
          end_date?: string | null
          exclude_sale_items?: boolean | null
          excluded_categories?: string[] | null
          excluded_products?: string[] | null
          free_shipping?: boolean | null
          id?: string
          individual_use?: boolean | null
          is_active?: boolean | null
          maximum_amount?: number | null
          metadata?: Json | null
          minimum_amount?: number | null
          start_date?: string | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          usage_limit_per_user?: number | null
        }
        Relationships: []
      }
      custom_kpi_widgets: {
        Row: {
          change: number | null
          change_label: string | null
          created_at: string | null
          data: Json | null
          