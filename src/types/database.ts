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
          id: string
          is_visible: boolean | null
          last_refreshed_at: string | null
          original_prompt: string
          position: number | null
          query: string | null
          subtitle: string | null
          title: string
          updated_at: string | null
          value: string
          vendor_id: string
          visualization: string
        }
        Insert: {
          change?: number | null
          change_label?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_visible?: boolean | null
          last_refreshed_at?: string | null
          original_prompt: string
          position?: number | null
          query?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
          value: string
          vendor_id: string
          visualization?: string
        }
        Update: {
          change?: number | null
          change_label?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_visible?: boolean | null
          last_refreshed_at?: string | null
          original_prompt?: string
          position?: number | null
          query?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
          value?: string
          vendor_id?: string
          visualization?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_kpi_widgets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_activity: {
        Row: {
          activity_type: string
          created_at: string | null
          customer_id: string
          description: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          customer_id: string
          description?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_activity_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_1: string
          address_2: string | null
          city: string
          company: string | null
          country: string | null
          created_at: string | null
          customer_id: string
          delivery_instructions: string | null
          email: string | null
          first_name: string | null
          id: string
          is_default: boolean | null
          label: string | null
          last_name: string | null
          metadata: Json | null
          phone: string | null
          postcode: string
          state: string
          type: string
          updated_at: string | null
        }
        Insert: {
          address_1: string
          address_2?: string | null
          city: string
          company?: string | null
          country?: string | null
          created_at?: string | null
          customer_id: string
          delivery_instructions?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          postcode: string
          state: string
          type: string
          updated_at?: string | null
        }
        Update: {
          address_1?: string
          address_2?: string | null
          city?: string
          company?: string | null
          country?: string | null
          created_at?: string | null
          customer_id?: string
          delivery_instructions?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          postcode?: string
          state?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_email_preferences: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          unsubscribe_reason: string | null
          unsubscribed_at: string | null
          unsubscribed_marketing: boolean | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          unsubscribe_reason?: string | null
          unsubscribed_at?: string | null
          unsubscribed_marketing?: boolean | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          unsubscribe_reason?: string | null
          unsubscribed_at?: string | null
          unsubscribed_marketing?: boolean | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_email_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_email_preferences_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_loyalty: {
        Row: {
          alpineiq_customer_id: string | null
          created_at: string | null
          current_tier: string | null
          customer_id: string
          id: string
          last_earned_at: string | null
          last_purchase_at: string | null
          last_redeemed_at: string | null
          last_synced_at: string | null
          lifetime_points: number | null
          points_balance: number | null
          points_lifetime_earned: number | null
          points_lifetime_redeemed: number | null
          provider: string | null
          tier_level: number | null
          tier_name: string | null
          tier_qualified_at: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          alpineiq_customer_id?: string | null
          created_at?: string | null
          current_tier?: string | null
          customer_id: string
          id?: string
          last_earned_at?: string | null
          last_purchase_at?: string | null
          last_redeemed_at?: string | null
          last_synced_at?: string | null
          lifetime_points?: number | null
          points_balance?: number | null
          points_lifetime_earned?: number | null
          points_lifetime_redeemed?: number | null
          provider?: string | null
          tier_level?: number | null
          tier_name?: string | null
          tier_qualified_at?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          alpineiq_customer_id?: string | null
          created_at?: string | null
          current_tier?: string | null
          customer_id?: string
          id?: string
          last_earned_at?: string | null
          last_purchase_at?: string | null
          last_redeemed_at?: string | null
          last_synced_at?: string | null
          lifetime_points?: number | null
          points_balance?: number | null
          points_lifetime_earned?: number | null
          points_lifetime_redeemed?: number | null
          provider?: string | null
          tier_level?: number | null
          tier_name?: string | null
          tier_qualified_at?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_loyalty_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_metrics: {
        Row: {
          age: number | null
          age_bracket: string | null
          ai_churn_risk: number | null
          ai_next_best_action: string | null
          ai_predicted_ltv: number | null
          ai_tags: Json | null
          average_order_value: number | null
          campaigns_received: number | null
          category_affinity: Json | null
          computed_at: string | null
          created_at: string | null
          customer_id: string
          days_since_first_order: number | null
          days_since_last_order: number | null
          effect_affinity: Json | null
          email_click_rate: number | null
          email_open_rate: number | null
          frequency_score: number | null
          id: string
          is_at_risk: boolean | null
          is_churned: boolean | null
          is_new_customer: boolean | null
          is_vip_customer: boolean | null
          last_email_opened_at: string | null
          monetary_score: number | null
          order_frequency_days: number | null
          pickup_order_count: number | null
          potency_preference: string | null
          preferred_channel: string | null
          preferred_location_id: string | null
          price_tier_preference: string | null
          recency_score: number | null
          reorder_due: boolean | null
          rfm_segment: string | null
          shipping_order_count: number | null
          size_preference: string | null
          strain_affinity: Json | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          age?: number | null
          age_bracket?: string | null
          ai_churn_risk?: number | null
          ai_next_best_action?: string | null
          ai_predicted_ltv?: number | null
          ai_tags?: Json | null
          average_order_value?: number | null
          campaigns_received?: number | null
          category_affinity?: Json | null
          computed_at?: string | null
          created_at?: string | null
          customer_id: string
          days_since_first_order?: number | null
          days_since_last_order?: number | null
          effect_affinity?: Json | null
          email_click_rate?: number | null
          email_open_rate?: number | null
          frequency_score?: number | null
          id?: string
          is_at_risk?: boolean | null
          is_churned?: boolean | null
          is_new_customer?: boolean | null
          is_vip_customer?: boolean | null
          last_email_opened_at?: string | null
          monetary_score?: number | null
          order_frequency_days?: number | null
          pickup_order_count?: number | null
          potency_preference?: string | null
          preferred_channel?: string | null
          preferred_location_id?: string | null
          price_tier_preference?: string | null
          recency_score?: number | null
          reorder_due?: boolean | null
          rfm_segment?: string | null
          shipping_order_count?: number | null
          size_preference?: string | null
          strain_affinity?: Json | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          age?: number | null
          age_bracket?: string | null
          ai_churn_risk?: number | null
          ai_next_best_action?: string | null
          ai_predicted_ltv?: number | null
          ai_tags?: Json | null
          average_order_value?: number | null
          campaigns_received?: number | null
          category_affinity?: Json | null
          computed_at?: string | null
          created_at?: string | null
          customer_id?: string
          days_since_first_order?: number | null
          days_since_last_order?: number | null
          effect_affinity?: Json | null
          email_click_rate?: number | null
          email_open_rate?: number | null
          frequency_score?: number | null
          id?: string
          is_at_risk?: boolean | null
          is_churned?: boolean | null
          is_new_customer?: boolean | null
          is_vip_customer?: boolean | null
          last_email_opened_at?: string | null
          monetary_score?: number | null
          order_frequency_days?: number | null
          pickup_order_count?: number | null
          potency_preference?: string | null
          preferred_channel?: string | null
          preferred_location_id?: string | null
          price_tier_preference?: string | null
          recency_score?: number | null
          reorder_due?: boolean | null
          rfm_segment?: string | null
          shipping_order_count?: number | null
          size_preference?: string | null
          strain_affinity?: Json | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_metrics_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_metrics_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          id: string
          is_customer_visible: boolean | null
          note: string
          note_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          id?: string
          is_customer_visible?: boolean | null
          note: string
          note_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          id?: string
          is_customer_visible?: boolean | null
          note?: string
          note_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segment_memberships: {
        Row: {
          added_at: string | null
          added_by: string | null
          customer_id: string
          id: string
          match_score: number | null
          segment_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          customer_id: string
          id?: string
          match_score?: number | null
          segment_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          customer_id?: string
          id?: string
          match_score?: number | null
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segment_memberships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_segment_memberships_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          ai_description: string | null
          auto_refresh: boolean | null
          color: string | null
          created_at: string | null
          customer_count: number | null
          description: string | null
          filter_criteria: Json
          icon: string | null
          id: string
          is_active: boolean | null
          is_dynamic: boolean | null
          is_system: boolean | null
          last_calculated_at: string | null
          last_refreshed_at: string | null
          name: string
          priority: number | null
          refresh_interval_hours: number | null
          segment_rules: Json
          targeting_tips: Json | null
          type: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          ai_description?: string | null
          auto_refresh?: boolean | null
          color?: string | null
          created_at?: string | null
          customer_count?: number | null
          description?: string | null
          filter_criteria?: Json
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_dynamic?: boolean | null
          is_system?: boolean | null
          last_calculated_at?: string | null
          last_refreshed_at?: string | null
          name: string
          priority?: number | null
          refresh_interval_hours?: number | null
          segment_rules: Json
          targeting_tips?: Json | null
          type?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          ai_description?: string | null
          auto_refresh?: boolean | null
          color?: string | null
          created_at?: string | null
          customer_count?: number | null
          description?: string | null
          filter_criteria?: Json
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_dynamic?: boolean | null
          is_system?: boolean | null
          last_calculated_at?: string | null
          last_refreshed_at?: string | null
          name?: string
          priority?: number | null
          refresh_interval_hours?: number | null
          segment_rules?: Json
          targeting_tips?: Json | null
          type?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_segments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_sessions: {
        Row: {
          conversion_at: string | null
          conversion_order_id: string | null
          converted: boolean | null
          created_at: string | null
          customer_id: string
          expires_at: string | null
          id: string
          ip_address: unknown
          session_end: string | null
          session_start: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          vendor_id: string
        }
        Insert: {
          conversion_at?: string | null
          conversion_order_id?: string | null
          converted?: boolean | null
          created_at?: string | null
          customer_id: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          session_end?: string | null
          session_start?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vendor_id: string
        }
        Update: {
          conversion_at?: string | null
          conversion_order_id?: string | null
          converted?: boolean | null
          created_at?: string | null
          customer_id?: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          session_end?: string | null
          session_start?: string | null
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
            foreignKeyName: "customer_sessions_conversion_order_id_fkey"
            columns: ["conversion_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_sessions_conversion_order_id_fkey"
            columns: ["conversion_order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_sessions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_wallet_passes: {
        Row: {
          authentication_token: string
          created_at: string | null
          customer_id: string
          device_library_identifier: string | null
          device_registered: boolean | null
          device_registered_at: string | null
          id: string
          last_push_at: string | null
          last_updated_at: string | null
          notification_message: string | null
          notification_updated_at: string | null
          pass_data: Json | null
          pass_type: string
          pass_type_identifier: string
          push_token: string | null
          serial_number: string
          vendor_id: string | null
          voided: boolean | null
        }
        Insert: {
          authentication_token: string
          created_at?: string | null
          customer_id: string
          device_library_identifier?: string | null
          device_registered?: boolean | null
          device_registered_at?: string | null
          id?: string
          last_push_at?: string | null
          last_updated_at?: string | null
          notification_message?: string | null
          notification_updated_at?: string | null
          pass_data?: Json | null
          pass_type?: string
          pass_type_identifier?: string
          push_token?: string | null
          serial_number: string
          vendor_id?: string | null
          voided?: boolean | null
        }
        Update: {
          authentication_token?: string
          created_at?: string | null
          customer_id?: string
          device_library_identifier?: string | null
          device_registered?: boolean | null
          device_registered_at?: string | null
          id?: string
          last_push_at?: string | null
          last_updated_at?: string | null
          notification_message?: string | null
          notification_updated_at?: string | null
          pass_data?: Json | null
          pass_type?: string
          pass_type_identifier?: string
          push_token?: string | null
          serial_number?: string
          vendor_id?: string | null
          voided?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_wallet_passes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_wallet_passes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          average_order_value: number | null
          billing_address: Json | null
          city: string | null
          created_at: string | null
          date_of_birth: string | null
          date_registered: string | null
          display_name: string | null
          drivers_license_number: string | null
          email: string | null
          email_notifications: boolean | null
          email_verified: boolean | null
          first_name: string | null
          has_wallet_pass: boolean | null
          id: string
          idempotency_key: string | null
          is_active: boolean | null
          is_paying_customer: boolean | null
          is_verified: boolean | null
          is_wholesale_approved: boolean | null
          last_login_at: string | null
          last_name: string | null
          last_order_date: string | null
          last_purchase_date: string | null
          lifetime_value: number | null
          loyalty_points: number | null
          loyalty_tier: string | null
          marketing_opt_in: boolean | null
          metadata: Json | null
          middle_name: string | null
          phone: string | null
          postal_code: string | null
          preferred_language: string | null
          role: string | null
          shipping_address: Json | null
          sms_notifications: boolean | null
          state: string | null
          street_address: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
          username: string | null
          vendor_id: string | null
          wallet_pass_created_at: string | null
          wholesale_application_status: string | null
          wholesale_approved_at: string | null
          wholesale_approved_by: string | null
          wholesale_business_name: string | null
          wholesale_license_expiry: string | null
          wholesale_license_number: string | null
          wholesale_tax_id: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          average_order_value?: number | null
          billing_address?: Json | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          date_registered?: string | null
          display_name?: string | null
          drivers_license_number?: string | null
          email?: string | null
          email_notifications?: boolean | null
          email_verified?: boolean | null
          first_name?: string | null
          has_wallet_pass?: boolean | null
          id?: string
          idempotency_key?: string | null
          is_active?: boolean | null
          is_paying_customer?: boolean | null
          is_verified?: boolean | null
          is_wholesale_approved?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          last_order_date?: string | null
          last_purchase_date?: string | null
          lifetime_value?: number | null
          loyalty_points?: number | null
          loyalty_tier?: string | null
          marketing_opt_in?: boolean | null
          metadata?: Json | null
          middle_name?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_language?: string | null
          role?: string | null
          shipping_address?: Json | null
          sms_notifications?: boolean | null
          state?: string | null
          street_address?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          username?: string | null
          vendor_id?: string | null
          wallet_pass_created_at?: string | null
          wholesale_application_status?: string | null
          wholesale_approved_at?: string | null
          wholesale_approved_by?: string | null
          wholesale_business_name?: string | null
          wholesale_license_expiry?: string | null
          wholesale_license_number?: string | null
          wholesale_tax_id?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          average_order_value?: number | null
          billing_address?: Json | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          date_registered?: string | null
          display_name?: string | null
          drivers_license_number?: string | null
          email?: string | null
          email_notifications?: boolean | null
          email_verified?: boolean | null
          first_name?: string | null
          has_wallet_pass?: boolean | null
          id?: string
          idempotency_key?: string | null
          is_active?: boolean | null
          is_paying_customer?: boolean | null
          is_verified?: boolean | null
          is_wholesale_approved?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          last_order_date?: string | null
          last_purchase_date?: string | null
          lifetime_value?: number | null
          loyalty_points?: number | null
          loyalty_tier?: string | null
          marketing_opt_in?: boolean | null
          metadata?: Json | null
          middle_name?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_language?: string | null
          role?: string | null
          shipping_address?: Json | null
          sms_notifications?: boolean | null
          state?: string | null
          street_address?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          username?: string | null
          vendor_id?: string | null
          wallet_pass_created_at?: string | null
          wholesale_application_status?: string | null
          wholesale_approved_at?: string | null
          wholesale_approved_by?: string | null
          wholesale_business_name?: string | null
          wholesale_license_expiry?: string | null
          wholesale_license_number?: string | null
          wholesale_tax_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_usage: {
        Row: {
          created_at: string | null
          customer_id: string | null
          deal_id: string
          discount_amount: number
          id: string
          order_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          deal_id: string
          discount_amount: number
          id?: string
          order_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          deal_id?: string
          discount_amount?: number
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_usage_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          application_method: string
          apply_to: string
          apply_to_ids: string[] | null
          badge_color: string | null
          badge_text: string | null
          coupon_code: string | null
          created_at: string | null
          current_uses: number | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          location_ids: string[] | null
          location_scope: string
          max_total_uses: number | null
          max_uses_per_customer: number | null
          name: string
          recurring_pattern: Json | null
          sales_channel: string
          schedule_type: string
          start_date: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          application_method: string
          apply_to: string
          apply_to_ids?: string[] | null
          badge_color?: string | null
          badge_text?: string | null
          coupon_code?: string | null
          created_at?: string | null
          current_uses?: number | null
          discount_type: string
          discount_value: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          location_ids?: string[] | null
          location_scope: string
          max_total_uses?: number | null
          max_uses_per_customer?: number | null
          name: string
          recurring_pattern?: Json | null
          sales_channel?: string
          schedule_type: string
          start_date?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          application_method?: string
          apply_to?: string
          apply_to_ids?: string[] | null
          badge_color?: string | null
          badge_text?: string | null
          coupon_code?: string | null
          created_at?: string | null
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          location_ids?: string[] | null
          location_scope?: string
          max_total_uses?: number | null
          max_uses_per_customer?: number | null
          name?: string
          recurring_pattern?: Json | null
          sales_channel?: string
          schedule_type?: string
          start_date?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      dejavoo_terminal_configs: {
        Row: {
          agent: string | null
          authentication_code: string
          bin: string | null
          chain: string | null
          created_at: string | null
          ebt_fcs_id: string | null
          entitlements: Json | null
          hc_pos_id: string
          id: string
          is_active: boolean | null
          location_id: string
          location_number: string
          manufacturer: string | null
          mcc: string | null
          merchant_aba: string | null
          merchant_id: string
          model: string | null
          payment_processor_id: string | null
          reimbursement_attribute: string | null
          settings: Json | null
          settlement_agent: string | null
          software_version: string | null
          store_number: string
          terminal_number: string
          time_zone: string | null
          tpn: string | null
          updated_at: string | null
          v_number: string
        }
        Insert: {
          agent?: string | null
          authentication_code: string
          bin?: string | null
          chain?: string | null
          created_at?: string | null
          ebt_fcs_id?: string | null
          entitlements?: Json | null
          hc_pos_id: string
          id?: string
          is_active?: boolean | null
          location_id: string
          location_number?: string
          manufacturer?: string | null
          mcc?: string | null
          merchant_aba?: string | null
          merchant_id: string
          model?: string | null
          payment_processor_id?: string | null
          reimbursement_attribute?: string | null
          settings?: Json | null
          settlement_agent?: string | null
          software_version?: string | null
          store_number: string
          terminal_number?: string
          time_zone?: string | null
          tpn?: string | null
          updated_at?: string | null
          v_number: string
        }
        Update: {
          agent?: string | null
          authentication_code?: string
          bin?: string | null
          chain?: string | null
          created_at?: string | null
          ebt_fcs_id?: string | null
          entitlements?: Json | null
          hc_pos_id?: string
          id?: string
          is_active?: boolean | null
          location_id?: string
          location_number?: string
          manufacturer?: string | null
          mcc?: string | null
          merchant_aba?: string | null
          merchant_id?: string
          model?: string | null
          payment_processor_id?: string | null
          reimbursement_attribute?: string | null
          settings?: Json | null
          settlement_agent?: string | null
          software_version?: string | null
          store_number?: string
          terminal_number?: string
          time_zone?: string | null
          tpn?: string | null
          updated_at?: string | null
          v_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "dejavoo_terminal_configs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dejavoo_terminal_configs_payment_processor_id_fkey"
            columns: ["payment_processor_id"]
            isOneToOne: false
            referencedRelation: "payment_processors"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          ai_generated_at: string | null
          ai_prompt: string | null
          channels: string[] | null
          completed_at: string | null
          created_at: string | null
          from_email: string
          from_name: string
          html_content: string | null
          id: string
          metadata: Json | null
          name: string
          objective: string | null
          preview_text: string | null
          reply_to: string | null
          segment_type: string | null
          send_at: string | null
          send_now: boolean | null
          sent_at: string | null
          status: string
          subject: string
          target_audience: Json | null
          template_id: string | null
          text_content: string | null
          timezone: string | null
          total_bounced: number | null
          total_clicked: number | null
          total_complained: number | null
          total_delivered: number | null
          total_engaged: number | null
          total_opened: number | null
          total_recipients: number | null
          total_revenue: number | null
          total_sent: number | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          ai_generated_at?: string | null
          ai_prompt?: string | null
          channels?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          from_email: string
          from_name: string
          html_content?: string | null
          id?: string
          metadata?: Json | null
          name: string
          objective?: string | null
          preview_text?: string | null
          reply_to?: string | null
          segment_type?: string | null
          send_at?: string | null
          send_now?: boolean | null
          sent_at?: string | null
          status?: string
          subject: string
          target_audience?: Json | null
          template_id?: string | null
          text_content?: string | null
          timezone?: string | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_complained?: number | null
          total_delivered?: number | null
          total_engaged?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_revenue?: number | null
          total_sent?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          ai_generated_at?: string | null
          ai_prompt?: string | null
          channels?: string[] | null
          completed_at?: string | null
          created_at?: string | null
          from_email?: string
          from_name?: string
          html_content?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          objective?: string | null
          preview_text?: string | null
          reply_to?: string | null
          segment_type?: string | null
          send_at?: string | null
          send_now?: boolean | null
          sent_at?: string | null
          status?: string
          subject?: string
          target_audience?: Json | null
          template_id?: string | null
          text_content?: string | null
          timezone?: string | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_complained?: number | null
          total_delivered?: number | null
          total_engaged?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_revenue?: number | null
          total_sent?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string | null
          email_send_id: string | null
          event_type: string
          id: string
          ip_address: string | null
          link_url: string | null
          raw_event_data: Json | null
          resend_event_id: string | null
          user_agent: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_send_id?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          raw_event_data?: Json | null
          resend_event_id?: string | null
          user_agent?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_send_id?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          raw_event_data?: Json | null
          resend_event_id?: string | null
          user_agent?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          bounced_at: string | null
          campaign_id: string | null
          clicked_at: string | null
          complained_at: string | null
          created_at: string | null
          customer_id: string | null
          delivered_at: string | null
          email_type: string
          error_message: string | null
          from_email: string
          from_name: string
          id: string
          metadata: Json | null
          opened_at: string | null
          order_id: string | null
          reply_to: string | null
          resend_email_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          to_email: string
          to_name: string | null
          vendor_id: string | null
        }
        Insert: {
          bounced_at?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          complained_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          email_type: string
          error_message?: string | null
          from_email: string
          from_name: string
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          order_id?: string | null
          reply_to?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          to_email: string
          to_name?: string | null
          vendor_id?: string | null
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string | null
          clicked_at?: string | null
          complained_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          email_type?: string
          error_message?: string | null
          from_email?: string
          from_name?: string
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          order_id?: string | null
          reply_to?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          to_email?: string
          to_name?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_configs: {
        Row: {
          approved_style_description: string | null
          art_style: string | null
          base_prompt: string | null
          categories: string[] | null
          created_at: string | null
          description: string | null
          final_prompt: string | null
          format: string | null
          id: string
          include_text: string | null
          is_draft: boolean | null
          is_public: boolean | null
          iterations_count: number | null
          last_used: string | null
          name: string
          reference_images: Json | null
          rejected_style_description: string | null
          success_rate: number | null
          tags: string[] | null
          template_id: string | null
          times_used: number | null
          total_cost: number | null
          total_generated: number | null
          vendor_id: string
        }
        Insert: {
          approved_style_description?: string | null
          art_style?: string | null
          base_prompt?: string | null
          categories?: string[] | null
          created_at?: string | null
          description?: string | null
          final_prompt?: string | null
          format?: string | null
          id?: string
          include_text?: string | null
          is_draft?: boolean | null
          is_public?: boolean | null
          iterations_count?: number | null
          last_used?: string | null
          name: string
          reference_images?: Json | null
          rejected_style_description?: string | null
          success_rate?: number | null
          tags?: string[] | null
          template_id?: string | null
          times_used?: number | null
          total_cost?: number | null
          total_generated?: number | null
          vendor_id: string
        }
        Update: {
          approved_style_description?: string | null
          art_style?: string | null
          base_prompt?: string | null
          categories?: string[] | null
          created_at?: string | null
          description?: string | null
          final_prompt?: string | null
          format?: string | null
          id?: string
          include_text?: string | null
          is_draft?: boolean | null
          is_public?: boolean | null
          iterations_count?: number | null
          last_used?: string | null
          name?: string
          reference_images?: Json | null
          rejected_style_description?: string | null
          success_rate?: number | null
          tags?: string[] | null
          template_id?: string | null
          times_used?: number | null
          total_cost?: number | null
          total_generated?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_configs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          available_quantity: number | null
          average_cost: number | null
          created_at: string | null
          id: string
          in_transit_quantity: number | null
          location_id: string
          low_stock_threshold: number | null
          metadata: Json | null
          notes: string | null
          product_id: string | null
          quantity: number
          reorder_point: number | null
          reserved_quantity: number | null
          stock_status: string | null
          unit_cost: number | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          available_quantity?: number | null
          average_cost?: number | null
          created_at?: string | null
          id?: string
          in_transit_quantity?: number | null
          location_id: string
          low_stock_threshold?: number | null
          metadata?: Json | null
          notes?: string | null
          product_id?: string | null
          quantity?: number
          reorder_point?: number | null
          reserved_quantity?: number | null
          stock_status?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          available_quantity?: number | null
          average_cost?: number | null
          created_at?: string | null
          id?: string
          in_transit_quantity?: number | null
          location_id?: string
          low_stock_threshold?: number | null
          metadata?: Json | null
          notes?: string | null
          product_id?: string | null
          quantity?: number
          reorder_point?: number | null
          reserved_quantity?: number | null
          stock_status?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          adjustment_type: string
          created_at: string
          created_by: string | null
          created_by_user_id: string | null
          id: string
          idempotency_key: string | null
          location_id: string
          notes: string | null
          product_id: string
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: string
          reference_id: string | null
          reference_type: string | null
          vendor_id: string
        }
        Insert: {
          adjustment_type: string
          created_at?: string
          created_by?: string | null
          created_by_user_id?: string | null
          id?: string
          idempotency_key?: string | null
          location_id: string
          notes?: string | null
          product_id: string
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          vendor_id: string
        }
        Update: {
          adjustment_type?: string
          created_at?: string
          created_by?: string | null
          created_by_user_id?: string | null
          id?: string
          idempotency_key?: string | null
          location_id?: string
          notes?: string | null
          product_id?: string
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_adjustments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_conversions: {
        Row: {
          conversion_ratio: number
          created_at: string | null
          from_inventory_id: string
          from_product_id: string
          id: string
          location_id: string
          metadata: Json | null
          notes: string | null
          order_id: string | null
          performed_by_user_id: string | null
          quantity_consumed: number
          quantity_produced: number
          to_product_id: string
          to_variant_id: string | null
          vendor_id: string
        }
        Insert: {
          conversion_ratio: number
          created_at?: string | null
          from_inventory_id: string
          from_product_id: string
          id?: string
          location_id: string
          metadata?: Json | null
          notes?: string | null
          order_id?: string | null
          performed_by_user_id?: string | null
          quantity_consumed: number
          quantity_produced: number
          to_product_id: string
          to_variant_id?: string | null
          vendor_id: string
        }
        Update: {
          conversion_ratio?: number
          created_at?: string | null
          from_inventory_id?: string
          from_product_id?: string
          id?: string
          location_id?: string
          metadata?: Json | null
          notes?: string | null
          order_id?: string | null
          performed_by_user_id?: string | null
          quantity_consumed?: number
          quantity_produced?: number
          to_product_id?: string
          to_variant_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_conversions_from_inventory_id_fkey"
            columns: ["from_inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversions_from_inventory_id_fkey"
            columns: ["from_inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_with_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversions_from_product_id_fkey"
            columns: ["from_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversions_from_product_id_fkey"
            columns: ["from_product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_conversions_from_product_id_fkey"
            columns: ["from_product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_conversions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversions_to_product_id_fkey"
            columns: ["to_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversions_to_product_id_fkey"
            columns: ["to_product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_conversions_to_product_id_fkey"
            columns: ["to_product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_conversions_to_variant_id_fkey"
            columns: ["to_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_conversions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_holds: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          inventory_id: string | null
          location_id: string
          metadata: Json | null
          order_id: string | null
          product_id: string
          quantity: number
          release_reason: string | null
          released_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          id?: string
          inventory_id?: string | null
          location_id: string
          metadata?: Json | null
          order_id?: string | null
          product_id: string
          quantity: number
          release_reason?: string | null
          released_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          inventory_id?: string | null
          location_id?: string
          metadata?: Json | null
          order_id?: string | null
          product_id?: string
          quantity?: number
          release_reason?: string | null
          released_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_holds_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_holds_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_with_holds"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reconciliation_queue: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          items: Json
          order_id: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          items: Json
          order_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          items?: Json
          order_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reconciliation_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reconciliation_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reservations: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          location_id: string
          product_id: string
          quantity: number
          reference_id: string
          reservation_type: string
          status: string | null
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          location_id: string
          product_id: string
          quantity: number
          reference_id: string
          reservation_type: string
          status?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          location_id?: string
          product_id?: string
          quantity?: number
          reference_id?: string
          reservation_type?: string
          status?: string | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          id: string
          inventory_id: string
          is_reversed: boolean | null
          location_id: string
          metadata: Json | null
          performed_by_name: string | null
          performed_by_user_id: string | null
          product_id: string
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          reversed_by_transaction_id: string | null
          transaction_type: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_id: string
          is_reversed?: boolean | null
          location_id: string
          metadata?: Json | null
          performed_by_name?: string | null
          performed_by_user_id?: string | null
          product_id: string
          quantity_after?: number
          quantity_before?: number
          quantity_change: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          reversed_by_transaction_id?: string | null
          transaction_type: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_id?: string
          is_reversed?: boolean | null
          location_id?: string
          metadata?: Json | null
          performed_by_name?: string | null
          performed_by_user_id?: string | null
          product_id?: string
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          reversed_by_transaction_id?: string | null
          transaction_type?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_with_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_performed_by_user_id_fkey"
            columns: ["performed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_transactions_reversed_by_transaction_id_fkey"
            columns: ["reversed_by_transaction_id"]
            isOneToOne: false
            referencedRelation: "inventory_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfer_items: {
        Row: {
          condition: string | null
          condition_notes: string | null
          created_at: string
          id: string
          product_id: string
          quantity: number
          received_quantity: number | null
          transfer_id: string
          updated_at: string
        }
        Insert: {
          condition?: string | null
          condition_notes?: string | null
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          received_quantity?: number | null
          transfer_id: string
          updated_at?: string
        }
        Update: {
          condition?: string | null
          condition_notes?: string | null
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          received_quantity?: number | null
          transfer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfers: {
        Row: {
          approved_by_user_id: string | null
          cancelled_at: string | null
          cancelled_by_user_id: string | null
          created_at: string
          created_by_user_id: string | null
          destination_location_id: string
          id: string
          idempotency_key: string | null
          notes: string | null
          received_at: string | null
          received_by_user_id: string | null
          shipped_at: string | null
          source_location_id: string
          status: string
          tracking_number: string | null
          transfer_number: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          approved_by_user_id?: string | null
          cancelled_at?: string | null
          cancelled_by_user_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          destination_location_id: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          received_at?: string | null
          received_by_user_id?: string | null
          shipped_at?: string | null
          source_location_id: string
          status: string
          tracking_number?: string | null
          transfer_number: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          approved_by_user_id?: string | null
          cancelled_at?: string | null
          cancelled_by_user_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          destination_location_id?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          received_at?: string | null
          received_by_user_id?: string | null
          shipped_at?: string | null
          source_location_id?: string
          status?: string
          tracking_number?: string | null
          transfer_number?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_destination_location_id_fkey"
            columns: ["destination_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_source_location_id_fkey"
            columns: ["source_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      label_templates: {
        Row: {
          config_data: Json
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          location_id: number | null
          name: string
          template_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          config_data?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          location_id?: number | null
          name: string
          template_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          config_data?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          location_id?: number | null
          name?: string
          template_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      location_payment_methods: {
        Row: {
          allow_partial_payments: boolean | null
          allow_tips: boolean | null
          created_at: string | null
          default_processor_id: string | null
          id: string
          is_enabled: boolean | null
          location_id: string
          max_amount: number | null
          method_name: string
          method_type: string
          min_amount: number | null
          processing_fee_fixed: number | null
          processing_fee_percent: number | null
          requires_manager_approval: boolean | null
          requires_processor: boolean | null
          requires_signature: boolean | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          allow_partial_payments?: boolean | null
          allow_tips?: boolean | null
          created_at?: string | null
          default_processor_id?: string | null
          id?: string
          is_enabled?: boolean | null
          location_id: string
          max_amount?: number | null
          method_name: string
          method_type: string
          min_amount?: number | null
          processing_fee_fixed?: number | null
          processing_fee_percent?: number | null
          requires_manager_approval?: boolean | null
          requires_processor?: boolean | null
          requires_signature?: boolean | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          allow_partial_payments?: boolean | null
          allow_tips?: boolean | null
          created_at?: string | null
          default_processor_id?: string | null
          id?: string
          is_enabled?: boolean | null
          location_id?: string
          max_amount?: number | null
          method_name?: string
          method_type?: string
          min_amount?: number | null
          processing_fee_fixed?: number | null
          processing_fee_percent?: number | null
          requires_manager_approval?: boolean | null
          requires_processor?: boolean | null
          requires_signature?: boolean | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_payment_methods_default_processor_id_fkey"
            columns: ["default_processor_id"]
            isOneToOne: false
            referencedRelation: "payment_processors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_payment_methods_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          accepts_online_orders: boolean | null
          accepts_transfers: boolean | null
          address_line1: string | null
          address_line2: string | null
          billing_start_date: string | null
          billing_status: string | null
          business_license: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_primary: boolean | null
          latitude: number | null
          longitude: number | null
          monthly_fee: number | null
          name: string
          phone: string | null
          pos_enabled: boolean | null
          postal_code: string | null
          pricing_tier: string | null
          settings: Json | null
          slug: string
          state: string | null
          tax_id: string | null
          tax_name: string | null
          trial_end_date: string | null
          type: string
          updated_at: string | null
          vendor_id: string | null
          zip: string | null
        }
        Insert: {
          accepts_online_orders?: boolean | null
          accepts_transfers?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          billing_start_date?: string | null
          billing_status?: string | null
          business_license?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_primary?: boolean | null
          latitude?: number | null
          longitude?: number | null
          monthly_fee?: number | null
          name: string
          phone?: string | null
          pos_enabled?: boolean | null
          postal_code?: string | null
          pricing_tier?: string | null
          settings?: Json | null
          slug: string
          state?: string | null
          tax_id?: string | null
          tax_name?: string | null
          trial_end_date?: string | null
          type: string
          updated_at?: string | null
          vendor_id?: string | null
          zip?: string | null
        }
        Update: {
          accepts_online_orders?: boolean | null
          accepts_transfers?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          billing_start_date?: string | null
          billing_status?: string | null
          business_license?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_primary?: boolean | null
          latitude?: number | null
          longitude?: number | null
          monthly_fee?: number | null
          name?: string
          phone?: string | null
          pos_enabled?: boolean | null
          postal_code?: string | null
          pricing_tier?: string | null
          settings?: Json | null
          slug?: string
          state?: string | null
          tax_id?: string | null
          tax_name?: string | null
          trial_end_date?: string | null
          type?: string
          updated_at?: string | null
          vendor_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          allow_points_on_discounted_items: boolean | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          min_redemption_points: number | null
          name: string
          point_value: number | null
          points_expiry_days: number | null
          points_on_tax: boolean | null
          points_per_dollar: number | null
          tiers: Json | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          allow_points_on_discounted_items?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_redemption_points?: number | null
          name?: string
          point_value?: number | null
          points_expiry_days?: number | null
          points_on_tax?: boolean | null
          points_per_dollar?: number | null
          tiers?: Json | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          allow_points_on_discounted_items?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_redemption_points?: number | null
          name?: string
          point_value?: number | null
          points_expiry_days?: number | null
          points_on_tax?: boolean | null
          points_per_dollar?: number | null
          tiers?: Json | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_reconciliation_queue: {
        Row: {
          created_at: string | null
          customer_id: string | null
          error_message: string | null
          id: string
          order_id: string | null
          order_total: number
          points_earned: number
          points_redeemed: number
          resolved: boolean | null
          resolved_at: string | null
          retry_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          order_total: number
          points_earned?: number
          points_redeemed?: number
          resolved?: boolean | null
          resolved_at?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          order_id?: string | null
          order_total?: number
          points_earned?: number
          points_redeemed?: number
          resolved?: boolean | null
          resolved_at?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_reconciliation_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_reconciliation_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_reconciliation_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          balance_after: number | null
          balance_before: number | null
          created_at: string | null
          customer_id: string
          description: string | null
          expires_at: string | null
          id: string
          points: number
          reference_id: string | null
          reference_type: string | null
          transaction_type: string | null
        }
        Insert: {
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          customer_id: string
          description?: string | null
          expires_at?: string | null
          id?: string
          points: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string | null
        }
        Update: {
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          customer_id?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          conditions: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          total_executed: number | null
          total_triggered: number | null
          trigger_event: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          action_config: Json
          action_type: string
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          total_executed?: number | null
          total_triggered?: number | null
          trigger_event: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          total_executed?: number | null
          total_triggered?: number | null
          trigger_event?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_automation_rules_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaign_events: {
        Row: {
          attributed_order_id: string | null
          attributed_revenue: number | null
          campaign_id: string
          campaign_type: string
          channel: string
          created_at: string | null
          customer_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          vendor_id: string
        }
        Insert: {
          attributed_order_id?: string | null
          attributed_revenue?: number | null
          campaign_id: string
          campaign_type: string
          channel: string
          created_at?: string | null
          customer_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          vendor_id: string
        }
        Update: {
          attributed_order_id?: string | null
          attributed_revenue?: number | null
          campaign_id?: string
          campaign_type?: string
          channel?: string
          created_at?: string | null
          customer_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaign_events_attributed_order_id_fkey"
            columns: ["attributed_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaign_events_attributed_order_id_fkey"
            columns: ["attributed_order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaign_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaign_events_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          audience_filter: Json | null
          audience_type: string
          bounced_count: number | null
          clicked_count: number | null
          complained_count: number | null
          content_json: Json
          created_at: string | null
          delivered_count: number | null
          html_content: string | null
          id: string
          name: string
          opened_count: number | null
          preview_text: string | null
          recipient_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          audience_filter?: Json | null
          audience_type?: string
          bounced_count?: number | null
          clicked_count?: number | null
          complained_count?: number | null
          content_json?: Json
          created_at?: string | null
          delivered_count?: number | null
          html_content?: string | null
          id?: string
          name: string
          opened_count?: number | null
          preview_text?: string | null
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          audience_filter?: Json | null
          audience_type?: string
          bounced_count?: number | null
          clicked_count?: number | null
          complained_count?: number | null
          content_json?: Json
          created_at?: string | null
          delivered_count?: number | null
          html_content?: string | null
          id?: string
          name?: string
          opened_count?: number | null
          preview_text?: string | null
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_sends: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          click_count: number | null
          clicked_links: Json | null
          complained_at: string | null
          created_at: string | null
          customer_id: string
          delivered_at: string | null
          first_clicked_at: string | null
          id: string
          opened_at: string | null
          resend_email_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          click_count?: number | null
          clicked_links?: Json | null
          complained_at?: string | null
          created_at?: string | null
          customer_id: string
          delivered_at?: string | null
          first_clicked_at?: string | null
          id?: string
          opened_at?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          click_count?: number | null
          clicked_links?: Json | null
          complained_at?: string | null
          created_at?: string | null
          customer_id?: string
          delivered_at?: string | null
          first_clicked_at?: string | null
          id?: string
          opened_at?: string | null
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_sends_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      media_folders: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_folders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_configs: {
        Row: {
          config_data: Json
          config_type: string | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: number
          is_active: boolean | null
          is_template: boolean | null
          location_id: number | null
          name: string
          parent_version_id: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          config_data: Json
          config_type?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          is_template?: boolean | null
          location_id?: number | null
          name: string
          parent_version_id?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          config_data?: Json
          config_type?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          is_template?: boolean | null
          location_id?: number | null
          name?: string
          parent_version_id?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_configs_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "menu_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_display_logs: {
        Row: {
          config_id: number
          display_duration: number | null
          displayed_at: string | null
          id: string
          ip_address: string | null
          location_id: number | null
          user_agent: string | null
        }
        Insert: {
          config_id: number
          display_duration?: number | null
          displayed_at?: string | null
          id?: string
          ip_address?: string | null
          location_id?: number | null
          user_agent?: string | null
        }
        Update: {
          config_id?: number
          display_duration?: number | null
          displayed_at?: string | null
          id?: string
          ip_address?: string | null
          location_id?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_display_logs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "menu_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_schedules: {
        Row: {
          config_id: number
          created_at: string | null
          day_of_week: number | null
          end_time: string
          id: number
          is_active: boolean | null
          priority: number | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          config_id: number
          created_at?: string | null
          day_of_week?: number | null
          end_time: string
          id?: number
          is_active?: boolean | null
          priority?: number | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          config_id?: number
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string
          id?: number
          is_active?: boolean | null
          priority?: number | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_schedules_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "menu_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ad_sets: {
        Row: {
          bid_amount: number | null
          bid_strategy: string | null
          billing_event: string | null
          clicks: number | null
          conversions: number | null
          created_at: string | null
          daily_budget: number | null
          effective_status: string | null
          end_time: string | null
          id: string
          impressions: number | null
          last_synced_at: string | null
          lifetime_budget: number | null
          meta_ad_set_id: string
          meta_campaign_id: string
          name: string
          optimization_goal: string | null
          reach: number | null
          spend: number | null
          start_time: string | null
          status: string | null
          targeting: Json | null
          vendor_id: string
        }
        Insert: {
          bid_amount?: number | null
          bid_strategy?: string | null
          billing_event?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          daily_budget?: number | null
          effective_status?: string | null
          end_time?: string | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          lifetime_budget?: number | null
          meta_ad_set_id: string
          meta_campaign_id: string
          name: string
          optimization_goal?: string | null
          reach?: number | null
          spend?: number | null
          start_time?: string | null
          status?: string | null
          targeting?: Json | null
          vendor_id: string
        }
        Update: {
          bid_amount?: number | null
          bid_strategy?: string | null
          billing_event?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          daily_budget?: number | null
          effective_status?: string | null
          end_time?: string | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          lifetime_budget?: number | null
          meta_ad_set_id?: string
          meta_campaign_id?: string
          name?: string
          optimization_goal?: string | null
          reach?: number | null
          spend?: number | null
          start_time?: string | null
          status?: string | null
          targeting?: Json | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ad_sets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads: {
        Row: {
          clicks: number | null
          conversions: number | null
          created_at: string | null
          creative: Json | null
          creative_id: string | null
          effective_status: string | null
          id: string
          impressions: number | null
          last_synced_at: string | null
          meta_ad_id: string
          meta_ad_set_id: string
          name: string
          placements: Json | null
          preview_url: string | null
          reach: number | null
          spend: number | null
          status: string | null
          vendor_id: string
        }
        Insert: {
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          creative?: Json | null
          creative_id?: string | null
          effective_status?: string | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          meta_ad_id: string
          meta_ad_set_id: string
          name: string
          placements?: Json | null
          preview_url?: string | null
          reach?: number | null
          spend?: number | null
          status?: string | null
          vendor_id: string
        }
        Update: {
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          creative?: Json | null
          creative_id?: string | null
          effective_status?: string | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          meta_ad_id?: string
          meta_ad_set_id?: string
          name?: string
          placements?: Json | null
          preview_url?: string | null
          reach?: number | null
          spend?: number | null
          status?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_audience_members: {
        Row: {
          added_at: string | null
          audience_id: string
          customer_id: string
          email_hash: string | null
          id: string
          phone_hash: string | null
        }
        Insert: {
          added_at?: string | null
          audience_id: string
          customer_id: string
          email_hash?: string | null
          id?: string
          phone_hash?: string | null
        }
        Update: {
          added_at?: string | null
          audience_id?: string
          customer_id?: string
          email_hash?: string | null
          id?: string
          phone_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_audience_members_audience_id_fkey"
            columns: ["audience_id"]
            isOneToOne: false
            referencedRelation: "meta_audiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_audience_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_audiences: {
        Row: {
          approximate_count: number | null
          audience_type: string | null
          auto_sync: boolean | null
          created_at: string | null
          customer_count: number | null
          description: string | null
          id: string
          last_synced_at: string | null
          lookalike_spec: Json | null
          meta_audience_id: string | null
          name: string
          segment_id: string | null
          subtype: string | null
          sync_error: string | null
          sync_frequency_hours: number | null
          sync_status: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          approximate_count?: number | null
          audience_type?: string | null
          auto_sync?: boolean | null
          created_at?: string | null
          customer_count?: number | null
          description?: string | null
          id?: string
          last_synced_at?: string | null
          lookalike_spec?: Json | null
          meta_audience_id?: string | null
          name: string
          segment_id?: string | null
          subtype?: string | null
          sync_error?: string | null
          sync_frequency_hours?: number | null
          sync_status?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          approximate_count?: number | null
          audience_type?: string | null
          auto_sync?: boolean | null
          created_at?: string | null
          customer_count?: number | null
          description?: string | null
          id?: string
          last_synced_at?: string | null
          lookalike_spec?: Json | null
          meta_audience_id?: string | null
          name?: string
          segment_id?: string | null
          subtype?: string | null
          sync_error?: string | null
          sync_frequency_hours?: number | null
          sync_status?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_audiences_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_audiences_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_campaigns: {
        Row: {
          budget_remaining: number | null
          clicks: number | null
          conversion_value: number | null
          conversions: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          daily_budget: number | null
          effective_status: string | null
          id: string
          impressions: number | null
          last_synced_at: string | null
          lifetime_budget: number | null
          meta_account_id: string
          meta_campaign_id: string
          name: string
          objective: string | null
          raw_insights: Json | null
          reach: number | null
          roas: number | null
          spend: number | null
          start_time: string | null
          status: string | null
          stop_time: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          budget_remaining?: number | null
          clicks?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          daily_budget?: number | null
          effective_status?: string | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          lifetime_budget?: number | null
          meta_account_id: string
          meta_campaign_id: string
          name: string
          objective?: string | null
          raw_insights?: Json | null
          reach?: number | null
          roas?: number | null
          spend?: number | null
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          budget_remaining?: number | null
          clicks?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          daily_budget?: number | null
          effective_status?: string | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          lifetime_budget?: number | null
          meta_account_id?: string
          meta_campaign_id?: string
          name?: string
          objective?: string | null
          raw_insights?: Json | null
          reach?: number | null
          roas?: number | null
          spend?: number | null
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_campaigns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_conversion_events: {
        Row: {
          action_source: string | null
          client_ip_address: string | null
          client_user_agent: string | null
          content_ids: Json | null
          content_type: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          error_message: string | null
          event_id: string
          event_name: string
          event_source_url: string | null
          event_time: string
          events_received: number | null
          fbc: string | null
          fbp: string | null
          fbtrace_id: string | null
          id: string
          messages: Json | null
          num_items: number | null
          order_id: string | null
          retry_count: number | null
          sent_at: string | null
          status: string | null
          user_email_hash: string | null
          user_external_id: string | null
          user_phone_hash: string | null
          value: number | null
          vendor_id: string
        }
        Insert: {
          action_source?: string | null
          client_ip_address?: string | null
          client_user_agent?: string | null
          content_ids?: Json | null
          content_type?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          error_message?: string | null
          event_id: string
          event_name: string
          event_source_url?: string | null
          event_time: string
          events_received?: number | null
          fbc?: string | null
          fbp?: string | null
          fbtrace_id?: string | null
          id?: string
          messages?: Json | null
          num_items?: number | null
          order_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          user_email_hash?: string | null
          user_external_id?: string | null
          user_phone_hash?: string | null
          value?: number | null
          vendor_id: string
        }
        Update: {
          action_source?: string | null
          client_ip_address?: string | null
          client_user_agent?: string | null
          content_ids?: Json | null
          content_type?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          error_message?: string | null
          event_id?: string
          event_name?: string
          event_source_url?: string | null
          event_time?: string
          events_received?: number | null
          fbc?: string | null
          fbp?: string | null
          fbtrace_id?: string | null
          id?: string
          messages?: Json | null
          num_items?: number | null
          order_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          user_email_hash?: string | null
          user_external_id?: string | null
          user_phone_hash?: string | null
          value?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_conversion_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_conversion_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_conversion_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_conversion_events_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_insights_snapshots: {
        Row: {
          actions: Json | null
          clicks: number | null
          conversion_rate: number | null
          conversion_value: number | null
          conversions: number | null
          cpc: number | null
          cpm: number | null
          cpp: number | null
          created_at: string | null
          ctr: number | null
          date_start: string
          date_stop: string
          id: string
          impressions: number | null
          object_id: string
          object_type: string
          raw_data: Json | null
          reach: number | null
          spend: number | null
          vendor_id: string
        }
        Insert: {
          actions?: Json | null
          clicks?: number | null
          conversion_rate?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          cpp?: number | null
          created_at?: string | null
          ctr?: number | null
          date_start: string
          date_stop: string
          id?: string
          impressions?: number | null
          object_id: string
          object_type: string
          raw_data?: Json | null
          reach?: number | null
          spend?: number | null
          vendor_id: string
        }
        Update: {
          actions?: Json | null
          clicks?: number | null
          conversion_rate?: number | null
          conversion_value?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          cpp?: number | null
          created_at?: string | null
          ctr?: number | null
          date_start?: string
          date_stop?: string
          id?: string
          impressions?: number | null
          object_id?: string
          object_type?: string
          raw_data?: Json | null
          reach?: number | null
          spend?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_insights_snapshots_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_integrations: {
        Row: {
          access_token_encrypted: string
          ad_account_id: string | null
          app_id: string
          app_secret_encrypted: string | null
          business_id: string | null
          business_name: string | null
          created_at: string | null
          id: string
          instagram_business_id: string | null
          last_error: string | null
          page_id: string | null
          pixel_id: string | null
          status: string | null
          token_expires_at: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          access_token_encrypted: string
          ad_account_id?: string | null
          app_id: string
          app_secret_encrypted?: string | null
          business_id?: string | null
          business_name?: string | null
          created_at?: string | null
          id?: string
          instagram_business_id?: string | null
          last_error?: string | null
          page_id?: string | null
          pixel_id?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          access_token_encrypted?: string
          ad_account_id?: string | null
          app_id?: string
          app_secret_encrypted?: string | null
          business_id?: string | null
          business_name?: string | null
          created_at?: string | null
          id?: string
          instagram_business_id?: string | null
          last_error?: string | null
          page_id?: string | null
          pixel_id?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_integrations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_posts: {
        Row: {
          comments_count: number | null
          created_at: string | null
          created_time: string | null
          full_picture: string | null
          id: string
          ig_comments_count: number | null
          ig_impressions: number | null
          ig_likes_count: number | null
          ig_reach: number | null
          ig_saved_count: number | null
          is_hidden: boolean | null
          is_published: boolean | null
          last_synced_at: string | null
          likes_count: number | null
          media_type: string | null
          media_url: string | null
          message: string | null
          meta_instagram_id: string | null
          meta_page_id: string | null
          meta_post_id: string
          permalink_url: string | null
          platform: string
          post_type: string | null
          raw_data: Json | null
          reactions_count: number | null
          scheduled_publish_time: string | null
          shares_count: number | null
          story: string | null
          thumbnail_url: string | null
          updated_at: string | null
          updated_time: string | null
          vendor_id: string
          video_avg_time_watched: number | null
          video_views: number | null
        }
        Insert: {
          comments_count?: number | null
          created_at?: string | null
          created_time?: string | null
          full_picture?: string | null
          id?: string
          ig_comments_count?: number | null
          ig_impressions?: number | null
          ig_likes_count?: number | null
          ig_reach?: number | null
          ig_saved_count?: number | null
          is_hidden?: boolean | null
          is_published?: boolean | null
          last_synced_at?: string | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          message?: string | null
          meta_instagram_id?: string | null
          meta_page_id?: string | null
          meta_post_id: string
          permalink_url?: string | null
          platform: string
          post_type?: string | null
          raw_data?: Json | null
          reactions_count?: number | null
          scheduled_publish_time?: string | null
          shares_count?: number | null
          story?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          updated_time?: string | null
          vendor_id: string
          video_avg_time_watched?: number | null
          video_views?: number | null
        }
        Update: {
          comments_count?: number | null
          created_at?: string | null
          created_time?: string | null
          full_picture?: string | null
          id?: string
          ig_comments_count?: number | null
          ig_impressions?: number | null
          ig_likes_count?: number | null
          ig_reach?: number | null
          ig_saved_count?: number | null
          is_hidden?: boolean | null
          is_published?: boolean | null
          last_synced_at?: string | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          message?: string | null
          meta_instagram_id?: string | null
          meta_page_id?: string | null
          meta_post_id?: string
          permalink_url?: string | null
          platform?: string
          post_type?: string | null
          raw_data?: Json | null
          reactions_count?: number | null
          scheduled_publish_time?: string | null
          shares_count?: number | null
          story?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
          updated_time?: string | null
          vendor_id?: string
          video_avg_time_watched?: number | null
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_posts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          cost_per_unit: number | null
          created_at: string | null
          fulfilled_quantity: number | null
          fulfillment_status: string | null
          id: string
          inventory_id: string | null
          line_subtotal: number
          line_total: number
          location_id: string | null
          margin_percentage: number | null
          meta_data: Json | null
          order_id: string
          order_type: string | null
          pickup_location_id: string | null
          pickup_location_name: string | null
          product_id: string | null
          product_image: string | null
          product_name: string
          product_sku: string | null
          product_type: string | null
          profit_per_unit: number | null
          quantity: number
          quantity_display: string | null
          quantity_grams: number | null
          stock_movement_id: string | null
          tax_amount: number | null
          tier_name: string | null
          tier_price: number | null
          tier_qty: number | null
          unit_price: number
          vendor_id: string | null
          vendor_payout_status: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          cost_per_unit?: number | null
          created_at?: string | null
          fulfilled_quantity?: number | null
          fulfillment_status?: string | null
          id?: string
          inventory_id?: string | null
          line_subtotal: number
          line_total: number
          location_id?: string | null
          margin_percentage?: number | null
          meta_data?: Json | null
          order_id: string
          order_type?: string | null
          pickup_location_id?: string | null
          pickup_location_name?: string | null
          product_id?: string | null
          product_image?: string | null
          product_name: string
          product_sku?: string | null
          product_type?: string | null
          profit_per_unit?: number | null
          quantity?: number
          quantity_display?: string | null
          quantity_grams?: number | null
          stock_movement_id?: string | null
          tax_amount?: number | null
          tier_name?: string | null
          tier_price?: number | null
          tier_qty?: number | null
          unit_price: number
          vendor_id?: string | null
          vendor_payout_status?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          cost_per_unit?: number | null
          created_at?: string | null
          fulfilled_quantity?: number | null
          fulfillment_status?: string | null
          id?: string
          inventory_id?: string | null
          line_subtotal?: number
          line_total?: number
          location_id?: string | null
          margin_percentage?: number | null
          meta_data?: Json | null
          order_id?: string
          order_type?: string | null
          pickup_location_id?: string | null
          pickup_location_name?: string | null
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          product_sku?: string | null
          product_type?: string | null
          profit_per_unit?: number | null
          quantity?: number
          quantity_display?: string | null
          quantity_grams?: number | null
          stock_movement_id?: string | null
          tax_amount?: number | null
          tier_name?: string | null
          tier_price?: number | null
          tier_qty?: number | null
          unit_price?: number
          vendor_id?: string | null
          vendor_payout_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_with_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      order_locations: {
        Row: {
          created_at: string | null
          fulfilled_at: string | null
          fulfillment_status: string
          id: string
          item_count: number | null
          location_id: string
          notes: string | null
          order_id: string
          shipped_at: string | null
          shipped_by_user_id: string | null
          shipping_carrier: string | null
          shipping_cost: number | null
          shipping_service: string | null
          total_quantity: number | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fulfilled_at?: string | null
          fulfillment_status?: string
          id?: string
          item_count?: number | null
          location_id: string
          notes?: string | null
          order_id: string
          shipped_at?: string | null
          shipped_by_user_id?: string | null
          shipping_carrier?: string | null
          shipping_cost?: number | null
          shipping_service?: string | null
          total_quantity?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fulfilled_at?: string | null
          fulfillment_status?: string
          id?: string
          item_count?: number | null
          location_id?: string
          notes?: string | null
          order_id?: string
          shipped_at?: string | null
          shipped_by_user_id?: string | null
          shipping_carrier?: string | null
          shipping_cost?: number | null
          shipping_service?: string | null
          total_quantity?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_locations_shipped_by_user_id_fkey"
            columns: ["shipped_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_customer_visible: boolean | null
          note: string
          note_type: string | null
          order_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_customer_visible?: boolean | null
          note: string
          note_type?: string | null
          order_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_customer_visible?: boolean | null
          note?: string
          note_type?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_pass_device_registrations: {
        Row: {
          created_at: string | null
          customer_id: string | null
          device_library_identifier: string
          id: string
          last_push_at: string | null
          order_id: string | null
          pass_type_identifier: string
          push_count: number | null
          push_token: string
          serial_number: string
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          device_library_identifier: string
          id?: string
          last_push_at?: string | null
          order_id?: string | null
          pass_type_identifier?: string
          push_count?: number | null
          push_token: string
          serial_number: string
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          device_library_identifier?: string
          id?: string
          last_push_at?: string | null
          order_id?: string | null
          pass_type_identifier?: string
          push_count?: number | null
          push_token?: string
          serial_number?: string
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_pass_device_registrations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_pass_device_registrations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_pass_device_registrations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_pass_device_registrations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      order_pass_error_logs: {
        Row: {
          id: string
          logs: Json | null
          received_at: string | null
        }
        Insert: {
          id?: string
          logs?: Json | null
          received_at?: string | null
        }
        Update: {
          id?: string
          logs?: Json | null
          received_at?: string | null
        }
        Relationships: []
      }
      order_pass_push_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          customer_id: string | null
          id: string
          last_error: string | null
          max_attempts: number | null
          next_retry_at: string | null
          order_id: string | null
          payload: Json | null
          priority: number | null
          processed_at: string | null
          push_type: string
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          order_id?: string | null
          payload?: Json | null
          priority?: number | null
          processed_at?: string | null
          push_type?: string
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          order_id?: string | null
          payload?: Json | null
          priority?: number | null
          processed_at?: string | null
          push_type?: string
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_pass_push_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_pass_push_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_pass_push_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_pass_push_queue_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      order_passes: {
        Row: {
          authentication_token: string
          created_at: string | null
          customer_id: string | null
          device_library_id: string | null
          id: string
          last_push_at: string | null
          last_updated_at: string | null
          order_id: string
          pass_data: Json | null
          pass_type_identifier: string
          push_enabled: boolean | null
          push_token: string | null
          serial_number: string
          vendor_id: string | null
          voided: boolean | null
          voided_at: string | null
          web_service_url: string | null
        }
        Insert: {
          authentication_token: string
          created_at?: string | null
          customer_id?: string | null
          device_library_id?: string | null
          id?: string
          last_push_at?: string | null
          last_updated_at?: string | null
          order_id: string
          pass_data?: Json | null
          pass_type_identifier?: string
          push_enabled?: boolean | null
          push_token?: string | null
          serial_number: string
          vendor_id?: string | null
          voided?: boolean | null
          voided_at?: string | null
          web_service_url?: string | null
        }
        Update: {
          authentication_token?: string
          created_at?: string | null
          customer_id?: string | null
          device_library_id?: string | null
          id?: string
          last_push_at?: string | null
          last_updated_at?: string | null
          order_id?: string
          pass_data?: Json | null
          pass_type_identifier?: string
          push_enabled?: boolean | null
          push_token?: string | null
          serial_number?: string
          vendor_id?: string | null
          voided?: boolean | null
          voided_at?: string | null
          web_service_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_passes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_passes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_passes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_passes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      order_refunds: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          order_id: string
          refund_amount: number
          refund_date: string | null
          refund_method: string | null
          refund_reason: string | null
          refunded_by: string | null
          transaction_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          refund_amount: number
          refund_date?: string | null
          refund_method?: string | null
          refund_reason?: string | null
          refunded_by?: string | null
          transaction_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          refund_amount?: number
          refund_date?: string | null
          refund_method?: string | null
          refund_reason?: string | null
          refunded_by?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          customer_notified: boolean | null
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          customer_notified?: boolean | null
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          customer_notified?: boolean | null
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tracking_events: {
        Row: {
          created_at: string | null
          id: string
          location: string | null
          message: string | null
          order_id: string
          status: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          message?: string | null
          order_id: string
          status: string
          timestamp: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          message?: string | null
          order_id?: string
          status?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_tracking_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          affiliate_code: string | null
          affiliate_discount_amount: number | null
          affiliate_id: string | null
          billing_address: Json
          cancelled_date: string | null
          card_last_four: string | null
          card_type: string | null
          cart_hash: string | null
          cart_tax: number | null
          completed_at: string | null
          completed_date: string | null
          cost_of_goods: number | null
          created_at: string | null
          created_by_user_id: string | null
          currency: string | null
          customer_id: string | null
          customer_ip_address: unknown
          customer_note: string | null
          customer_user_agent: string | null
          delivered_at: string | null
          delivered_by_user_id: string | null
          delivery_type: string | null
          discount_amount: number | null
          discount_tax: number | null
          employee_id: string | null
          estimated_delivery_date: string | null
          fulfillment_status: string | null
          gross_profit: number | null
          id: string
          idempotency_key: string | null
          internal_notes: string[] | null
          margin_percentage: number | null
          metadata: Json | null
          notified_at: string | null
          order_date: string | null
          order_number: string
          order_type: string
          package_height: number | null
          package_length: number | null
          package_weight: number | null
          package_width: number | null
          paid_date: string | null
          payment_authorization_code: string | null
          payment_data: Json | null
          payment_method: string | null
          payment_method_title: string | null
          payment_status: string | null
          picked_up_at: string | null
          pickup_location_id: string | null
          postage_paid: number | null
          prepared_at: string | null
          prepared_by_user_id: string | null
          processor_reference_id: string | null
          processor_transaction_id: string | null
          ready_at: string | null
          refund_amount: number | null
          shipped_at: string | null
          shipped_by_user_id: string | null
          shipped_date: string | null
          shipping_address: Json | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_amount: number | null
          shipping_carrier: string | null
          shipping_city: string | null
          shipping_cost: number | null
          shipping_country: string | null
          shipping_label_url: string | null
          shipping_method: string | null
          shipping_method_title: string | null
          shipping_name: string | null
          shipping_phone: string | null
          shipping_service: string | null
          shipping_state: string | null
          shipping_tax: number | null
          shipping_zip: string | null
          split_payment_card: number | null
          split_payment_cash: number | null
          staff_notes: string | null
          state_log: Json | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          tracking_number: string | null
          tracking_url: string | null
          transaction_id: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          affiliate_code?: string | null
          affiliate_discount_amount?: number | null
          affiliate_id?: string | null
          billing_address?: Json
          cancelled_date?: string | null
          card_last_four?: string | null
          card_type?: string | null
          cart_hash?: string | null
          cart_tax?: number | null
          completed_at?: string | null
          completed_date?: string | null
          cost_of_goods?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_ip_address?: unknown
          customer_note?: string | null
          customer_user_agent?: string | null
          delivered_at?: string | null
          delivered_by_user_id?: string | null
          delivery_type?: string | null
          discount_amount?: number | null
          discount_tax?: number | null
          employee_id?: string | null
          estimated_delivery_date?: string | null
          fulfillment_status?: string | null
          gross_profit?: number | null
          id?: string
          idempotency_key?: string | null
          internal_notes?: string[] | null
          margin_percentage?: number | null
          metadata?: Json | null
          notified_at?: string | null
          order_date?: string | null
          order_number: string
          order_type: string
          package_height?: number | null
          package_length?: number | null
          package_weight?: number | null
          package_width?: number | null
          paid_date?: string | null
          payment_authorization_code?: string | null
          payment_data?: Json | null
          payment_method?: string | null
          payment_method_title?: string | null
          payment_status?: string | null
          picked_up_at?: string | null
          pickup_location_id?: string | null
          postage_paid?: number | null
          prepared_at?: string | null
          prepared_by_user_id?: string | null
          processor_reference_id?: string | null
          processor_transaction_id?: string | null
          ready_at?: string | null
          refund_amount?: number | null
          shipped_at?: string | null
          shipped_by_user_id?: string | null
          shipped_date?: string | null
          shipping_address?: Json | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_amount?: number | null
          shipping_carrier?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_country?: string | null
          shipping_label_url?: string | null
          shipping_method?: string | null
          shipping_method_title?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_service?: string | null
          shipping_state?: string | null
          shipping_tax?: number | null
          shipping_zip?: string | null
          split_payment_card?: number | null
          split_payment_cash?: number | null
          staff_notes?: string | null
          state_log?: Json | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          tracking_number?: string | null
          tracking_url?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          affiliate_code?: string | null
          affiliate_discount_amount?: number | null
          affiliate_id?: string | null
          billing_address?: Json
          cancelled_date?: string | null
          card_last_four?: string | null
          card_type?: string | null
          cart_hash?: string | null
          cart_tax?: number | null
          completed_at?: string | null
          completed_date?: string | null
          cost_of_goods?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_ip_address?: unknown
          customer_note?: string | null
          customer_user_agent?: string | null
          delivered_at?: string | null
          delivered_by_user_id?: string | null
          delivery_type?: string | null
          discount_amount?: number | null
          discount_tax?: number | null
          employee_id?: string | null
          estimated_delivery_date?: string | null
          fulfillment_status?: string | null
          gross_profit?: number | null
          id?: string
          idempotency_key?: string | null
          internal_notes?: string[] | null
          margin_percentage?: number | null
          metadata?: Json | null
          notified_at?: string | null
          order_date?: string | null
          order_number?: string
          order_type?: string
          package_height?: number | null
          package_length?: number | null
          package_weight?: number | null
          package_width?: number | null
          paid_date?: string | null
          payment_authorization_code?: string | null
          payment_data?: Json | null
          payment_method?: string | null
          payment_method_title?: string | null
          payment_status?: string | null
          picked_up_at?: string | null
          pickup_location_id?: string | null
          postage_paid?: number | null
          prepared_at?: string | null
          prepared_by_user_id?: string | null
          processor_reference_id?: string | null
          processor_transaction_id?: string | null
          ready_at?: string | null
          refund_amount?: number | null
          shipped_at?: string | null
          shipped_by_user_id?: string | null
          shipped_date?: string | null
          shipping_address?: Json | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_amount?: number | null
          shipping_carrier?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_country?: string | null
          shipping_label_url?: string | null
          shipping_method?: string | null
          shipping_method_title?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_service?: string | null
          shipping_state?: string | null
          shipping_tax?: number | null
          shipping_zip?: string | null
          split_payment_card?: number | null
          split_payment_cash?: number | null
          staff_notes?: string | null
          state_log?: Json | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          tracking_number?: string | null
          tracking_url?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivered_by_user_id_fkey"
            columns: ["delivered_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_prepared_by_user_id_fkey"
            columns: ["prepared_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipped_by_user_id_fkey"
            columns: ["shipped_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          created_at: string | null
          id: string
          page_title: string | null
          page_url: string
          scroll_depth: number | null
          session_id: string
          time_on_page: number | null
          vendor_id: string
          visitor_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_title?: string | null
          page_url: string
          scroll_depth?: number | null
          session_id: string
          time_on_page?: number | null
          vendor_id: string
          visitor_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          page_title?: string | null
          page_url?: string
          scroll_depth?: number | null
          session_id?: string
          time_on_page?: number | null
          vendor_id?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_views_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_processors: {
        Row: {
          authorizenet_api_login_id: string | null
          authorizenet_public_client_key: string | null
          authorizenet_signature_key: string | null
          authorizenet_transaction_key: string | null
          clover_api_token: string | null
          clover_merchant_id: string | null
          consecutive_failures: number | null
          created_at: string | null
          created_by: string | null
          dejavoo_authkey: string | null
          dejavoo_merchant_id: string | null
          dejavoo_register_id: string | null
          dejavoo_store_number: string | null
          dejavoo_tpn: string | null
          dejavoo_v_number: string | null
          environment: string
          health_check_error: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_ecommerce_processor: boolean
          is_live: boolean | null
          last_health_check: string | null
          last_health_check_at: string | null
          last_health_check_status: string | null
          last_health_error: string | null
          last_test_error: string | null
          last_test_status: string | null
          last_tested_at: string | null
          location_id: string | null
          processor_name: string
          processor_type: string
          settings: Json | null
          square_access_token: string | null
          square_application_id: string | null
          square_location_id: string | null
          stripe_publishable_key: string | null
          stripe_secret_key: string | null
          stripe_webhook_secret: string | null
          updated_at: string | null
          vendor_id: string
          webhook_url: string | null
        }
        Insert: {
          authorizenet_api_login_id?: string | null
          authorizenet_public_client_key?: string | null
          authorizenet_signature_key?: string | null
          authorizenet_transaction_key?: string | null
          clover_api_token?: string | null
          clover_merchant_id?: string | null
          consecutive_failures?: number | null
          created_at?: string | null
          created_by?: string | null
          dejavoo_authkey?: string | null
          dejavoo_merchant_id?: string | null
          dejavoo_register_id?: string | null
          dejavoo_store_number?: string | null
          dejavoo_tpn?: string | null
          dejavoo_v_number?: string | null
          environment?: string
          health_check_error?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_ecommerce_processor?: boolean
          is_live?: boolean | null
          last_health_check?: string | null
          last_health_check_at?: string | null
          last_health_check_status?: string | null
          last_health_error?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          location_id?: string | null
          processor_name: string
          processor_type: string
          settings?: Json | null
          square_access_token?: string | null
          square_application_id?: string | null
          square_location_id?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          stripe_webhook_secret?: string | null
          updated_at?: string | null
          vendor_id: string
          webhook_url?: string | null
        }
        Update: {
          authorizenet_api_login_id?: string | null
          authorizenet_public_client_key?: string | null
          authorizenet_signature_key?: string | null
          authorizenet_transaction_key?: string | null
          clover_api_token?: string | null
          clover_merchant_id?: string | null
          consecutive_failures?: number | null
          created_at?: string | null
          created_by?: string | null
          dejavoo_authkey?: string | null
          dejavoo_merchant_id?: string | null
          dejavoo_register_id?: string | null
          dejavoo_store_number?: string | null
          dejavoo_tpn?: string | null
          dejavoo_v_number?: string | null
          environment?: string
          health_check_error?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_ecommerce_processor?: boolean
          is_live?: boolean | null
          last_health_check?: string | null
          last_health_check_at?: string | null
          last_health_check_status?: string | null
          last_health_error?: string | null
          last_test_error?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          location_id?: string | null
          processor_name?: string
          processor_type?: string
          settings?: Json | null
          square_access_token?: string | null
          square_application_id?: string | null
          square_location_id?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          stripe_webhook_secret?: string | null
          updated_at?: string | null
          vendor_id?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_processors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_processors_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_processors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          authorization_code: string | null
          callback_received_at: string | null
          card_bin: string | null
          card_last_four: string | null
          card_type: string | null
          cardholder_name: string | null
          created_at: string | null
          detailed_message: string | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          location_id: string | null
          message: string | null
          order_id: string | null
          payment_method: string
          payment_processor_id: string | null
          pos_register_id: string | null
          pos_transaction_id: string | null
          processed_at: string | null
          processor_reference_id: string | null
          processor_transaction_id: string | null
          processor_type: string
          receipt_data: Json | null
          receipt_number: string | null
          reconciled_at: string | null
          request_data: Json | null
          response_data: Json | null
          result_code: string | null
          retry_count: number | null
          spin_detailed_message: string | null
          spin_message: string | null
          spin_result_code: string | null
          spin_status_code: string | null
          status: string
          status_code: string | null
          tip_amount: number | null
          total_amount: number | null
          transaction_type: string
          updated_at: string | null
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          amount: number
          authorization_code?: string | null
          callback_received_at?: string | null
          card_bin?: string | null
          card_last_four?: string | null
          card_type?: string | null
          cardholder_name?: string | null
          created_at?: string | null
          detailed_message?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          message?: string | null
          order_id?: string | null
          payment_method: string
          payment_processor_id?: string | null
          pos_register_id?: string | null
          pos_transaction_id?: string | null
          processed_at?: string | null
          processor_reference_id?: string | null
          processor_transaction_id?: string | null
          processor_type: string
          receipt_data?: Json | null
          receipt_number?: string | null
          reconciled_at?: string | null
          request_data?: Json | null
          response_data?: Json | null
          result_code?: string | null
          retry_count?: number | null
          spin_detailed_message?: string | null
          spin_message?: string | null
          spin_result_code?: string | null
          spin_status_code?: string | null
          status?: string
          status_code?: string | null
          tip_amount?: number | null
          total_amount?: number | null
          transaction_type: string
          updated_at?: string | null
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          amount?: number
          authorization_code?: string | null
          callback_received_at?: string | null
          card_bin?: string | null
          card_last_four?: string | null
          card_type?: string | null
          cardholder_name?: string | null
          created_at?: string | null
          detailed_message?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          message?: string | null
          order_id?: string | null
          payment_method?: string
          payment_processor_id?: string | null
          pos_register_id?: string | null
          pos_transaction_id?: string | null
          processed_at?: string | null
          processor_reference_id?: string | null
          processor_transaction_id?: string | null
          processor_type?: string
          receipt_data?: Json | null
          receipt_number?: string | null
          reconciled_at?: string | null
          request_data?: Json | null
          response_data?: Json | null
          result_code?: string | null
          retry_count?: number | null
          spin_detailed_message?: string | null
          spin_message?: string | null
          spin_result_code?: string | null
          spin_status_code?: string | null
          status?: string
          status_code?: string | null
          tip_amount?: number | null
          total_amount?: number | null
          transaction_type?: string
          updated_at?: string | null
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_payment_processor_id_fkey"
            columns: ["payment_processor_id"]
            isOneToOne: false
            referencedRelation: "payment_processors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_pos_register_id_fkey"
            columns: ["pos_register_id"]
            isOneToOne: false
            referencedRelation: "pos_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_pos_transaction_id_fkey"
            columns: ["pos_transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      po_reconciliation_queue: {
        Row: {
          created_at: string | null
          error: string
          error_details: Json | null
          id: string
          items: Json | null
          po_type: string | null
          purchase_order_id: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          error: string
          error_details?: Json | null
          id?: string
          items?: Json | null
          po_type?: string | null
          purchase_order_id?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          error?: string
          error_details?: Json | null
          id?: string
          items?: Json | null
          po_type?: string | null
          purchase_order_id?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: []
      }
      pos_cash_movements: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          location_id: string
          metadata: Json | null
          movement_type: string
          notes: string | null
          order_id: string | null
          reason: string
          register_id: string | null
          running_balance: number | null
          session_id: string
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          location_id: string
          metadata?: Json | null
          movement_type: string
          notes?: string | null
          order_id?: string | null
          reason: string
          register_id?: string | null
          running_balance?: number | null
          session_id: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          location_id?: string
          metadata?: Json | null
          movement_type?: string
          notes?: string | null
          order_id?: string | null
          reason?: string
          register_id?: string | null
          running_balance?: number | null
          session_id?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_cash_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_cash_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_cash_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_cash_movements_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "pos_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_cash_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_cash_movements_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_cash_movements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_cash_movements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_registers: {
        Row: {
          allow_card: boolean | null
          allow_cash: boolean | null
          allow_refunds: boolean | null
          allow_voids: boolean | null
          created_at: string | null
          current_session_id: string | null
          default_printer_id: string | null
          dejavoo_config_id: string | null
          device_id: string | null
          device_name: string | null
          device_type: string | null
          firmware_version: string | null
          hardware_model: string | null
          id: string
          last_active_at: string | null
          last_ip_address: string | null
          location_id: string
          metadata: Json | null
          notes: string | null
          payment_processor_id: string | null
          processor_type: string | null
          register_name: string
          register_number: string
          require_manager_approval: boolean | null
          serial_number: string | null
          settings: Json | null
          status: string | null
          supports_ebt: boolean | null
          supports_emv: boolean | null
          supports_magstripe: boolean | null
          supports_nfc: boolean | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          allow_card?: boolean | null
          allow_cash?: boolean | null
          allow_refunds?: boolean | null
          allow_voids?: boolean | null
          created_at?: string | null
          current_session_id?: string | null
          default_printer_id?: string | null
          dejavoo_config_id?: string | null
          device_id?: string | null
          device_name?: string | null
          device_type?: string | null
          firmware_version?: string | null
          hardware_model?: string | null
          id?: string
          last_active_at?: string | null
          last_ip_address?: string | null
          location_id: string
          metadata?: Json | null
          notes?: string | null
          payment_processor_id?: string | null
          processor_type?: string | null
          register_name: string
          register_number: string
          require_manager_approval?: boolean | null
          serial_number?: string | null
          settings?: Json | null
          status?: string | null
          supports_ebt?: boolean | null
          supports_emv?: boolean | null
          supports_magstripe?: boolean | null
          supports_nfc?: boolean | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          allow_card?: boolean | null
          allow_cash?: boolean | null
          allow_refunds?: boolean | null
          allow_voids?: boolean | null
          created_at?: string | null
          current_session_id?: string | null
          default_printer_id?: string | null
          dejavoo_config_id?: string | null
          device_id?: string | null
          device_name?: string | null
          device_type?: string | null
          firmware_version?: string | null
          hardware_model?: string | null
          id?: string
          last_active_at?: string | null
          last_ip_address?: string | null
          location_id?: string
          metadata?: Json | null
          notes?: string | null
          payment_processor_id?: string | null
          processor_type?: string | null
          register_name?: string
          register_number?: string
          require_manager_approval?: boolean | null
          serial_number?: string | null
          settings?: Json | null
          status?: string | null
          supports_ebt?: boolean | null
          supports_emv?: boolean | null
          supports_magstripe?: boolean | null
          supports_nfc?: boolean | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_registers_current_session_id_fkey"
            columns: ["current_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_registers_dejavoo_config_id_fkey"
            columns: ["dejavoo_config_id"]
            isOneToOne: false
            referencedRelation: "dejavoo_terminal_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_registers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_registers_payment_processor_id_fkey"
            columns: ["payment_processor_id"]
            isOneToOne: false
            referencedRelation: "payment_processors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_registers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sessions: {
        Row: {
          cash_difference: number | null
          closed_at: string | null
          closing_cash: number | null
          closing_notes: string | null
          created_at: string | null
          expected_cash: number | null
          id: string
          last_transaction_at: string | null
          location_id: string
          metadata: Json | null
          opened_at: string | null
          opening_cash: number | null
          opening_notes: string | null
          pickup_orders_fulfilled: number | null
          register_id: string | null
          session_number: string
          status: string | null
          total_card: number | null
          total_cash: number | null
          total_refunds: number | null
          total_sales: number | null
          total_transactions: number | null
          updated_at: string | null
          user_id: string | null
          vendor_id: string
          walk_in_sales: number | null
        }
        Insert: {
          cash_difference?: number | null
          closed_at?: string | null
          closing_cash?: number | null
          closing_notes?: string | null
          created_at?: string | null
          expected_cash?: number | null
          id?: string
          last_transaction_at?: string | null
          location_id: string
          metadata?: Json | null
          opened_at?: string | null
          opening_cash?: number | null
          opening_notes?: string | null
          pickup_orders_fulfilled?: number | null
          register_id?: string | null
          session_number: string
          status?: string | null
          total_card?: number | null
          total_cash?: number | null
          total_refunds?: number | null
          total_sales?: number | null
          total_transactions?: number | null
          updated_at?: string | null
          user_id?: string | null
          vendor_id: string
          walk_in_sales?: number | null
        }
        Update: {
          cash_difference?: number | null
          closed_at?: string | null
          closing_cash?: number | null
          closing_notes?: string | null
          created_at?: string | null
          expected_cash?: number | null
          id?: string
          last_transaction_at?: string | null
          location_id?: string
          metadata?: Json | null
          opened_at?: string | null
          opening_cash?: number | null
          opening_notes?: string | null
          pickup_orders_fulfilled?: number | null
          register_id?: string | null
          session_number?: string
          status?: string | null
          total_card?: number | null
          total_cash?: number | null
          total_refunds?: number | null
          total_sales?: number | null
          total_transactions?: number | null
          updated_at?: string | null
          user_id?: string | null
          vendor_id?: string
          walk_in_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "pos_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transaction_items: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          id: string
          inventory_id: string | null
          line_total: number
          product_id: number
          quantity: number
          stock_movement_id: string | null
          tax_amount: number | null
          transaction_id: string
          unit_price: number
          vendor_commission: number | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          inventory_id?: string | null
          line_total: number
          product_id: number
          quantity: number
          stock_movement_id?: string | null
          tax_amount?: number | null
          transaction_id: string
          unit_price: number
          vendor_commission?: number | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          inventory_id?: string | null
          line_total?: number
          product_id?: number
          quantity?: number
          stock_movement_id?: string | null
          tax_amount?: number | null
          transaction_id?: string
          unit_price?: number
          vendor_commission?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_transaction_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transaction_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_with_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transaction_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transactions: {
        Row: {
          authorization_code: string | null
          cash_tendered: number | null
          change_given: number | null
          cost_of_goods: number | null
          created_at: string | null
          customer_id: string | null
          discount_amount: number | null
          gross_profit: number | null
          id: string
          location_id: string
          metadata: Json | null
          notes: string | null
          order_id: string | null
          parent_transaction_id: string | null
          payment_method: string | null
          payment_status: string | null
          pos_device_id: string | null
          receipt_number: string | null
          register_id: string | null
          session_id: string | null
          subtotal: number
          tax_amount: number | null
          tip_amount: number | null
          total_amount: number
          transaction_date: string | null
          transaction_number: string
          transaction_type: string
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          authorization_code?: string | null
          cash_tendered?: number | null
          change_given?: number | null
          cost_of_goods?: number | null
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          gross_profit?: number | null
          id?: string
          location_id: string
          metadata?: Json | null
          notes?: string | null
          order_id?: string | null
          parent_transaction_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pos_device_id?: string | null
          receipt_number?: string | null
          register_id?: string | null
          session_id?: string | null
          subtotal: number
          tax_amount?: number | null
          tip_amount?: number | null
          total_amount: number
          transaction_date?: string | null
          transaction_number: string
          transaction_type: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          authorization_code?: string | null
          cash_tendered?: number | null
          change_given?: number | null
          cost_of_goods?: number | null
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          gross_profit?: number | null
          id?: string
          location_id?: string
          metadata?: Json | null
          notes?: string | null
          order_id?: string | null
          parent_transaction_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pos_device_id?: string | null
          receipt_number?: string | null
          register_id?: string | null
          session_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tip_amount?: number | null
          total_amount?: number
          transaction_date?: string | null
          transaction_number?: string
          transaction_type?: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "pos_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tier_templates: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          default_tiers: Json
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          quality_tier: string | null
          slug: string
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          default_tiers?: Json
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          quality_tier?: string | null
          slug: string
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          default_tiers?: Json
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          quality_tier?: string | null
          slug?: string
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_tier_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_tier_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_tier_templates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attribute_terms: {
        Row: {
          attribute_id: string | null
          color_hex: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          attribute_id?: string | null
          color_hex?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          attribute_id?: string | null
          color_hex?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_terms_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          created_at: string | null
          has_archives: boolean | null
          id: string
          name: string
          order_by: string | null
          slug: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          has_archives?: boolean | null
          id?: string
          name: string
          order_by?: string | null
          slug: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          has_archives?: boolean | null
          id?: string
          name?: string
          order_by?: string | null
          slug?: string
          type?: string | null
        }
        Relationships: []
      }
      product_audit: {
        Row: {
          change_type: string
          changed_at: string | null
          changed_by: string | null
          created_at: string | null
          field_name: string | null
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          product_id: string | null
          vendor_id: string
        }
        Insert: {
          change_type: string
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          product_id?: string | null
          vendor_id: string
        }
        Update: {
          change_type?: string
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          product_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_audit_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_audit_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_audit_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          created_at: string | null
          is_primary: boolean | null
          product_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          is_primary?: boolean | null
          product_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          is_primary?: boolean | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_cost_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          new_cost_price: number
          old_cost_price: number | null
          product_id: string
          vendor_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_cost_price: number
          old_cost_price?: number | null
          product_id: string
          vendor_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_cost_price?: number
          old_cost_price?: number | null
          product_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_cost_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cost_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cost_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_cost_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_cost_history_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string | null
          customer_id: string | null
          helpful_count: number | null
          id: string
          metadata: Json | null
          not_helpful_count: number | null
          order_id: string | null
          product_id: string
          rating: number
          responded_at: string | null
          review_images: string[] | null
          review_text: string
          status: string | null
          title: string | null
          updated_at: string | null
          vendor_id: string | null
          vendor_response: string | null
          verified_purchase: boolean | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          helpful_count?: number | null
          id?: string
          metadata?: Json | null
          not_helpful_count?: number | null
          order_id?: string | null
          product_id: string
          rating: number
          responded_at?: string | null
          review_images?: string[] | null
          review_text: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_response?: string | null
          verified_purchase?: boolean | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          helpful_count?: number | null
          id?: string
          metadata?: Json | null
          not_helpful_count?: number | null
          order_id?: string | null
          product_id?: string
          rating?: number
          responded_at?: string | null
          review_images?: string[] | null
          review_text?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_response?: string | null
          verified_purchase?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tag_relationships: {
        Row: {
          product_id: string
          tag_id: string
        }
        Insert: {
          product_id: string
          tag_id: string
        }
        Update: {
          product_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tag_relationships_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tag_relationships_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_tag_relationships_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_tag_relationships_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "product_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          product_count: number | null
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          product_count?: number | null
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          product_count?: number | null
          slug?: string
        }
        Relationships: []
      }
      product_variant_configs: {
        Row: {
          created_at: string | null
          custom_conversion_ratio: number | null
          custom_featured_image_url: string | null
          custom_indicator_icon_url: string | null
          custom_pricing_template_id: string | null
          custom_thumbnail_url: string | null
          id: string
          is_enabled: boolean | null
          metadata: Json | null
          override_share_parent_inventory: boolean | null
          override_track_separate_inventory: boolean | null
          product_id: string
          updated_at: string | null
          variant_template_id: string
        }
        Insert: {
          created_at?: string | null
          custom_conversion_ratio?: number | null
          custom_featured_image_url?: string | null
          custom_indicator_icon_url?: string | null
          custom_pricing_template_id?: string | null
          custom_thumbnail_url?: string | null
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          override_share_parent_inventory?: boolean | null
          override_track_separate_inventory?: boolean | null
          product_id: string
          updated_at?: string | null
          variant_template_id: string
        }
        Update: {
          created_at?: string | null
          custom_conversion_ratio?: number | null
          custom_featured_image_url?: string | null
          custom_indicator_icon_url?: string | null
          custom_pricing_template_id?: string | null
          custom_thumbnail_url?: string | null
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          override_share_parent_inventory?: boolean | null
          override_track_separate_inventory?: boolean | null
          product_id?: string
          updated_at?: string | null
          variant_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variant_configs_custom_pricing_template_id_fkey"
            columns: ["custom_pricing_template_id"]
            isOneToOne: false
            referencedRelation: "pricing_tier_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_configs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_configs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_variant_configs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_variant_configs_variant_template_id_fkey"
            columns: ["variant_template_id"]
            isOneToOne: false
            referencedRelation: "category_variant_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variant_configs_variant_template_id_fkey"
            columns: ["variant_template_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["variant_template_id"]
          },
        ]
      }
      product_variations: {
        Row: {
          attributes: Json
          backorders_allowed: boolean | null
          cost_price: number | null
          created_at: string | null
          height: number | null
          id: string
          image: string | null
          is_active: boolean | null
          length: number | null
          manage_stock: boolean | null
          margin_percentage: number | null
          meta_data: Json | null
          parent_product_id: string
          price: number | null
          regular_price: number | null
          sale_price: number | null
          sku: string | null
          stock_quantity: number | null
          stock_status: string | null
          updated_at: string | null
          weight: number | null
          width: number | null
        }
        Insert: {
          attributes: Json
          backorders_allowed?: boolean | null
          cost_price?: number | null
          created_at?: string | null
          height?: number | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          length?: number | null
          manage_stock?: boolean | null
          margin_percentage?: number | null
          meta_data?: Json | null
          parent_product_id: string
          price?: number | null
          regular_price?: number | null
          sale_price?: number | null
          sku?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          updated_at?: string | null
          weight?: number | null
          width?: number | null
        }
        Update: {
          attributes?: Json
          backorders_allowed?: boolean | null
          cost_price?: number | null
          created_at?: string | null
          height?: number | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          length?: number | null
          manage_stock?: boolean | null
          margin_percentage?: number | null
          meta_data?: Json | null
          parent_product_id?: string
          price?: number | null
          regular_price?: number | null
          sale_price?: number | null
          sku?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          updated_at?: string | null
          weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variations_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_variations_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json | null
          average_rating: number | null
          backorders_allowed: boolean | null
          button_text: string | null
          cost_currency: string | null
          cost_price: number | null
          created_at: string | null
          custom_fields: Json | null
          date_created: string | null
          date_modified: string | null
          date_on_sale_from: string | null
          date_on_sale_to: string | null
          default_attributes: Json | null
          description: string | null
          downloadable: boolean | null
          external_url: string | null
          featured: boolean | null
          featured_image: string | null
          featured_image_storage: string | null
          field_visibility: Json | null
          has_variations: boolean | null
          height: number | null
          id: string
          idempotency_key: string | null
          image_gallery: string[] | null
          image_gallery_storage: string[] | null
          is_wholesale: boolean | null
          length: number | null
          low_stock_amount: number | null
          manage_stock: boolean | null
          margin_percentage: number | null
          meta_data: Json | null
          meta_description: string | null
          meta_keywords: string[] | null
          meta_title: string | null
          minimum_wholesale_quantity: number | null
          name: string
          on_sale: boolean | null
          price: number | null
          pricing_data: Json | null
          pricing_template_id: string | null
          primary_category_id: string | null
          product_visibility: string | null
          rating_count: number | null
          regular_price: number | null
          reviews_allowed: boolean | null
          sale_price: number | null
          sales_count: number | null
          shipping_class: string | null
          short_description: string | null
          sku: string | null
          slug: string
          sold_individually: boolean | null
          status: string | null
          stock_quantity: number | null
          stock_status: string | null
          tax_class: string | null
          tax_status: string | null
          type: string | null
          updated_at: string | null
          variation_ids: string[] | null
          vendor_id: string | null
          view_count: number | null
          virtual: boolean | null
          weight: number | null
          wholesale_only: boolean | null
          wholesale_price: number | null
          width: number | null
        }
        Insert: {
          attributes?: Json | null
          average_rating?: number | null
          backorders_allowed?: boolean | null
          button_text?: string | null
          cost_currency?: string | null
          cost_price?: number | null
          created_at?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_modified?: string | null
          date_on_sale_from?: string | null
          date_on_sale_to?: string | null
          default_attributes?: Json | null
          description?: string | null
          downloadable?: boolean | null
          external_url?: string | null
          featured?: boolean | null
          featured_image?: string | null
          featured_image_storage?: string | null
          field_visibility?: Json | null
          has_variations?: boolean | null
          height?: number | null
          id?: string
          idempotency_key?: string | null
          image_gallery?: string[] | null
          image_gallery_storage?: string[] | null
          is_wholesale?: boolean | null
          length?: number | null
          low_stock_amount?: number | null
          manage_stock?: boolean | null
          margin_percentage?: number | null
          meta_data?: Json | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          minimum_wholesale_quantity?: number | null
          name: string
          on_sale?: boolean | null
          price?: number | null
          pricing_data?: Json | null
          pricing_template_id?: string | null
          primary_category_id?: string | null
          product_visibility?: string | null
          rating_count?: number | null
          regular_price?: number | null
          reviews_allowed?: boolean | null
          sale_price?: number | null
          sales_count?: number | null
          shipping_class?: string | null
          short_description?: string | null
          sku?: string | null
          slug: string
          sold_individually?: boolean | null
          status?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          tax_class?: string | null
          tax_status?: string | null
          type?: string | null
          updated_at?: string | null
          variation_ids?: string[] | null
          vendor_id?: string | null
          view_count?: number | null
          virtual?: boolean | null
          weight?: number | null
          wholesale_only?: boolean | null
          wholesale_price?: number | null
          width?: number | null
        }
        Update: {
          attributes?: Json | null
          average_rating?: number | null
          backorders_allowed?: boolean | null
          button_text?: string | null
          cost_currency?: string | null
          cost_price?: number | null
          created_at?: string | null
          custom_fields?: Json | null
          date_created?: string | null
          date_modified?: string | null
          date_on_sale_from?: string | null
          date_on_sale_to?: string | null
          default_attributes?: Json | null
          description?: string | null
          downloadable?: boolean | null
          external_url?: string | null
          featured?: boolean | null
          featured_image?: string | null
          featured_image_storage?: string | null
          field_visibility?: Json | null
          has_variations?: boolean | null
          height?: number | null
          id?: string
          idempotency_key?: string | null
          image_gallery?: string[] | null
          image_gallery_storage?: string[] | null
          is_wholesale?: boolean | null
          length?: number | null
          low_stock_amount?: number | null
          manage_stock?: boolean | null
          margin_percentage?: number | null
          meta_data?: Json | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          minimum_wholesale_quantity?: number | null
          name?: string
          on_sale?: boolean | null
          price?: number | null
          pricing_data?: Json | null
          pricing_template_id?: string | null
          primary_category_id?: string | null
          product_visibility?: string | null
          rating_count?: number | null
          regular_price?: number | null
          reviews_allowed?: boolean | null
          sale_price?: number | null
          sales_count?: number | null
          shipping_class?: string | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          sold_individually?: boolean | null
          status?: string | null
          stock_quantity?: number | null
          stock_status?: string | null
          tax_class?: string | null
          tax_status?: string | null
          type?: string | null
          updated_at?: string | null
          variation_ids?: string[] | null
          vendor_id?: string | null
          view_count?: number | null
          virtual?: boolean | null
          weight?: number | null
          wholesale_only?: boolean | null
          wholesale_price?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_pricing_template_id_fkey"
            columns: ["pricing_template_id"]
            isOneToOne: false
            referencedRelation: "pricing_tier_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_primary_category_id_fkey"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          badge_color: string | null
          badge_text: string | null
          created_at: string | null
          created_by: string | null
          days_of_week: number[] | null
          description: string | null
          discount_type: string
          discount_value: number
          end_time: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          promotion_type: string
          show_original_price: boolean | null
          start_time: string | null
          target_categories: string[] | null
          target_product_ids: string[] | null
          target_tier_rules: Json | null
          time_of_day_end: string | null
          time_of_day_start: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          badge_color?: string | null
          badge_text?: string | null
          created_at?: string | null
          created_by?: string | null
          days_of_week?: number[] | null
          description?: string | null
          discount_type: string
          discount_value: number
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          promotion_type: string
          show_original_price?: boolean | null
          start_time?: string | null
          target_categories?: string[] | null
          target_product_ids?: string[] | null
          target_tier_rules?: Json | null
          time_of_day_end?: string | null
          time_of_day_start?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          badge_color?: string | null
          badge_text?: string | null
          created_at?: string | null
          created_by?: string | null
          days_of_week?: number[] | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          promotion_type?: string
          show_original_price?: boolean | null
          start_time?: string | null
          target_categories?: string[] | null
          target_product_ids?: string[] | null
          target_tier_rules?: Json | null
          time_of_day_end?: string | null
          time_of_day_start?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          parameters: Json | null
          prompt_text: string
          style: string | null
          updated_at: string | null
          usage_count: number | null
          vendor_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          parameters?: Json | null
          prompt_text: string
          style?: string | null
          updated_at?: string | null
          usage_count?: number | null
          vendor_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          parameters?: Json | null
          prompt_text?: string
          style?: string | null
          updated_at?: string | null
          usage_count?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          condition: string | null
          created_at: string | null
          discount_percent: number | null
          id: string
          notes: string | null
          product_id: string
          purchase_order_id: string
          quality_notes: string | null
          quantity: number
          quantity_fulfilled: number | null
          quantity_remaining: number | null
          receive_status: string | null
          received_quantity: number
          subtotal: number
          tax_rate: number | null
          unit_price: number
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          notes?: string | null
          product_id: string
          purchase_order_id: string
          quality_notes?: string | null
          quantity: number
          quantity_fulfilled?: number | null
          quantity_remaining?: number | null
          receive_status?: string | null
          received_quantity?: number
          subtotal: number
          tax_rate?: number | null
          unit_price: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          discount_percent?: number | null
          id?: string
          notes?: string | null
          product_id?: string
          purchase_order_id?: string
          quality_notes?: string | null
          quantity?: number
          quantity_fulfilled?: number | null
          quantity_remaining?: number | null
          receive_status?: string | null
          received_quantity?: number
          subtotal?: number
          tax_rate?: number | null
          unit_price?: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          purchase_order_id: string
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method: string
          purchase_order_id: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          purchase_order_id?: string
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_payments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_receives: {
        Row: {
          condition: string
          created_at: string | null
          id: string
          inventory_id: string | null
          metadata: Json | null
          notes: string | null
          po_item_id: string
          purchase_order_id: string
          quality_notes: string | null
          quantity_received: number
          received_by: string | null
          received_date: string
          stock_movement_id: string | null
          updated_at: string | null
        }
        Insert: {
          condition?: string
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          metadata?: Json | null
          notes?: string | null
          po_item_id: string
          purchase_order_id: string
          quality_notes?: string | null
          quantity_received: number
          received_by?: string | null
          received_date?: string
          stock_movement_id?: string | null
          updated_at?: string | null
        }
        Update: {
          condition?: string
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          metadata?: Json | null
          notes?: string | null
          po_item_id?: string
          purchase_order_id?: string
          quality_notes?: string | null
          quantity_received?: number
          received_by?: string | null
          received_date?: string
          stock_movement_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_receives_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_receives_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_with_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_receives_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_receives_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_receives_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          cancelled_by_user_id: string | null
          carrier: string | null
          created_at: string | null
          created_by: string | null
          created_by_user_id: string | null
          customer_notes: string | null
          discount: number
          expected_delivery_date: string | null
          fulfilled_at: string | null
          id: string
          idempotency_key: string | null
          internal_notes: string | null
          location_id: string | null
          notes: string | null
          ordered_at: string | null
          payment_due_date: string | null
          payment_status: string | null
          payment_terms: string | null
          po_number: string
          po_type: string
          received_at: string | null
          received_by: string | null
          received_by_user_id: string | null
          received_date: string | null
          shipping_cost: number
          shipping_method: string | null
          status: string
          subtotal: number
          supplier_id: string | null
          tax_amount: number
          total_amount: number
          tracking_number: string | null
          updated_at: string | null
          vendor_id: string
          wholesale_customer_id: string | null
        }
        Insert: {
          cancelled_by_user_id?: string | null
          carrier?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_user_id?: string | null
          customer_notes?: string | null
          discount?: number
          expected_delivery_date?: string | null
          fulfilled_at?: string | null
          id?: string
          idempotency_key?: string | null
          internal_notes?: string | null
          location_id?: string | null
          notes?: string | null
          ordered_at?: string | null
          payment_due_date?: string | null
          payment_status?: string | null
          payment_terms?: string | null
          po_number: string
          po_type: string
          received_at?: string | null
          received_by?: string | null
          received_by_user_id?: string | null
          received_date?: string | null
          shipping_cost?: number
          shipping_method?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string | null
          vendor_id: string
          wholesale_customer_id?: string | null
        }
        Update: {
          cancelled_by_user_id?: string | null
          carrier?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_user_id?: string | null
          customer_notes?: string | null
          discount?: number
          expected_delivery_date?: string | null
          fulfilled_at?: string | null
          id?: string
          idempotency_key?: string | null
          internal_notes?: string | null
          location_id?: string | null
          notes?: string | null
          ordered_at?: string | null
          payment_due_date?: string | null
          payment_status?: string | null
          payment_terms?: string | null
          po_number?: string
          po_type?: string
          received_at?: string | null
          received_by?: string | null
          received_by_user_id?: string | null
          received_date?: string | null
          shipping_cost?: number
          shipping_method?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string | null
          vendor_id?: string
          wholesale_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_wholesale_customer_id_fkey"
            columns: ["wholesale_customer_id"]
            isOneToOne: false
            referencedRelation: "wholesale_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      report_exports: {
        Row: {
          created_at: string | null
          download_count: number | null
          error_message: string | null
          expires_at: string | null
          file_format: string
          file_size_bytes: number | null
          file_url: string | null
          filters: Json | null
          id: string
          last_downloaded_at: string | null
          report_type: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          download_count?: number | null
          error_message?: string | null
          expires_at?: string | null
          file_format: string
          file_size_bytes?: number | null
          file_url?: string | null
          filters?: Json | null
          id?: string
          last_downloaded_at?: string | null
          report_type: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          download_count?: number | null
          error_message?: string | null
          expires_at?: string | null
          file_format?: string
          file_size_bytes?: number | null
          file_url?: string | null
          filters?: Json | null
          id?: string
          last_downloaded_at?: string | null
          report_type?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_exports_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          created_at: string | null
          delivery_config: Json | null
          delivery_method: string
          filters: Json | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          report_type: string
          schedule_config: Json | null
          schedule_type: string
          updated_at: string | null
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_config?: Json | null
          delivery_method?: string
          filters?: Json | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          report_type: string
          schedule_config?: Json | null
          schedule_type: string
          updated_at?: string | null
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          delivery_config?: Json | null
          delivery_method?: string
          filters?: Json | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          report_type?: string
          schedule_config?: Json | null
          schedule_type?: string
          updated_at?: string | null
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_schedules_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      review_votes: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          review_id: string
          vote_type: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          review_id: string
          vote_type?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          review_id?: string
          vote_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_tracking: {
        Row: {
          actual_delivery: string | null
          carrier: string | null
          created_at: string | null
          easypost_tracker_id: string | null
          estimated_delivery: string | null
          events: Json | null
          id: string
          last_location: string | null
          last_update: string | null
          order_id: string | null
          status: string | null
          status_category: string | null
          status_description: string | null
          tracking_number: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          actual_delivery?: string | null
          carrier?: string | null
          created_at?: string | null
          easypost_tracker_id?: string | null
          estimated_delivery?: string | null
          events?: Json | null
          id?: string
          last_location?: string | null
          last_update?: string | null
          order_id?: string | null
          status?: string | null
          status_category?: string | null
          status_description?: string | null
          tracking_number: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          actual_delivery?: string | null
          carrier?: string | null
          created_at?: string | null
          easypost_tracker_id?: string | null
          estimated_delivery?: string | null
          events?: Json | null
          id?: string
          last_location?: string | null
          last_update?: string | null
          order_id?: string | null
          status?: string | null
          status_category?: string | null
          status_description?: string | null
          tracking_number?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_campaigns: {
        Row: {
          cost_per_message: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_mms: boolean | null
          media_url: string | null
          message_body: string
          message_segments: number | null
          name: string
          provider: string | null
          provider_campaign_id: string | null
          scheduled_for: string | null
          segment_id: string | null
          sent_at: string | null
          status: string
          total_clicked: number | null
          total_conversions: number | null
          total_cost: number | null
          total_delivered: number | null
          total_failed: number | null
          total_recipients: number | null
          total_revenue: number | null
          total_sent: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          cost_per_message?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_mms?: boolean | null
          media_url?: string | null
          message_body: string
          message_segments?: number | null
          name: string
          provider?: string | null
          provider_campaign_id?: string | null
          scheduled_for?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          total_clicked?: number | null
          total_conversions?: number | null
          total_cost?: number | null
          total_delivered?: number | null
          total_failed?: number | null
          total_recipients?: number | null
          total_revenue?: number | null
          total_sent?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          cost_per_message?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_mms?: boolean | null
          media_url?: string | null
          message_body?: string
          message_segments?: number | null
          name?: string
          provider?: string | null
          provider_campaign_id?: string | null
          scheduled_for?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          total_clicked?: number | null
          total_conversions?: number | null
          total_cost?: number | null
          total_delivered?: number | null
          total_failed?: number | null
          total_recipients?: number | null
          total_revenue?: number | null
          total_sent?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_campaigns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          id: string
          inventory_id: string | null
          location_id: string
          movement_type: string
          product_id: string
          quantity: number
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
          source_location_id: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          inventory_id?: string | null
          location_id: string
          movement_type: string
          product_id: string
          quantity?: number
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
          source_location_id?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          inventory_id?: string | null
          location_id?: string
          movement_type?: string
          product_id?: string
          quantity?: number
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
          source_location_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory_with_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_movements_source_location_id_fkey"
            columns: ["source_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_items: {
        Row: {
          batch_number: string | null
          created_at: string | null
          id: string
          notes: string | null
          product_id: number
          quantity_received: number | null
          quantity_requested: number
          quantity_shipped: number | null
          transfer_id: string
          unit_cost: number | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id: number
          quantity_received?: number | null
          quantity_requested: number
          quantity_shipped?: number | null
          transfer_id: string
          unit_cost?: number | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: number
          quantity_received?: number | null
          quantity_requested?: number
          quantity_shipped?: number | null
          transfer_id?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          approved_date: string | null
          created_at: string | null
          expected_date: string | null
          from_location_id: string
          id: string
          metadata: Json | null
          notes: string | null
          reason: string | null
          received_date: string | null
          requested_date: string | null
          shipped_date: string | null
          shipping_carrier: string | null
          status: string
          to_location_id: string
          tracking_number: string | null
          transfer_number: string
          updated_at: string | null
        }
        Insert: {
          approved_date?: string | null
          created_at?: string | null
          expected_date?: string | null
          from_location_id: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          reason?: string | null
          received_date?: string | null
          requested_date?: string | null
          shipped_date?: string | null
          shipping_carrier?: string | null
          status?: string
          to_location_id: string
          tracking_number?: string | null
          transfer_number: string
          updated_at?: string | null
        }
        Update: {
          approved_date?: string | null
          created_at?: string | null
          expected_date?: string | null
          from_location_id?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          reason?: string | null
          received_date?: string | null
          requested_date?: string | null
          shipped_date?: string | null
          shipping_carrier?: string | null
          status?: string
          to_location_id?: string
          tracking_number?: string | null
          transfer_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      style_presets: {
        Row: {
          applies_to: string[] | null
          border_radius: Json | null
          category: string | null
          color_palette: Json | null
          created_at: string | null
          description: string | null
          effects: Json | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          name: string
          preview_image: string | null
          spacing_scale: Json | null
          typography: Json | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          applies_to?: string[] | null
          border_radius?: Json | null
          category?: string | null
          color_palette?: Json | null
          created_at?: string | null
          description?: string | null
          effects?: Json | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name: string
          preview_image?: string | null
          spacing_scale?: Json | null
          typography?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          applies_to?: string[] | null
          border_radius?: Json | null
          category?: string | null
          color_palette?: Json | null
          created_at?: string | null
          description?: string | null
          effects?: Json | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name?: string
          preview_image?: string | null
          spacing_scale?: Json | null
          typography?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          external_company: string | null
          external_name: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          payment_terms: string | null
          state: string | null
          supplier_vendor_id: string | null
          tax_id: string | null
          updated_at: string | null
          vendor_id: string
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          external_company?: string | null
          external_name?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payment_terms?: string | null
          state?: string | null
          supplier_vendor_id?: string | null
          tax_id?: string | null
          updated_at?: string | null
          vendor_id: string
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          external_company?: string | null
          external_name?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payment_terms?: string | null
          state?: string | null
          supplier_vendor_id?: string | null
          tax_id?: string | null
          updated_at?: string | null
          vendor_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_supplier_vendor_id_fkey"
            columns: ["supplier_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      template_field_groups: {
        Row: {
          applicable_to_category_slugs: string[] | null
          created_at: string | null
          description: string | null
          display_order: number | null
          fields: Json
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          slug: string
          template_id: string
          updated_at: string | null
        }
        Insert: {
          applicable_to_category_slugs?: string[] | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          slug: string
          template_id: string
          updated_at?: string | null
        }
        Update: {
          applicable_to_category_slugs?: string[] | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          fields?: Json
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          slug?: string
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_field_groups_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "business_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_command_log: {
        Row: {
          command_type: string
          error_message: string | null
          executed_at: string | null
          id: string
          latency_ms: number | null
          payload: Json | null
          success: boolean
          tv_id: string
        }
        Insert: {
          command_type: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          latency_ms?: number | null
          payload?: Json | null
          success: boolean
          tv_id: string
        }
        Update: {
          command_type?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          latency_ms?: number | null
          payload?: Json | null
          success?: boolean
          tv_id?: string
        }
        Relationships: []
      }
      tv_commands: {
        Row: {
          command_type: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          payload: Json | null
          sent_at: string | null
          status: string | null
          tv_id: string
          updated_at: string | null
        }
        Insert: {
          command_type: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          sent_at?: string | null
          status?: string | null
          tv_id: string
          updated_at?: string | null
        }
        Update: {
          command_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          sent_at?: string | null
          status?: string | null
          tv_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tv_devices: {
        Row: {
          active_menu_id: string | null
          active_playlist_id: string | null
          browser_info: Json | null
          connection_status: string | null
          created_at: string | null
          device_identifier: string | null
          device_name: string
          id: string
          ip_address: unknown
          last_command_at: string | null
          last_heartbeat_at: string | null
          last_seen_at: string | null
          location_id: string | null
          override_config: Json | null
          screen_orientation: string | null
          screen_resolution: string | null
          tags: string[] | null
          tv_number: number
          updated_at: string | null
          user_agent: string | null
          vendor_id: string
        }
        Insert: {
          active_menu_id?: string | null
          active_playlist_id?: string | null
          browser_info?: Json | null
          connection_status?: string | null
          created_at?: string | null
          device_identifier?: string | null
          device_name: string
          id?: string
          ip_address?: unknown
          last_command_at?: string | null
          last_heartbeat_at?: string | null
          last_seen_at?: string | null
          location_id?: string | null
          override_config?: Json | null
          screen_orientation?: string | null
          screen_resolution?: string | null
          tags?: string[] | null
          tv_number: number
          updated_at?: string | null
          user_agent?: string | null
          vendor_id: string
        }
        Update: {
          active_menu_id?: string | null
          active_playlist_id?: string | null
          browser_info?: Json | null
          connection_status?: string | null
          created_at?: string | null
          device_identifier?: string | null
          device_name?: string
          id?: string
          ip_address?: unknown
          last_command_at?: string | null
          last_heartbeat_at?: string | null
          last_seen_at?: string | null
          location_id?: string | null
          override_config?: Json | null
          screen_orientation?: string | null
          screen_resolution?: string | null
          tags?: string[] | null
          tv_number?: number
          updated_at?: string | null
          user_agent?: string | null
          vendor_id?: string
        }
        Relationships: []
      }
      tv_display_analytics: {
        Row: {
          categories_displayed: string[] | null
          display_duration: number | null
          displayed_at: string | null
          errors_count: number | null
          id: string
          load_time: number | null
          location_id: string | null
          products_displayed: number | null
          session_id: string | null
          tv_content_id: string | null
          tv_device_id: string | null
          tv_menu_id: string | null
          tv_playlist_id: string | null
          vendor_id: string
        }
        Insert: {
          categories_displayed?: string[] | null
          display_duration?: number | null
          displayed_at?: string | null
          errors_count?: number | null
          id?: string
          load_time?: number | null
          location_id?: string | null
          products_displayed?: number | null
          session_id?: string | null
          tv_content_id?: string | null
          tv_device_id?: string | null
          tv_menu_id?: string | null
          tv_playlist_id?: string | null
          vendor_id: string
        }
        Update: {
          categories_displayed?: string[] | null
          display_duration?: number | null
          displayed_at?: string | null
          errors_count?: number | null
          id?: string
          load_time?: number | null
          location_id?: string | null
          products_displayed?: number | null
          session_id?: string | null
          tv_content_id?: string | null
          tv_device_id?: string | null
          tv_menu_id?: string | null
          tv_playlist_id?: string | null
          vendor_id?: string
        }
        Relationships: []
      }
      tv_display_group_members: {
        Row: {
          assigned_categories: string[] | null
          assigned_menu_id: string | null
          created_at: string | null
          device_id: string
          group_id: string
          id: string
          position_in_group: number
        }
        Insert: {
          assigned_categories?: string[] | null
          assigned_menu_id?: string | null
          created_at?: string | null
          device_id: string
          group_id: string
          id?: string
          position_in_group: number
        }
        Update: {
          assigned_categories?: string[] | null
          assigned_menu_id?: string | null
          created_at?: string | null
          device_id?: string
          group_id?: string
          id?: string
          position_in_group?: number
        }
        Relationships: [
          {
            foreignKeyName: "tv_display_group_members_assigned_menu_id_fkey"
            columns: ["assigned_menu_id"]
            isOneToOne: false
            referencedRelation: "tv_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_display_group_members_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "tv_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_display_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tv_display_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_display_groups: {
        Row: {
          created_at: string | null
          description: string | null
          display_config: Json | null
          display_order: number | null
          id: string
          is_active: boolean | null
          location_id: string | null
          name: string
          pricing_tier_id: string | null
          shared_display_mode: string
          shared_grid_columns: number | null
          shared_grid_rows: number | null
          shared_hero_price_tier: string | null
          shared_price_display_mode: string | null
          shared_spacing: Json | null
          shared_theme: string | null
          shared_typography: Json | null
          updated_at: string | null
          vendor_id: string
          visible_price_breaks: string[] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_config?: Json | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name: string
          pricing_tier_id?: string | null
          shared_display_mode?: string
          shared_grid_columns?: number | null
          shared_grid_rows?: number | null
          shared_hero_price_tier?: string | null
          shared_price_display_mode?: string | null
          shared_spacing?: Json | null
          shared_theme?: string | null
          shared_typography?: Json | null
          updated_at?: string | null
          vendor_id: string
          visible_price_breaks?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_config?: Json | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name?: string
          pricing_tier_id?: string | null
          shared_display_mode?: string
          shared_grid_columns?: number | null
          shared_grid_rows?: number | null
          shared_hero_price_tier?: string | null
          shared_price_display_mode?: string | null
          shared_spacing?: Json | null
          shared_theme?: string | null
          shared_typography?: Json | null
          updated_at?: string | null
          vendor_id?: string
          visible_price_breaks?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_display_groups_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_display_groups_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_display_profiles: {
        Row: {
          adjacent_to: string | null
          ambient_lighting: string | null
          avg_dwell_time_seconds: number | null
          brand_vibe: string | null
          business_goals: string[] | null
          calculated_ppi: number | null
          created_at: string | null
          customer_behavior: string | null
          device_id: string
          id: string
          location_type: string | null
          max_comfortable_products: number | null
          optimal_font_size: number | null
          resolution_height: number | null
          resolution_width: number | null
          screen_height_inches: number | null
          screen_orientation: string | null
          screen_width_inches: number | null
          store_type: string | null
          target_audience: string | null
          updated_at: string | null
          vendor_id: string
          viewing_distance_feet: number | null
        }
        Insert: {
          adjacent_to?: string | null
          ambient_lighting?: string | null
          avg_dwell_time_seconds?: number | null
          brand_vibe?: string | null
          business_goals?: string[] | null
          calculated_ppi?: number | null
          created_at?: string | null
          customer_behavior?: string | null
          device_id: string
          id?: string
          location_type?: string | null
          max_comfortable_products?: number | null
          optimal_font_size?: number | null
          resolution_height?: number | null
          resolution_width?: number | null
          screen_height_inches?: number | null
          screen_orientation?: string | null
          screen_width_inches?: number | null
          store_type?: string | null
          target_audience?: string | null
          updated_at?: string | null
          vendor_id: string
          viewing_distance_feet?: number | null
        }
        Update: {
          adjacent_to?: string | null
          ambient_lighting?: string | null
          avg_dwell_time_seconds?: number | null
          brand_vibe?: string | null
          business_goals?: string[] | null
          calculated_ppi?: number | null
          created_at?: string | null
          customer_behavior?: string | null
          device_id?: string
          id?: string
          location_type?: string | null
          max_comfortable_products?: number | null
          optimal_font_size?: number | null
          resolution_height?: number | null
          resolution_width?: number | null
          screen_height_inches?: number | null
          screen_orientation?: string | null
          screen_width_inches?: number | null
          store_type?: string | null
          target_audience?: string | null
          updated_at?: string | null
          vendor_id?: string
          viewing_distance_feet?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_display_profiles_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: true
            referencedRelation: "tv_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_display_profiles_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_menu_inventory_cache: {
        Row: {
          available_quantity: number
          cache_expires_at: string | null
          created_at: string | null
          current_price: number | null
          discount_percentage: number | null
          display_count: number | null
          display_order: number | null
          id: string
          is_featured: boolean | null
          is_low_stock: boolean | null
          is_new_product: boolean | null
          is_on_sale: boolean | null
          is_out_of_stock: boolean | null
          last_displayed_at: string | null
          last_synced_at: string | null
          location_id: string | null
          product_id: string
          reserved_quantity: number
          sale_price: number | null
          sales_count_24h: number | null
          sales_count_7d: number | null
          stock_status: string | null
          sync_version: number | null
          tv_menu_id: string
          updated_at: string | null
        }
        Insert: {
          available_quantity?: number
          cache_expires_at?: string | null
          created_at?: string | null
          current_price?: number | null
          discount_percentage?: number | null
          display_count?: number | null
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          is_low_stock?: boolean | null
          is_new_product?: boolean | null
          is_on_sale?: boolean | null
          is_out_of_stock?: boolean | null
          last_displayed_at?: string | null
          last_synced_at?: string | null
          location_id?: string | null
          product_id: string
          reserved_quantity?: number
          sale_price?: number | null
          sales_count_24h?: number | null
          sales_count_7d?: number | null
          stock_status?: string | null
          sync_version?: number | null
          tv_menu_id: string
          updated_at?: string | null
        }
        Update: {
          available_quantity?: number
          cache_expires_at?: string | null
          created_at?: string | null
          current_price?: number | null
          discount_percentage?: number | null
          display_count?: number | null
          display_order?: number | null
          id?: string
          is_featured?: boolean | null
          is_low_stock?: boolean | null
          is_new_product?: boolean | null
          is_on_sale?: boolean | null
          is_out_of_stock?: boolean | null
          last_displayed_at?: string | null
          last_synced_at?: string | null
          location_id?: string | null
          product_id?: string
          reserved_quantity?: number
          sale_price?: number | null
          sales_count_24h?: number | null
          sales_count_7d?: number | null
          stock_status?: string | null
          sync_version?: number | null
          tv_menu_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_menu_inventory_cache_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_menu_inventory_cache_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_menu_inventory_cache_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "tv_menu_inventory_cache_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "tv_menu_inventory_cache_tv_menu_id_fkey"
            columns: ["tv_menu_id"]
            isOneToOne: false
            referencedRelation: "tv_menus"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_menu_product_rules: {
        Row: {
          category_filter: string[] | null
          created_at: string | null
          exclude_products: string[] | null
          featured_only: boolean | null
          hide_if_reserved_qty_gte: number | null
          id: string
          is_active: boolean | null
          max_price: number | null
          min_available_qty: number | null
          min_price: number | null
          priority_products: string[] | null
          require_in_stock: boolean | null
          tag_filter: string[] | null
          tv_menu_id: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          category_filter?: string[] | null
          created_at?: string | null
          exclude_products?: string[] | null
          featured_only?: boolean | null
          hide_if_reserved_qty_gte?: number | null
          id?: string
          is_active?: boolean | null
          max_price?: number | null
          min_available_qty?: number | null
          min_price?: number | null
          priority_products?: string[] | null
          require_in_stock?: boolean | null
          tag_filter?: string[] | null
          tv_menu_id: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          category_filter?: string[] | null
          created_at?: string | null
          exclude_products?: string[] | null
          featured_only?: boolean | null
          hide_if_reserved_qty_gte?: number | null
          id?: string
          is_active?: boolean | null
          max_price?: number | null
          min_available_qty?: number | null
          min_price?: number | null
          priority_products?: string[] | null
          require_in_stock?: boolean | null
          tag_filter?: string[] | null
          tv_menu_id?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_menu_product_rules_tv_menu_id_fkey"
            columns: ["tv_menu_id"]
            isOneToOne: false
            referencedRelation: "tv_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_menu_product_rules_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_menus: {
        Row: {
          auto_refresh_interval: number | null
          config_data: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          display_mode: string | null
          display_order: number | null
          hide_out_of_stock: boolean | null
          id: string
          is_active: boolean | null
          is_template: boolean | null
          last_inventory_sync: string | null
          location_id: string | null
          low_stock_threshold: number | null
          max_products_displayed: number | null
          menu_type: string | null
          name: string
          parent_version_id: string | null
          show_low_stock_badges: boolean | null
          show_new_badge_days: number | null
          show_sale_badges: boolean | null
          show_stock_count: boolean | null
          sort_by: string | null
          subscription_expires_at: string | null
          subscription_status: string | null
          sync_pricing: boolean | null
          sync_with_inventory: boolean | null
          theme: string | null
          updated_at: string | null
          vendor_id: string
          version: number | null
          visible_price_breaks: string[] | null
        }
        Insert: {
          auto_refresh_interval?: number | null
          config_data?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_mode?: string | null
          display_order?: number | null
          hide_out_of_stock?: boolean | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          last_inventory_sync?: string | null
          location_id?: string | null
          low_stock_threshold?: number | null
          max_products_displayed?: number | null
          menu_type?: string | null
          name: string
          parent_version_id?: string | null
          show_low_stock_badges?: boolean | null
          show_new_badge_days?: number | null
          show_sale_badges?: boolean | null
          show_stock_count?: boolean | null
          sort_by?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          sync_pricing?: boolean | null
          sync_with_inventory?: boolean | null
          theme?: string | null
          updated_at?: string | null
          vendor_id: string
          version?: number | null
          visible_price_breaks?: string[] | null
        }
        Update: {
          auto_refresh_interval?: number | null
          config_data?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_mode?: string | null
          display_order?: number | null
          hide_out_of_stock?: boolean | null
          id?: string
          is_active?: boolean | null
          is_template?: boolean | null
          last_inventory_sync?: string | null
          location_id?: string | null
          low_stock_threshold?: number | null
          max_products_displayed?: number | null
          menu_type?: string | null
          name?: string
          parent_version_id?: string | null
          show_low_stock_badges?: boolean | null
          show_new_badge_days?: number | null
          show_sale_badges?: boolean | null
          show_stock_count?: boolean | null
          sort_by?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          sync_pricing?: boolean | null
          sync_with_inventory?: boolean | null
          theme?: string | null
          updated_at?: string | null
          vendor_id?: string
          version?: number | null
          visible_price_breaks?: string[] | null
        }
        Relationships: []
      }
      tv_schedules: {
        Row: {
          conditions: Json | null
          created_at: string | null
          day_of_week: number[] | null
          description: string | null
          end_date: string | null
          end_time: string
          id: string
          is_active: boolean | null
          location_id: string | null
          name: string
          priority: number | null
          start_date: string | null
          start_time: string
          target_device_ids: string[] | null
          target_device_tags: string[] | null
          target_menu_id: string | null
          target_playlist_id: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          day_of_week?: number[] | null
          description?: string | null
          end_date?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name: string
          priority?: number | null
          start_date?: string | null
          start_time: string
          target_device_ids?: string[] | null
          target_device_tags?: string[] | null
          target_menu_id?: string | null
          target_playlist_id?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          day_of_week?: number[] | null
          description?: string | null
          end_date?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name?: string
          priority?: number | null
          start_date?: string | null
          start_time?: string
          target_device_ids?: string[] | null
          target_device_tags?: string[] | null
          target_menu_id?: string | null
          target_playlist_id?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          can_manage: boolean | null
          can_manage_inventory: boolean | null
          can_sell: boolean | null
          can_transfer: boolean | null
          id: string
          is_primary_location: boolean | null
          location_id: string
          schedule: Json | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          can_manage?: boolean | null
          can_manage_inventory?: boolean | null
          can_sell?: boolean | null
          can_transfer?: boolean | null
          id?: string
          is_primary_location?: boolean | null
          location_id: string
          schedule?: Json | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          can_manage?: boolean | null
          can_manage_inventory?: boolean | null
          can_sell?: boolean | null
          can_transfer?: boolean | null
          id?: string
          is_primary_location?: boolean | null
          location_id?: string
          schedule?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          created_by: string | null
          email: string
          employee_id: string | null
          first_name: string | null
          hire_date: string | null
          id: string
          last_login: string | null
          last_name: string | null
          login_enabled: boolean | null
          metadata: Json | null
          notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          employee_id?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string
          last_login?: string | null
          last_name?: string | null
          login_enabled?: boolean | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          employee_id?: string | null
          first_name?: string | null
          hire_date?: string | null
          id?: string
          last_login?: string | null
          last_name?: string | null
          login_enabled?: boolean | null
          metadata?: Json | null
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_ai_usage: {
        Row: {
          app_id: string | null
          cost_usd: number
          created_at: string | null
          id: string
          input_tokens: number
          instruction: string | null
          model: string
          output_tokens: number
          vendor_id: string
        }
        Insert: {
          app_id?: string | null
          cost_usd: number
          created_at?: string | null
          id?: string
          input_tokens: number
          instruction?: string | null
          model: string
          output_tokens: number
          vendor_id: string
        }
        Update: {
          app_id?: string | null
          cost_usd?: number
          created_at?: string | null
          id?: string
          input_tokens?: number
          instruction?: string | null
          model?: string
          output_tokens?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_ai_usage_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "vendor_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_ai_usage_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_analytics: {
        Row: {
          average_order_value: number | null
          cancelled_orders: number | null
          commission_paid: number | null
          completed_orders: number | null
          created_at: string | null
          gross_revenue: number | null
          id: string
          metadata: Json | null
          net_revenue: number | null
          period_end: string
          period_start: string
          period_type: string
          repeat_customers: number | null
          top_product_id: string | null
          total_items_sold: number | null
          total_orders: number | null
          unique_customers: number | null
          unique_products_sold: number | null
          vendor_id: string
        }
        Insert: {
          average_order_value?: number | null
          cancelled_orders?: number | null
          commission_paid?: number | null
          completed_orders?: number | null
          created_at?: string | null
          gross_revenue?: number | null
          id?: string
          metadata?: Json | null
          net_revenue?: number | null
          period_end: string
          period_start: string
          period_type: string
          repeat_customers?: number | null
          top_product_id?: string | null
          total_items_sold?: number | null
          total_orders?: number | null
          unique_customers?: number | null
          unique_products_sold?: number | null
          vendor_id: string
        }
        Update: {
          average_order_value?: number | null
          cancelled_orders?: number | null
          commission_paid?: number | null
          completed_orders?: number | null
          created_at?: string | null
          gross_revenue?: number | null
          id?: string
          metadata?: Json | null
          net_revenue?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          repeat_customers?: number | null
          top_product_id?: string | null
          total_items_sold?: number | null
          total_orders?: number | null
          unique_customers?: number | null
          unique_products_sold?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_analytics_top_product_id_fkey"
            columns: ["top_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_analytics_top_product_id_fkey"
            columns: ["top_product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "vendor_analytics_top_product_id_fkey"
            columns: ["top_product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "vendor_analytics_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_app_sessions: {
        Row: {
          ai_cost_usd: number | null
          ai_tokens_used: number | null
          app_id: string
          commits_made: number | null
          ended_at: string | null
          id: string
          started_at: string | null
          vendor_id: string
        }
        Insert: {
          ai_cost_usd?: number | null
          ai_tokens_used?: number | null
          app_id: string
          commits_made?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          vendor_id: string
        }
        Update: {
          ai_cost_usd?: number | null
          ai_tokens_used?: number | null
          app_id?: string
          commits_made?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_app_sessions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "vendor_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_app_sessions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_apps: {
        Row: {
          app_type: string
          created_at: string | null
          deployment_url: string | null
          description: string | null
          github_repo: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_last_activity: string | null
          preview_machine_id: string | null
          preview_status: string | null
          preview_url: string | null
          slug: string
          status: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          app_type: string
          created_at?: string | null
          deployment_url?: string | null
          description?: string | null
          github_repo?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_last_activity?: string | null
          preview_machine_id?: string | null
          preview_status?: string | null
          preview_url?: string | null
          slug: string
          status?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          app_type?: string
          created_at?: string | null
          deployment_url?: string | null
          description?: string | null
          github_repo?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_last_activity?: string | null
          preview_machine_id?: string | null
          preview_status?: string | null
          preview_url?: string | null
          slug?: string
          status?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_apps_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_coas: {
        Row: {
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          lab_name: string | null
          metadata: Json | null
          product_id: string | null
          product_name_on_coa: string | null
          test_date: string | null
          test_results: Json | null
          updated_at: string | null
          upload_date: string | null
          vendor_id: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          lab_name?: string | null
          metadata?: Json | null
          product_id?: string | null
          product_name_on_coa?: string | null
          test_date?: string | null
          test_results?: Json | null
          updated_at?: string | null
          upload_date?: string | null
          vendor_id: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          lab_name?: string | null
          metadata?: Json | null
          product_id?: string | null
          product_name_on_coa?: string | null
          test_date?: string | null
          test_results?: Json | null
          updated_at?: string | null
          upload_date?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_coas_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_coas_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "vendor_coas_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "vendor_coas_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_custom_fields: {
        Row: {
          created_at: string | null
          field_definition: Json
          field_id: string
          id: string
          is_active: boolean | null
          scope_type: string | null
          scope_value: string | null
          section_key: string
          sort_order: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          field_definition: Json
          field_id: string
          id?: string
          is_active?: boolean | null
          scope_type?: string | null
          scope_value?: string | null
          section_key: string
          sort_order?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          field_definition?: Json
          field_id?: string
          id?: string
          is_active?: boolean | null
          scope_type?: string | null
          scope_value?: string | null
          section_key?: string
          sort_order?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_custom_fields_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_customers: {
        Row: {
          created_at: string | null
          customer_id: string
          first_purchase_date: string | null
          id: string
          last_purchase_date: string | null
          loyalty_points: number | null
          loyalty_tier: string | null
          marketing_opt_in: boolean | null
          metadata: Json | null
          notes: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
          vendor_customer_number: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          first_purchase_date?: string | null
          id?: string
          last_purchase_date?: string | null
          loyalty_points?: number | null
          loyalty_tier?: string | null
          marketing_opt_in?: boolean | null
          metadata?: Json | null
          notes?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          vendor_customer_number?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          first_purchase_date?: string | null
          id?: string
          last_purchase_date?: string | null
          loyalty_points?: number | null
          loyalty_tier?: string | null
          marketing_opt_in?: boolean | null
          metadata?: Json | null
          notes?: string | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          vendor_customer_number?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_customers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_deployments: {
        Row: {
          build_logs: string | null
          commit_message: string | null
          commit_sha: string | null
          completed_at: string | null
          created_at: string | null
          deployment_url: string | null
          error_message: string | null
          id: string
          started_at: string | null
          status: string
          vendor_id: string | null
          vercel_deployment_id: string | null
        }
        Insert: {
          build_logs?: string | null
          commit_message?: string | null
          commit_sha?: string | null
          completed_at?: string | null
          created_at?: string | null
          deployment_url?: string | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status: string
          vendor_id?: string | null
          vercel_deployment_id?: string | null
        }
        Update: {
          build_logs?: string | null
          commit_message?: string | null
          commit_sha?: string | null
          completed_at?: string | null
          created_at?: string | null
          deployment_url?: string | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string
          vendor_id?: string | null
          vercel_deployment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_deployments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_domains: {
        Row: {
          created_at: string | null
          dns_configured: boolean | null
          domain: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          last_checked_at: string | null
          metadata: Json | null
          ssl_status: string | null
          updated_at: string | null
          vendor_id: string
          verification_token: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          dns_configured?: boolean | null
          domain: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_checked_at?: string | null
          metadata?: Json | null
          ssl_status?: string | null
          updated_at?: string | null
          vendor_id: string
          verification_token?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          dns_configured?: boolean | null
          domain?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_checked_at?: string | null
          metadata?: Json | null
          ssl_status?: string | null
          updated_at?: string | null
          vendor_id?: string
          verification_token?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_domains_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_email_settings: {
        Row: {
          created_at: string | null
          created_by_user_id: string | null
          domain: string
          domain_verified: boolean | null
          enable_loyalty_updates: boolean | null
          enable_marketing: boolean | null
          enable_order_confirmations: boolean | null
          enable_order_updates: boolean | null
          enable_password_resets: boolean | null
          enable_receipts: boolean | null
          enable_welcome_emails: boolean | null
          from_email: string
          from_name: string
          id: string
          reply_to: string | null
          require_double_opt_in: boolean | null
          resend_domain_id: string | null
          signature_html: string | null
          unsubscribe_footer_html: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id?: string | null
          domain: string
          domain_verified?: boolean | null
          enable_loyalty_updates?: boolean | null
          enable_marketing?: boolean | null
          enable_order_confirmations?: boolean | null
          enable_order_updates?: boolean | null
          enable_password_resets?: boolean | null
          enable_receipts?: boolean | null
          enable_welcome_emails?: boolean | null
          from_email: string
          from_name?: string
          id?: string
          reply_to?: string | null
          require_double_opt_in?: boolean | null
          resend_domain_id?: string | null
          signature_html?: string | null
          unsubscribe_footer_html?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string | null
          domain?: string
          domain_verified?: boolean | null
          enable_loyalty_updates?: boolean | null
          enable_marketing?: boolean | null
          enable_order_confirmations?: boolean | null
          enable_order_updates?: boolean | null
          enable_password_resets?: boolean | null
          enable_receipts?: boolean | null
          enable_welcome_emails?: boolean | null
          from_email?: string
          from_name?: string
          id?: string
          reply_to?: string | null
          require_double_opt_in?: boolean | null
          resend_domain_id?: string | null
          signature_html?: string | null
          unsubscribe_footer_html?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_email_settings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_media: {
        Row: {
          ai_description: string | null
          ai_tags: string[] | null
          alt_text: string | null
          category: Database["public"]["Enums"]["media_category"]
          created_at: string
          custom_tags: string[] | null
          detected_content: Json | null
          dominant_colors: string[] | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          file_url: string
          folder_id: string | null
          id: string
          last_used_at: string | null
          linked_product_ids: string[] | null
          notes: string | null
          quality_score: number | null
          status: Database["public"]["Enums"]["media_status"]
          title: string | null
          updated_at: string
          uploaded_by: string | null
          usage_count: number | null
          used_in_components: string[] | null
          vendor_id: string
        }
        Insert: {
          ai_description?: string | null
          ai_tags?: string[] | null
          alt_text?: string | null
          category?: Database["public"]["Enums"]["media_category"]
          created_at?: string
          custom_tags?: string[] | null
          detected_content?: Json | null
          dominant_colors?: string[] | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          file_url: string
          folder_id?: string | null
          id?: string
          last_used_at?: string | null
          linked_product_ids?: string[] | null
          notes?: string | null
          quality_score?: number | null
          status?: Database["public"]["Enums"]["media_status"]
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          usage_count?: number | null
          used_in_components?: string[] | null
          vendor_id: string
        }
        Update: {
          ai_description?: string | null
          ai_tags?: string[] | null
          alt_text?: string | null
          category?: Database["public"]["Enums"]["media_category"]
          created_at?: string
          custom_tags?: string[] | null
          detected_content?: Json | null
          dominant_colors?: string[] | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          file_url?: string
          folder_id?: string | null
          id?: string
          last_used_at?: string | null
          linked_product_ids?: string[] | null
          notes?: string | null
          quality_score?: number | null
          status?: Database["public"]["Enums"]["media_status"]
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          usage_count?: number | null
          used_in_components?: string[] | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_media_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_media_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_orders: {
        Row: {
          commission_amount: number | null
          created_at: string | null
          fulfilled_date: string | null
          fulfillment_status: string | null
          id: string
          items_count: number | null
          metadata: Json | null
          order_date: string | null
          order_id: string | null
          payout_date: string | null
          payout_reference: string | null
          payout_status: string | null
          updated_at: string | null
          vendor_id: string
          vendor_net_amount: number | null
          vendor_subtotal: number | null
          vendor_subtotal_calculated: number | null
        }
        Insert: {
          commission_amount?: number | null
          created_at?: string | null
          fulfilled_date?: string | null
          fulfillment_status?: string | null
          id?: string
          items_count?: number | null
          metadata?: Json | null
          order_date?: string | null
          order_id?: string | null
          payout_date?: string | null
          payout_reference?: string | null
          payout_status?: string | null
          updated_at?: string | null
          vendor_id: string
          vendor_net_amount?: number | null
          vendor_subtotal?: number | null
          vendor_subtotal_calculated?: number | null
        }
        Update: {
          commission_amount?: number | null
          created_at?: string | null
          fulfilled_date?: string | null
          fulfillment_status?: string | null
          id?: string
          items_count?: number | null
          metadata?: Json | null
          order_date?: string | null
          order_id?: string | null
          payout_date?: string | null
          payout_reference?: string | null
          payout_status?: string | null
          updated_at?: string | null
          vendor_id?: string
          vendor_net_amount?: number | null
          vendor_subtotal?: number | null
          vendor_subtotal_calculated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payouts: {
        Row: {
          adjustments: number | null
          commission_amount: number
          created_at: string | null
          gross_sales: number
          id: string
          metadata: Json | null
          net_payout: number
          notes: string | null
          order_ids: number[] | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payout_number: string
          period_end: string
          period_start: string
          status: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          adjustments?: number | null
          commission_amount: number
          created_at?: string | null
          gross_sales: number
          id?: string
          metadata?: Json | null
          net_payout: number
          notes?: string | null
          order_ids?: number[] | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payout_number: string
          period_end: string
          period_start: string
          status?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          adjustments?: number | null
          commission_amount?: number
          created_at?: string | null
          gross_sales?: number
          id?: string
          metadata?: Json | null
          net_payout?: number
          notes?: string | null
          order_ids?: number[] | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payout_number?: string
          period_end?: string
          period_start?: string
          status?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payouts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_product_fields: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by_user_id: string | null
          field_definition: Json
          field_id: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          source_template_field_group_id: string | null
          source_template_id: string | null
          updated_at: string | null
          updated_by_user_id: string | null
          vendor_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          field_definition: Json
          field_id: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          source_template_field_group_id?: string | null
          source_template_id?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          vendor_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          field_definition?: Json
          field_id?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          source_template_field_group_id?: string | null
          source_template_id?: string | null
          updated_at?: string | null
          updated_by_user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_product_fields_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_fields_source_template_field_group_id_fkey"
            columns: ["source_template_field_group_id"]
            isOneToOne: false
            referencedRelation: "template_field_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_fields_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "business_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_fields_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_products: {
        Row: {
          created_at: string
          id: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_settings: {
        Row: {
          business_info: Json | null
          created_at: string | null
          fulfillment_settings: Json | null
          notifications: Json | null
          payout_preferences: Json | null
          tax_settings: Json | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          business_info?: Json | null
          created_at?: string | null
          fulfillment_settings?: Json | null
          notifications?: Json | null
          payout_preferences?: Json | null
          tax_settings?: Json | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          business_info?: Json | null
          created_at?: string | null
          fulfillment_settings?: Json | null
          notifications?: Json | null
          payout_preferences?: Json | null
          tax_settings?: Json | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_settings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_wallet_settings: {
        Row: {
          background_color: string | null
          created_at: string
          description: string | null
          enable_location_updates: boolean | null
          enable_push_updates: boolean | null
          enabled: boolean | null
          fields_config: Json | null
          foreground_color: string | null
          id: string
          label_color: string | null
          locations: Json | null
          logo_text: string | null
          organization_name: string
          pass_type_identifier: string
          team_identifier: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          background_color?: string | null
          created_at?: string
          description?: string | null
          enable_location_updates?: boolean | null
          enable_push_updates?: boolean | null
          enabled?: boolean | null
          fields_config?: Json | null
          foreground_color?: string | null
          id?: string
          label_color?: string | null
          locations?: Json | null
          logo_text?: string | null
          organization_name: string
          pass_type_identifier?: string
          team_identifier?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          background_color?: string | null
          created_at?: string
          description?: string | null
          enable_location_updates?: boolean | null
          enable_push_updates?: boolean | null
          enabled?: boolean | null
          fields_config?: Json | null
          foreground_color?: string | null
          id?: string
          label_color?: string | null
          locations?: Json | null
          logo_text?: string | null
          organization_name?: string
          pass_type_identifier?: string
          team_identifier?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_wallet_settings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          banner_url: string | null
          brand_colors: Json | null
          business_hours: Json | null
          city: string | null
          coming_soon: boolean | null
          coming_soon_message: string | null
          contact_name: string | null
          created_at: string
          custom_css: string | null
          custom_font: string | null
          default_shipping_cost: number | null
          deployment_error: string | null
          deployment_status: string | null
          distributor_license_expiry: string | null
          distributor_license_number: string | null
          distributor_terms: string | null
          ecommerce_url: string | null
          email: string
          free_shipping_enabled: boolean | null
          free_shipping_threshold: number | null
          github_access_token: string | null
          github_repo_full_name: string | null
          github_repo_name: string | null
          github_repo_url: string | null
          github_user_id: string | null
          github_username: string | null
          id: string
          is_platform_vendor: boolean | null
          last_deployment_at: string | null
          launch_date: string | null
          logo_url: string | null
          marketing_config: Json | null
          marketing_provider: string | null
          minimum_order_amount: number | null
          phone: string | null
          pos_enabled: boolean | null
          retail_display_unit: string | null
          return_policy: string | null
          shipping_policy: string | null
          site_hidden: boolean | null
          slug: string
          social_links: Json | null
          state: string | null
          status: string | null
          store_description: string | null
          store_name: string
          store_tagline: string | null
          tax_id: string | null
          template_config: Json | null
          template_id: string
          total_locations: number | null
          track_cost_of_goods: boolean | null
          updated_at: string
          vendor_type: Database["public"]["Enums"]["vendor_type_enum"] | null
          vercel_deployment_url: string | null
          vercel_project_id: string | null
          wholesale_display_unit: string | null
          wholesale_enabled: boolean | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          brand_colors?: Json | null
          business_hours?: Json | null
          city?: string | null
          coming_soon?: boolean | null
          coming_soon_message?: string | null
          contact_name?: string | null
          created_at?: string
          custom_css?: string | null
          custom_font?: string | null
          default_shipping_cost?: number | null
          deployment_error?: string | null
          deployment_status?: string | null
          distributor_license_expiry?: string | null
          distributor_license_number?: string | null
          distributor_terms?: string | null
          ecommerce_url?: string | null
          email: string
          free_shipping_enabled?: boolean | null
          free_shipping_threshold?: number | null
          github_access_token?: string | null
          github_repo_full_name?: string | null
          github_repo_name?: string | null
          github_repo_url?: string | null
          github_user_id?: string | null
          github_username?: string | null
          id?: string
          is_platform_vendor?: boolean | null
          last_deployment_at?: string | null
          launch_date?: string | null
          logo_url?: string | null
          marketing_config?: Json | null
          marketing_provider?: string | null
          minimum_order_amount?: number | null
          phone?: string | null
          pos_enabled?: boolean | null
          retail_display_unit?: string | null
          return_policy?: string | null
          shipping_policy?: string | null
          site_hidden?: boolean | null
          slug: string
          social_links?: Json | null
          state?: string | null
          status?: string | null
          store_description?: string | null
          store_name: string
          store_tagline?: string | null
          tax_id?: string | null
          template_config?: Json | null
          template_id?: string
          total_locations?: number | null
          track_cost_of_goods?: boolean | null
          updated_at?: string
          vendor_type?: Database["public"]["Enums"]["vendor_type_enum"] | null
          vercel_deployment_url?: string | null
          vercel_project_id?: string | null
          wholesale_display_unit?: string | null
          wholesale_enabled?: boolean | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          brand_colors?: Json | null
          business_hours?: Json | null
          city?: string | null
          coming_soon?: boolean | null
          coming_soon_message?: string | null
          contact_name?: string | null
          created_at?: string
          custom_css?: string | null
          custom_font?: string | null
          default_shipping_cost?: number | null
          deployment_error?: string | null
          deployment_status?: string | null
          distributor_license_expiry?: string | null
          distributor_license_number?: string | null
          distributor_terms?: string | null
          ecommerce_url?: string | null
          email?: string
          free_shipping_enabled?: boolean | null
          free_shipping_threshold?: number | null
          github_access_token?: string | null
          github_repo_full_name?: string | null
          github_repo_name?: string | null
          github_repo_url?: string | null
          github_user_id?: string | null
          github_username?: string | null
          id?: string
          is_platform_vendor?: boolean | null
          last_deployment_at?: string | null
          launch_date?: string | null
          logo_url?: string | null
          marketing_config?: Json | null
          marketing_provider?: string | null
          minimum_order_amount?: number | null
          phone?: string | null
          pos_enabled?: boolean | null
          retail_display_unit?: string | null
          return_policy?: string | null
          shipping_policy?: string | null
          site_hidden?: boolean | null
          slug?: string
          social_links?: Json | null
          state?: string | null
          status?: string | null
          store_description?: string | null
          store_name?: string
          store_tagline?: string | null
          tax_id?: string | null
          template_config?: Json | null
          template_id?: string
          total_locations?: number | null
          track_cost_of_goods?: boolean | null
          updated_at?: string
          vendor_type?: Database["public"]["Enums"]["vendor_type_enum"] | null
          vercel_deployment_url?: string | null
          vercel_project_id?: string | null
          wholesale_display_unit?: string | null
          wholesale_enabled?: boolean | null
          zip?: string | null
        }
        Relationships: []
      }
      wallet_device_registrations: {
        Row: {
          created_at: string | null
          customer_id: string | null
          device_library_identifier: string
          id: string
          last_push_at: string | null
          pass_type_identifier: string
          push_count: number | null
          push_token: string
          serial_number: string
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          device_library_identifier: string
          id?: string
          last_push_at?: string | null
          pass_type_identifier?: string
          push_count?: number | null
          push_token: string
          serial_number: string
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          device_library_identifier?: string
          id?: string
          last_push_at?: string | null
          pass_type_identifier?: string
          push_count?: number | null
          push_token?: string
          serial_number?: string
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_device_registrations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_device_registrations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_error_logs: {
        Row: {
          id: string
          logs: Json | null
          received_at: string | null
        }
        Insert: {
          id?: string
          logs?: Json | null
          received_at?: string | null
        }
        Update: {
          id?: string
          logs?: Json | null
          received_at?: string | null
        }
        Relationships: []
      }
      wallet_pass_error_logs: {
        Row: {
          id: string
          logs: Json | null
          received_at: string | null
        }
        Insert: {
          id?: string
          logs?: Json | null
          received_at?: string | null
        }
        Update: {
          id?: string
          logs?: Json | null
          received_at?: string | null
        }
        Relationships: []
      }
      wallet_pass_events: {
        Row: {
          created_at: string
          customer_id: string
          device_id: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          pass_id: string
          push_token: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          device_id?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          pass_id: string
          push_token?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          device_id?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          pass_id?: string
          push_token?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_pass_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_pass_events_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "wallet_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_pass_updates_queue: {
        Row: {
          attempts: number | null
          created_at: string
          error_message: string | null
          id: string
          max_attempts: number | null
          new_data: Json | null
          old_data: Json | null
          pass_id: string
          processed_at: string | null
          push_sent: boolean | null
          push_sent_at: string | null
          status: string
          update_type: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          new_data?: Json | null
          old_data?: Json | null
          pass_id: string
          processed_at?: string | null
          push_sent?: boolean | null
          push_sent_at?: string | null
          status?: string
          update_type: string
        }
        Update: {
          attempts?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number | null
          new_data?: Json | null
          old_data?: Json | null
          pass_id?: string
          processed_at?: string | null
          push_sent?: boolean | null
          push_sent_at?: string | null
          status?: string
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_pass_updates_queue_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "wallet_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_passes: {
        Row: {
          added_to_wallet_at: string | null
          apple_wallet_url: string | null
          authentication_token: string | null
          created_at: string | null
          customer_id: string
          devices: Json | null
          google_wallet_url: string | null
          id: string
          is_active: boolean | null
          last_push_at: string | null
          last_updated_at: string | null
          pass_data: Json
          pass_serial_number: string
          pass_type: string
          pass_type_identifier: string | null
          push_enabled: boolean | null
          serial_number: string | null
          status: string | null
          times_downloaded: number | null
          times_updated: number | null
          vendor_id: string
          web_service_url: string | null
        }
        Insert: {
          added_to_wallet_at?: string | null
          apple_wallet_url?: string | null
          authentication_token?: string | null
          created_at?: string | null
          customer_id: string
          devices?: Json | null
          google_wallet_url?: string | null
          id?: string
          is_active?: boolean | null
          last_push_at?: string | null
          last_updated_at?: string | null
          pass_data: Json
          pass_serial_number: string
          pass_type: string
          pass_type_identifier?: string | null
          push_enabled?: boolean | null
          serial_number?: string | null
          status?: string | null
          times_downloaded?: number | null
          times_updated?: number | null
          vendor_id: string
          web_service_url?: string | null
        }
        Update: {
          added_to_wallet_at?: string | null
          apple_wallet_url?: string | null
          authentication_token?: string | null
          created_at?: string | null
          customer_id?: string
          devices?: Json | null
          google_wallet_url?: string | null
          id?: string
          is_active?: boolean | null
          last_push_at?: string | null
          last_updated_at?: string | null
          pass_data?: Json
          pass_serial_number?: string
          pass_type?: string
          pass_type_identifier?: string | null
          push_enabled?: boolean | null
          serial_number?: string | null
          status?: string | null
          times_downloaded?: number | null
          times_updated?: number | null
          vendor_id?: string
          web_service_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_passes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_passes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_push_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          customer_id: string | null
          id: string
          last_error: string | null
          max_attempts: number | null
          next_retry_at: string | null
          payload: Json | null
          priority: number | null
          processed_at: string | null
          push_type: string
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          payload?: Json | null
          priority?: number | null
          processed_at?: string | null
          push_type?: string
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          next_retry_at?: string | null
          payload?: Json | null
          priority?: number | null
          processed_at?: string | null
          push_type?: string
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_push_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_push_queue_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      website_visitors: {
        Row: {
          browser: string | null
          channel: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          id: string
          is_returning: boolean | null
          latitude: number | null
          longitude: number | null
          os: string | null
          page_url: string | null
          referrer: string | null
          region: string | null
          screen_height: number | null
          screen_width: number | null
          session_id: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          vendor_id: string
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          channel?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          is_returning?: boolean | null
          latitude?: number | null
          longitude?: number | null
          os?: string | null
          page_url?: string | null
          referrer?: string | null
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vendor_id: string
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          channel?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          is_returning?: boolean | null
          latitude?: number | null
          longitude?: number | null
          os?: string | null
          page_url?: string | null
          referrer?: string | null
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vendor_id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_visitors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesale_applications: {
        Row: {
          business_address: Json
          business_name: string
          business_type: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          customer_id: string
          id: string
          license_document_url: string | null
          license_expiry: string
          license_number: string
          metadata: Json | null
          rejection_reason: string | null
          resale_certificate_url: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          tax_id: string
          updated_at: string | null
        }
        Insert: {
          business_address: Json
          business_name: string
          business_type?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          license_document_url?: string | null
          license_expiry: string
          license_number: string
          metadata?: Json | null
          rejection_reason?: string | null
          resale_certificate_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          tax_id: string
          updated_at?: string | null
        }
        Update: {
          business_address?: Json
          business_name?: string
          business_type?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          license_document_url?: string | null
          license_expiry?: string
          license_number?: string
          metadata?: Json | null
          rejection_reason?: string | null
          resale_certificate_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          tax_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_applications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesale_customers: {
        Row: {
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_country: string | null
          billing_state: string | null
          billing_zip: string | null
          business_type: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          credit_limit: number | null
          currency: string | null
          customer_vendor_id: string | null
          discount_percent: number | null
          external_company_name: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          payment_terms: string | null
          pricing_tier: string | null
          resale_certificate: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_state: string | null
          shipping_zip: string | null
          tax_id: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          business_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          credit_limit?: number | null
          currency?: string | null
          customer_vendor_id?: string | null
          discount_percent?: number | null
          external_company_name?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payment_terms?: string | null
          pricing_tier?: string | null
          resale_certificate?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          tax_id?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          business_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          credit_limit?: number | null
          currency?: string | null
          customer_vendor_id?: string | null
          discount_percent?: number | null
          external_company_name?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payment_terms?: string | null
          pricing_tier?: string | null
          resale_certificate?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          tax_id?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_customers_customer_vendor_id_fkey"
            columns: ["customer_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_customers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesale_pricing: {
        Row: {
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          minimum_quantity: number
          product_id: string
          starts_at: string | null
          terms: string | null
          tier_name: string
          unit_price: number
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          minimum_quantity: number
          product_id: string
          starts_at?: string | null
          terms?: string | null
          tier_name: string
          unit_price: number
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          minimum_quantity?: number
          product_id?: string
          starts_at?: string | null
          terms?: string | null
          tier_name?: string
          unit_price?: number
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "wholesale_pricing_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "wholesale_pricing_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      checkout_attempts_needing_attention: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          customer_email: string | null
          customer_email_verified: string | null
          customer_full_name: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_phone_verified: string | null
          discount_amount: number | null
          id: string | null
          ip_address: string | null
          items: Json | null
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
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          user_agent: string | null
          vendor_id: string | null
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
      customer_wallet_pass_stats: {
        Row: {
          active_passes: number | null
          new_this_month: number | null
          new_this_week: number | null
          push_enabled: number | null
          total_passes: number | null
          vendor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_wallet_passes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_with_holds: {
        Row: {
          available_quantity: number | null
          created_at: string | null
          held_quantity: number | null
          id: string | null
          location_id: string | null
          product_id: string | null
          total_quantity: number | null
          updated_at: string | null
          vendor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      v_daily_sales: {
        Row: {
          cost_of_goods: number | null
          discount_amount: number | null
          employee_id: string | null
          gross_profit: number | null
          location_id: string | null
          order_id: string | null
          payment_method: string | null
          refund_amount: number | null
          sale_date: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          tip_amount: number | null
          total_amount: number | null
          transaction_id: string | null
          vendor_id: string | null
        }
        Relationships: []
      }
      v_location_fulfillment_queue: {
        Row: {
          customer_first_name: string | null
          customer_id: string | null
          customer_last_name: string | null
          fulfillment_location_id: string | null
          fulfillment_location_name: string | null
          item_fulfillment_status: string | null
          items_at_location: number | null
          order_created_at: string | null
          order_id: string | null
          order_item_id: string | null
          order_number: string | null
          order_status: string | null
          order_type: string | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          quantity_grams: number | null
          shipping_address_line1: string | null
          shipping_city: string | null
          shipping_name: string | null
          shipping_state: string | null
          shipping_zip: string | null
          tier_name: string | null
          total_order_items: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_location_id_fkey"
            columns: ["fulfillment_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_performance"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_variants"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_order_shipments: {
        Row: {
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          fulfillment_status: string | null
          item_count: number | null
          location_id: string | null
          location_name: string | null
          order_id: string | null
          order_number: string | null
          shipped_at: string | null
          shipped_by_name: string | null
          shipped_by_user_id: string | null
          shipped_count: number | null
          shipping_address_line1: string | null
          shipping_carrier: string | null
          shipping_city: string | null
          shipping_cost: number | null
          shipping_name: string | null
          shipping_state: string | null
          shipping_zip: string | null
          total_shipments: number | null
          tracking_number: string | null
          tracking_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_with_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_locations_shipped_by_user_id_fkey"
            columns: ["shipped_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_orders_with_locations: {
        Row: {
          billing_address: Json | null
          cancelled_date: string | null
          card_last_four: string | null
          card_type: string | null
          cart_hash: string | null
          cart_tax: number | null
          completed_at: string | null
          completed_date: string | null
          cost_of_goods: number | null
          created_at: string | null
          created_by_user_id: string | null
          currency: string | null
          customer_id: string | null
          customer_ip_address: unknown
          customer_note: string | null
          customer_user_agent: string | null
          delivered_at: string | null
          delivered_by_user_id: string | null
          delivery_type: string | null
          discount_amount: number | null
          discount_tax: number | null
          employee_id: string | null
          estimated_delivery_date: string | null
          fulfillment_locations: Json | null
          fulfillment_status: string | null
          gross_profit: number | null
          id: string | null
          idempotency_key: string | null
          internal_notes: string[] | null
          location_count: number | null
          margin_percentage: number | null
          metadata: Json | null
          notified_at: string | null
          order_date: string | null
          order_number: string | null
          order_type: string | null
          package_height: number | null
          package_length: number | null
          package_weight: number | null
          package_width: number | null
          paid_date: string | null
          payment_authorization_code: string | null
          payment_data: Json | null
          payment_method: string | null
          payment_method_title: string | null
          payment_status: string | null
          picked_up_at: string | null
          pickup_location_id: string | null
          postage_paid: number | null
          prepared_at: string | null
          prepared_by_user_id: string | null
          processor_reference_id: string | null
          processor_transaction_id: string | null
          ready_at: string | null
          refund_amount: number | null
          shipped_at: string | null
          shipped_by_user_id: string | null
          shipped_date: string | null
          shipping_address: Json | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_amount: number | null
          shipping_carrier: string | null
          shipping_city: string | null
          shipping_cost: number | null
          shipping_country: string | null
          shipping_label_url: string | null
          shipping_method: string | null
          shipping_method_title: string | null
          shipping_name: string | null
          shipping_phone: string | null
          shipping_service: string | null
          shipping_state: string | null
          shipping_tax: number | null
          shipping_zip: string | null
          split_payment_card: number | null
          split_payment_cash: number | null
          staff_notes: string | null
          state_log: Json | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          tracking_number: string | null
          tracking_url: string | null
          transaction_id: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          cancelled_date?: string | null
          card_last_four?: string | null
          card_type?: string | null
          cart_hash?: string | null
          cart_tax?: number | null
          completed_at?: string | null
          completed_date?: string | null
          cost_of_goods?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_ip_address?: unknown
          customer_note?: string | null
          customer_user_agent?: string | null
          delivered_at?: string | null
          delivered_by_user_id?: string | null
          delivery_type?: string | null
          discount_amount?: number | null
          discount_tax?: number | null
          employee_id?: string | null
          estimated_delivery_date?: string | null
          fulfillment_locations?: never
          fulfillment_status?: string | null
          gross_profit?: number | null
          id?: string | null
          idempotency_key?: string | null
          internal_notes?: string[] | null
          location_count?: never
          margin_percentage?: number | null
          metadata?: Json | null
          notified_at?: string | null
          order_date?: string | null
          order_number?: string | null
          order_type?: string | null
          package_height?: number | null
          package_length?: number | null
          package_weight?: number | null
          package_width?: number | null
          paid_date?: string | null
          payment_authorization_code?: string | null
          payment_data?: Json | null
          payment_method?: string | null
          payment_method_title?: string | null
          payment_status?: string | null
          picked_up_at?: string | null
          pickup_location_id?: string | null
          postage_paid?: number | null
          prepared_at?: string | null
          prepared_by_user_id?: string | null
          processor_reference_id?: string | null
          processor_transaction_id?: string | null
          ready_at?: string | null
          refund_amount?: number | null
          shipped_at?: string | null
          shipped_by_user_id?: string | null
          shipped_date?: string | null
          shipping_address?: Json | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_amount?: number | null
          shipping_carrier?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_country?: string | null
          shipping_label_url?: string | null
          shipping_method?: string | null
          shipping_method_title?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_service?: string | null
          shipping_state?: string | null
          shipping_tax?: number | null
          shipping_zip?: string | null
          split_payment_card?: number | null
          split_payment_cash?: number | null
          staff_notes?: string | null
          state_log?: Json | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          cancelled_date?: string | null
          card_last_four?: string | null
          card_type?: string | null
          cart_hash?: string | null
          cart_tax?: number | null
          completed_at?: string | null
          completed_date?: string | null
          cost_of_goods?: number | null
          created_at?: string | null
          created_by_user_id?: string | null
          currency?: string | null
          customer_id?: string | null
          customer_ip_address?: unknown
          customer_note?: string | null
          customer_user_agent?: string | null
          delivered_at?: string | null
          delivered_by_user_id?: string | null
          delivery_type?: string | null
          discount_amount?: number | null
          discount_tax?: number | null
          employee_id?: string | null
          estimated_delivery_date?: string | null
          fulfillment_locations?: never
          fulfillment_status?: string | null
          gross_profit?: number | null
          id?: string | null
          idempotency_key?: string | null
          internal_notes?: string[] | null
          location_count?: never
          margin_percentage?: number | null
          metadata?: Json | null
          notified_at?: string | null
          order_date?: string | null
          order_number?: string | null
          order_type?: string | null
          package_height?: number | null
          package_length?: number | null
          package_weight?: number | null
          package_width?: number | null
          paid_date?: string | null
          payment_authorization_code?: string | null
          payment_data?: Json | null
          payment_method?: string | null
          payment_method_title?: string | null
          payment_status?: string | null
          picked_up_at?: string | null
          pickup_location_id?: string | null
          postage_paid?: number | null
          prepared_at?: string | null
          prepared_by_user_id?: string | null
          processor_reference_id?: string | null
          processor_transaction_id?: string | null
          ready_at?: string | null
          refund_amount?: number | null
          shipped_at?: string | null
          shipped_by_user_id?: string | null
          shipped_date?: string | null
          shipping_address?: Json | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_amount?: number | null
          shipping_carrier?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_country?: string | null
          shipping_label_url?: string | null
          shipping_method?: string | null
          shipping_method_title?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_service?: string | null
          shipping_state?: string | null
          shipping_tax?: number | null
          shipping_zip?: string | null
          split_payment_card?: number | null
          split_payment_cash?: number | null
          staff_notes?: string | null
          state_log?: Json | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivered_by_user_id_fkey"
            columns: ["delivered_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_prepared_by_user_id_fkey"
            columns: ["prepared_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipped_by_user_id_fkey"
            columns: ["shipped_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      v_product_performance: {
        Row: {
          category_name: string | null
          estimated_cost: number | null
          estimated_profit: number | null
          margin_percentage: number | null
          order_count: number | null
          primary_category_id: string | null
          product_id: string | null
          product_name: string | null
          revenue: number | null
          units_sold: number | null
          vendor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_primary_category_id_fkey"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      v_product_variants: {
        Row: {
          allow_on_demand_conversion: boolean | null
          conversion_ratio: number | null
          conversion_unit: string | null
          display_order: number | null
          featured_image_url: string | null
          indicator_icon_url: string | null
          is_enabled: boolean | null
          parent_product_image: string | null
          pricing_template_id: string | null
          primary_category_id: string | null
          product_id: string | null
          product_metadata: Json | null
          product_name: string | null
          share_parent_inventory: boolean | null
          template_metadata: Json | null
          thumbnail_url: string | null
          track_separate_inventory: boolean | null
          variant_icon: string | null
          variant_name: string | null
          variant_slug: string | null
          variant_template_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_primary_category_id_fkey"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjust_customer_loyalty_points: {
        Args: {
          p_customer_id: string
          p_points_change: number
          p_reason?: string
        }
        Returns: boolean
      }
      aggregate_vendor_analytics: {
        Args: { p_period_type?: string; p_vendor_id?: string }
        Returns: {
          cancelled_orders: number
          commission_paid: number
          completed_orders: number
          gross_revenue: number
          items_sold: number
          net_revenue: number
          period_end: string
          period_start: string
          total_orders: number
          unique_customers: number
          vendor_id: string
        }[]
      }
      approve_affiliate_conversion: {
        Args: { p_approved_by: string; p_conversion_id: string }
        Returns: boolean
      }
      approve_inventory_transfer: {
        Args: { p_approved_by?: string; p_transfer_id: string }
        Returns: boolean
      }
      calculate_affiliate_discount: {
        Args: {
          p_discount_rate: number
          p_discount_type: string
          p_subtotal: number
        }
        Returns: number
      }
      calculate_deal_discount: {
        Args: {
          p_category_id: string
          p_deal_id: string
          p_item_price: number
          p_product_id: string
          p_quantity: number
        }
        Returns: number
      }
      calculate_distance_km: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      calculate_loyalty_points_to_earn: {
        Args: { p_subtotal: number; p_vendor_id: string }
        Returns: number
      }
      calculate_order_item_cogs: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: number
      }
      calculate_po_total: { Args: { po_id: string }; Returns: undefined }
      calculate_tier_price: {
        Args: { cost_price: number; markup_type: string; markup_value: number }
        Returns: number
      }
      can_vendor_add_location: {
        Args: { max_locations?: number; vendor_uuid: string }
        Returns: boolean
      }
      cancel_inventory_transfer: {
        Args: {
          p_cancelled_by_user_id?: string
          p_reason?: string
          p_transfer_id: string
        }
        Returns: boolean
      }
      check_idempotent_order: {
        Args: { p_idempotency_key: string }
        Returns: {
          order_exists: boolean
          order_id: string
          order_status: string
          payment_status: string
          total_amount: number
        }[]
      }
      cleanup_expired_ai_recommendations: { Args: never; Returns: undefined }
      cleanup_expired_cache_entries: { Args: never; Returns: undefined }
      cleanup_expired_holds: { Args: never; Returns: number }
      cleanup_expired_tv_menu_cache: { Args: never; Returns: number }
      cleanup_old_commands: { Args: never; Returns: undefined }
      cleanup_stale_inventory_holds: { Args: never; Returns: Json }
      close_pos_session: {
        Args: {
          p_closing_cash: number
          p_closing_notes?: string
          p_session_id: string
        }
        Returns: Json
      }
      complete_affiliate_payout: {
        Args: {
          p_payment_reference?: string
          p_payout_id: string
          p_processed_by: string
        }
        Returns: boolean
      }
      complete_inventory_transfer: {
        Args: {
          p_received_by_user_id?: string
          p_received_items: Json
          p_transfer_id: string
        }
        Returns: {
          items_damaged: number
          items_good: number
          items_processed: number
          success: boolean
        }[]
      }
      compute_customer_metrics: {
        Args: { p_vendor_id: string }
        Returns: number
      }
      convert_weight_to_display: {
        Args: { display_unit: string; quantity_grams: number }
        Returns: number
      }
      create_affiliate_payout: {
        Args: { p_affiliate_id: string; p_processed_by: string }
        Returns: string
      }
      create_and_ship_transfer: {
        Args: {
          p_created_by_user_id?: string
          p_destination_location_id: string
          p_idempotency_key?: string
          p_items: Json
          p_notes?: string
          p_source_location_id: string
          p_tracking_number?: string
          p_vendor_id: string
        }
        Returns: string
      }
      create_customer_safe: {
        Args: {
          p_city?: string
          p_date_of_birth?: string
          p_email?: string
          p_first_name: string
          p_idempotency_key?: string
          p_last_name: string
          p_middle_name?: string
          p_phone?: string
          p_postal_code?: string
          p_state?: string
          p_street_address?: string
          p_vendor_id: string
        }
        Returns: {
          created: boolean
          customer_id: string
          duplicate_found: boolean
          success: boolean
        }[]
      }
      create_inventory_transfer: {
        Args: {
          p_created_by_user_id?: string
          p_destination_location_id: string
          p_idempotency_key?: string
          p_items: Json
          p_notes?: string
          p_source_location_id: string
          p_vendor_id: string
        }
        Returns: string
      }
      create_pos_sale:
        | {
            Args: {
              p_authorization_code?: string
              p_card_last4?: string
              p_card_type?: string
              p_cash_tendered?: number
              p_change_given?: number
              p_customer_id?: string
              p_customer_name?: string
              p_items: Json
              p_location_id: string
              p_loyalty_discount_amount?: number
              p_loyalty_points_redeemed?: number
              p_payment_method: string
              p_payment_processor_id?: string
              p_payment_transaction_id?: string
              p_session_id: string
              p_split_payment_card?: number
              p_split_payment_cash?: number
              p_subtotal: number
              p_tax_amount: number
              p_total: number
              p_user_id: string
              p_vendor_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_customer_id: string
              p_items: Json
              p_location_id: string
              p_loyalty_points_redeemed?: number
              p_payment_details: Json
              p_payment_method: string
              p_payment_processor_id: string
              p_session_id: string
              p_subtotal: number
              p_tax: number
              p_total: number
              p_vendor_id: string
            }
            Returns: Json
          }
      create_product_atomic: {
        Args: {
          p_category_id: string
          p_description?: string
          p_featured?: boolean
          p_idempotency_key?: string
          p_initial_inventory?: Json
          p_name: string
          p_pricing_data: Json
          p_sku?: string
          p_status?: string
          p_stock_status?: string
          p_type?: string
          p_vendor_id: string
        }
        Returns: {
          inventory_created: number
          product_id: string
          product_name: string
          slug: string
        }[]
      }
      create_products_bulk: {
        Args: {
          p_category_id: string
          p_idempotency_key?: string
          p_pricing_data: Json
          p_products: string
          p_vendor_id: string
        }
        Returns: {
          product_ids: string[]
          products_created: number
          products_skipped: number
        }[]
      }
      create_purchase_order_atomic: {
        Args: {
          p_expected_delivery_date?: string
          p_idempotency_key?: string
          p_items: string
          p_location_id?: string
          p_notes?: string
          p_po_type: string
          p_shipping_cost?: number
          p_supplier_id?: string
          p_tax_amount?: number
          p_vendor_id: string
          p_wholesale_customer_id?: string
        }
        Returns: {
          items_created: number
          po_id: string
          po_number: string
          shipping_cost: number
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
        }[]
      }
      decrement_inventory: {
        Args: { p_inventory_id: string; p_quantity: number }
        Returns: Json
      }
      delete_customer_safe: {
        Args: { p_customer_id: string; p_vendor_id: string }
        Returns: {
          customer_id: string
          success: boolean
          was_active: boolean
        }[]
      }
      delete_purchase_order_atomic: {
        Args: { p_po_id: string }
        Returns: undefined
      }
      finalize_inventory_holds: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      find_tier_for_order_item: {
        Args: { p_product_id: string; p_unit_price: number }
        Returns: {
          tier_name: string
          tier_price: number
          tier_quantity: number
        }[]
      }
      fork_artifact: {
        Args: {
          artifact_uuid: string
          new_title: string
          user_id_param: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "ai_artifacts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fulfill_order_items_at_location: {
        Args: {
          p_fulfilled_by_user_id?: string
          p_location_id: string
          p_order_id: string
        }
        Returns: {
          items_fulfilled: number
          order_fully_fulfilled: boolean
          remaining_locations: string[]
        }[]
      }
      generate_order_number: { Args: { p_prefix?: string }; Returns: string }
      generate_po_number: {
        Args: { po_type: string; v_vendor_id: string }
        Returns: string
      }
      generate_referral_code: {
        Args: { p_base_name: string; p_vendor_id: string }
        Returns: string
      }
      generate_register_number: {
        Args: { p_location_id: string }
        Returns: string
      }
      generate_session_number: {
        Args: { p_location_id: string }
        Returns: string
      }
      get_active_pos_session: {
        Args: { p_location_id: string }
        Returns: string
      }
      get_category_field_groups: {
        Args: { p_category_id: string }
        Returns: {
          field_group_id: string
          fields: Json
          is_required: boolean
          name: string
          slug: string
        }[]
      }
      get_customer_passes_for_device: {
        Args: {
          p_device_library_id: string
          p_pass_type_id: string
          p_updated_since?: string
        }
        Returns: {
          last_updated: string
          serial_number: string
        }[]
      }
      get_ecommerce_processor: {
        Args: { p_vendor_id: string }
        Returns: {
          api_login_id: string
          environment: string
          processor_id: string
          processor_name: string
          processor_type: string
          public_client_key: string
          signature_key: string
          transaction_key: string
          webhook_url: string
        }[]
      }
      get_meta_integration: {
        Args: { p_vendor_id: string }
        Returns: {
          access_token_encrypted: string
          ad_account_id: string | null
          app_id: string
          app_secret_encrypted: string | null
          business_id: string | null
          business_name: string | null
          created_at: string | null
          id: string
          instagram_business_id: string | null
          last_error: string | null
          page_id: string | null
          pixel_id: string | null
          status: string | null
          token_expires_at: string | null
          updated_at: string | null
          vendor_id: string
        }
        SetofOptions: {
          from: "*"
          to: "meta_integrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_or_create_session: {
        Args: {
          p_location_id: string
          p_opening_cash?: number
          p_register_id: string
          p_user_id?: string
          p_vendor_id: string
        }
        Returns: {
          cash_difference: number | null
          closed_at: string | null
          closing_cash: number | null
          closing_notes: string | null
          created_at: string | null
          expected_cash: number | null
          id: string
          last_transaction_at: string | null
          location_id: string
          metadata: Json | null
          opened_at: string | null
          opening_cash: number | null
          opening_notes: string | null
          pickup_orders_fulfilled: number | null
          register_id: string | null
          session_number: string
          status: string | null
          total_card: number | null
          total_cash: number | null
          total_refunds: number | null
          total_sales: number | null
          total_transactions: number | null
          updated_at: string | null
          user_id: string | null
          vendor_id: string
          walk_in_sales: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "pos_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_order_passes_for_device: {
        Args: {
          p_device_library_id: string
          p_pass_type_id: string
          p_updated_since?: string
        }
        Returns: {
          last_updated: string
          serial_number: string
        }[]
      }
      get_orders_for_location: {
        Args: { p_limit?: number; p_location_id: string; p_status?: string }
        Returns: {
          created_at: string
          customer_name: string
          items_at_location: number
          location_fulfillment_status: string
          order_id: string
          order_number: string
          order_status: string
          order_type: string
          total_order_items: number
        }[]
      }
      get_passes_for_device: {
        Args: {
          p_device_library_id: string
          p_pass_type_id: string
          p_updated_since?: string
        }
        Returns: {
          last_updated: string
          serial_number: string
        }[]
      }
      get_passes_needing_push: {
        Args: { p_customer_ids?: string[]; p_vendor_id?: string }
        Returns: {
          customer_id: string
          customer_name: string
          loyalty_points: number
          pass_id: string
          push_token: string
          serial_number: string
          vendor_id: string
        }[]
      }
      get_processor_for_register: {
        Args: { p_register_id: string }
        Returns: {
          api_login_id: string
          authkey: string
          environment: string
          processor_id: string
          processor_type: string
          register_id: string
          signature_key: string
          tpn: string
          transaction_key: string
        }[]
      }
      get_product_all_pricing: {
        Args: { p_product_id: string }
        Returns: {
          blueprint_id: string
          blueprint_name: string
          blueprint_slug: string
          price_breaks: Json
          pricing: Json
          tier_type: string
        }[]
      }
      get_product_fields: {
        Args: { p_category_id: string; p_vendor_id: string }
        Returns: Json
      }
      get_product_history: {
        Args: { p_limit?: number; p_product_id: string }
        Returns: {
          change_type: string
          changed_at: string
          changed_by: string
          changed_by_email: string
          field_name: string
          id: string
          metadata: Json
          new_value: Json
          old_value: Json
        }[]
      }
      get_product_media_suggestions: {
        Args: { p_limit?: number; p_product_name?: string; p_vendor_id: string }
        Returns: {
          ai_description: string
          file_name: string
          file_url: string
          id: string
          relevance_score: number
        }[]
      }
      get_product_pricing: {
        Args: { p_blueprint_id: string; p_product_id: string }
        Returns: Json
      }
      get_product_stock_history: {
        Args: { p_limit?: number; p_product_id: string }
        Returns: {
          movement_date: string
          movement_type: string
          notes: string
          quantity: number
          quantity_after: number
          quantity_before: number
          reason: string
          reference_id: string
          reference_type: string
        }[]
      }
      get_push_tokens_for_customer: {
        Args: { p_customer_id: string }
        Returns: {
          pass_type_identifier: string
          push_token: string
          serial_number: string
        }[]
      }
      get_reconciliation_dashboard: {
        Args: { p_vendor_id: string }
        Returns: {
          oldest_unresolved_at: string
          queue_type: string
          total_resolved_last_7_days: number
          total_unresolved: number
        }[]
      }
      get_register_by_device: { Args: { p_device_id: string }; Returns: string }
      get_segment_customers: {
        Args: { p_segment_id: string }
        Returns: {
          customer_id: string
          customer_name: string
          email: string
          match_score: number
        }[]
      }
      get_user_locations: {
        Args: { p_user_id: string }
        Returns: {
          can_manage: boolean
          can_manage_inventory: boolean
          can_sell: boolean
          location_id: string
          location_name: string
        }[]
      }
      get_vendor_id_from_jwt: { Args: never; Returns: string }
      get_vendor_monthly_billing: {
        Args: { vendor_uuid: string }
        Returns: number
      }
      get_vendor_pricing: {
        Args: { p_blueprint_id: string; p_vendor_id: string }
        Returns: Json
      }
      get_wholesale_price: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: number
      }
      has_wholesale_access: { Args: { user_id: string }; Returns: boolean }
      increment_artifact_view_count: {
        Args: { artifact_uuid: string }
        Returns: undefined
      }
      increment_inventory: {
        Args: { p_inventory_id: string; p_quantity: number }
        Returns: Json
      }
      increment_media_usage: {
        Args: { p_component_id?: string; p_media_id: string }
        Returns: undefined
      }
      increment_session_counter: {
        Args: { p_amount: number; p_counter_name: string; p_session_id: string }
        Returns: undefined
      }
      increment_session_payment: {
        Args: {
          p_amount: number
          p_payment_method: string
          p_session_id: string
        }
        Returns: boolean
      }
      is_deal_active:
        | {
            Args: { deal_row: Database["public"]["Tables"]["deals"]["Row"] }
            Returns: boolean
          }
        | {
            Args: {
              deal_row: Database["public"]["Tables"]["deals"]["Row"]
              p_channel?: string
            }
            Returns: boolean
          }
      is_low_stock: {
        Args: { available_qty: number; threshold?: number }
        Returns: boolean
      }
      is_product_new: {
        Args: { created_at: string; new_badge_days?: number }
        Returns: boolean
      }
      is_promotion_active: {
        Args: {
          check_time?: string
          promo: Database["public"]["Tables"]["promotions"]["Row"]
        }
        Returns: boolean
      }
      link_media_to_product: {
        Args: { p_media_id: string; p_product_id: string }
        Returns: undefined
      }
      log_audit: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type?: string
          p_user_id: string
        }
        Returns: string
      }
      mark_order_push_completed: {
        Args: { p_queue_id: string }
        Returns: undefined
      }
      mark_order_push_failed: {
        Args: { p_error: string; p_queue_id: string }
        Returns: undefined
      }
      mark_pass_push_sent: {
        Args: { p_serial_numbers: string[] }
        Returns: number
      }
      mark_push_completed: { Args: { p_queue_id: string }; Returns: undefined }
      mark_push_failed: {
        Args: { p_error: string; p_queue_id: string }
        Returns: undefined
      }
      mark_reconciliation_resolved: {
        Args: {
          p_queue_type: string
          p_record_id: string
          p_resolution_notes?: string
          p_resolved_by: string
        }
        Returns: boolean
      }
      mark_transfer_in_transit: {
        Args: { p_tracking_number?: string; p_transfer_id: string }
        Returns: boolean
      }
      process_bulk_inventory_adjustments: {
        Args: {
          p_adjustments: Json
          p_idempotency_key?: string
          p_vendor_id: string
        }
        Returns: {
          adjustment_id: string
          error_message: string
          location_id: string
          product_id: string
          product_total_stock: number
          quantity_after: number
          quantity_before: number
          quantity_change: number
          success: boolean
        }[]
      }
      process_inventory_adjustment: {
        Args: {
          p_adjustment_type: string
          p_created_by?: string
          p_idempotency_key?: string
          p_location_id: string
          p_notes?: string
          p_product_id: string
          p_quantity_change: number
          p_reason: string
          p_reference_id?: string
          p_reference_type?: string
          p_vendor_id: string
        }
        Returns: {
          adjustment_id: string
          inventory_id: string
          product_total_stock: number
          quantity_after: number
          quantity_before: number
          quantity_change: number
        }[]
      }
      process_order_pass_push_queue: {
        Args: { p_batch_size?: number }
        Returns: {
          customer_id: string
          order_id: string
          payload: Json
          push_tokens: string[]
          push_type: string
          queue_id: string
          vendor_id: string
        }[]
      }
      process_wallet_push_queue: {
        Args: { p_batch_size?: number }
        Returns: {
          customer_id: string
          payload: Json
          push_tokens: string[]
          push_type: string
          queue_id: string
          vendor_id: string
        }[]
      }
      publish_artifact: {
        Args: { artifact_uuid: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "ai_artifacts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      receive_po_items: {
        Args: { p_items: Json; p_location_id: string; p_po_id: string }
        Returns: Json
      }
      record_affiliate_click: {
        Args: {
          p_ip_address?: unknown
          p_landing_page?: string
          p_referral_code: string
          p_referrer_url?: string
          p_session_id?: string
          p_user_agent?: string
          p_vendor_id: string
        }
        Returns: string
      }
      record_affiliate_conversion: {
        Args: {
          p_order_id: string
          p_referral_code?: string
          p_session_id?: string
        }
        Returns: string
      }
      refresh_segment_count: { Args: { p_segment_id: string }; Returns: number }
      refresh_tv_menu_inventory_cache: {
        Args: { p_location_id?: string; p_menu_id: string }
        Returns: number
      }
      register_customer_wallet_pass: {
        Args: {
          p_auth_token: string
          p_customer_id: string
          p_pass_type?: string
          p_serial_number: string
          p_vendor_id: string
        }
        Returns: string
      }
      register_device_for_customer_pass: {
        Args: {
          p_auth_token: string
          p_device_library_id: string
          p_pass_type_id: string
          p_push_token: string
          p_serial_number: string
        }
        Returns: Json
      }
      register_device_for_order_pass: {
        Args: {
          p_auth_token: string
          p_device_library_id: string
          p_pass_type_id: string
          p_push_token: string
          p_serial_number: string
        }
        Returns: Json
      }
      register_device_for_pass: {
        Args: {
          p_auth_token: string
          p_device_library_id: string
          p_pass_type_id: string
          p_push_token: string
          p_serial_number: string
        }
        Returns: Json
      }
      reject_affiliate_conversion: {
        Args: {
          p_approved_by: string
          p_conversion_id: string
          p_reason: string
        }
        Returns: boolean
      }
      release_expired_inventory_holds: { Args: never; Returns: number }
      release_inventory_holds: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: boolean
      }
      reserve_inventory: {
        Args: { p_items: Json; p_order_id: string }
        Returns: {
          returned_available_quantity: number
          returned_hold_id: string
          returned_inventory_id: string
          returned_product_id: string
          returned_quantity: number
        }[]
      }
      reserve_inventory_multilocation: {
        Args: {
          p_hold_duration_minutes?: number
          p_items: Json
          p_order_id: string
          p_vendor_id: string
        }
        Returns: {
          available_quantity: number
          error_message: string
          hold_id: string
          inventory_id: string
          location_id: string
          product_id: string
          requested_quantity: number
          success: boolean
        }[]
      }
      route_order_to_locations:
        | {
            Args: { p_order_id: string }
            Returns: {
              result_fulfillment_type: string
              result_item_count: number
              result_location_id: string
              result_location_name: string
            }[]
          }
        | {
            Args: {
              p_customer_lat?: number
              p_customer_lon?: number
              p_items: Json
              p_preferred_location_id?: string
              p_vendor_id: string
            }
            Returns: {
              available_quantity: number
              can_fulfill: boolean
              distance_km: number
              location_id: string
              location_name: string
              product_id: string
              quantity: number
            }[]
          }
      seed_vendor_email_templates: {
        Args: { p_vendor_id: string }
        Returns: undefined
      }
      send_wallet_notification: {
        Args: { p_customer_id: string; p_message: string; p_vendor_id: string }
        Returns: Json
      }
      set_config: {
        Args: {
          is_local?: boolean
          setting_name: string
          setting_value: string
        }
        Returns: string
      }
      set_vendor_context: {
        Args: { vendor_id_param: string }
        Returns: undefined
      }
      ship_order_from_location: {
        Args: {
          p_location_id: string
          p_order_id: string
          p_shipped_by_user_id?: string
          p_shipping_carrier?: string
          p_shipping_cost?: number
          p_tracking_number: string
          p_tracking_url?: string
        }
        Returns: {
          all_locations_shipped: boolean
          location_shipped: boolean
          remaining_locations_to_ship: string[]
          success: boolean
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sync_order_locations: { Args: { p_order_id: string }; Returns: undefined }
      unlink_media_from_product: {
        Args: { p_media_id: string; p_product_id: string }
        Returns: undefined
      }
      unpublish_artifact: {
        Args: { artifact_uuid: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "ai_artifacts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unregister_device_for_customer_pass: {
        Args: {
          p_auth_token: string
          p_device_library_id: string
          p_pass_type_id: string
          p_serial_number: string
        }
        Returns: Json
      }
      unregister_device_for_order_pass: {
        Args: {
          p_auth_token: string
          p_device_library_id: string
          p_pass_type_id: string
          p_serial_number: string
        }
        Returns: Json
      }
      unregister_device_for_pass: {
        Args: {
          p_auth_token: string
          p_device_library_id: string
          p_pass_type_id: string
          p_serial_number: string
        }
        Returns: Json
      }
      update_analytics_daily_cache: {
        Args: { p_date: string; p_vendor_id: string }
        Returns: undefined
      }
      update_customer_loyalty_points_atomic: {
        Args: {
          p_customer_id: string
          p_order_id: string
          p_order_total: number
          p_points_earned: number
          p_points_redeemed: number
        }
        Returns: boolean
      }
      update_product_image: {
        Args: { p_image_url: string; p_product_id: string; p_vendor_id: string }
        Returns: undefined
      }
      update_product_with_audit: {
        Args: {
          p_changed_by: string
          p_changes: Json
          p_metadata?: Json
          p_product_id: string
          p_vendor_id: string
        }
        Returns: string
      }
      update_products_pricing_from_template: {
        Args: {
          p_category_id: string
          p_template_id: string
          p_vendor_id: string
        }
        Returns: {
          updated_count: number
          updated_product_ids: string[]
        }[]
      }
      update_session_for_refund: {
        Args: { p_refund_amount: number; p_session_id: string }
        Returns: Json
      }
      update_session_on_void: {
        Args: { p_amount_to_subtract: number; p_session_id: string }
        Returns: Json
      }
      user_has_permission: {
        Args: { p_permission: string; p_user_id: string }
        Returns: boolean
      }
      validate_affiliate_code: {
        Args: { p_code: string; p_vendor_id: string }
        Returns: {
          affiliate_id: string
          commission_rate: number
          customer_discount_rate: number
          customer_discount_type: string
          error_message: string
          first_name: string
          is_valid: boolean
          last_name: string
          referral_code: string
        }[]
      }
      validate_pricing_migration: {
        Args: never
        Returns: {
          check_name: string
          details: string
          passed: boolean
        }[]
      }
      validate_product_fields: {
        Args: { p_category_id: string; p_custom_fields: Json }
        Returns: {
          missing_required_fields: string[]
        }[]
      }
    }
    Enums: {
      field_type:
        | "text"
        | "textarea"
        | "number"
        | "select"
        | "multiselect"
        | "checkbox"
        | "date"
        | "url"
        | "color"
        | "image"
        | "file"
      media_category:
        | "product_photos"
        | "marketing"
        | "menus"
        | "brand"
        | "social_media"
        | "print_marketing"
        | "promotional"
        | "brand_assets"
      media_status: "active" | "archived" | "processing"
      user_role:
        | "admin"
        | "vendor_owner"
        | "vendor_manager"
        | "location_manager"
        | "pos_staff"
        | "inventory_staff"
        | "readonly"
      vendor_type_enum: "standard" | "distributor" | "both"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      field_type: [
        "text",
        "textarea",
        "number",
        "select",
        "multiselect",
        "checkbox",
        "date",
        "url",
        "color",
        "image",
        "file",
      ],
      media_category: [
        "product_photos",
        "marketing",
        "menus",
        "brand",
        "social_media",
        "print_marketing",
        "promotional",
        "brand_assets",
      ],
      media_status: ["active", "archived", "processing"],
      user_role: [
        "admin",
        "vendor_owner",
        "vendor_manager",
        "location_manager",
        "pos_staff",
        "inventory_staff",
        "readonly",
      ],
      vendor_type_enum: ["standard", "distributor", "both"],
    },
  },
} as const

// =============================================================================
// CUSTOM HELPER TYPES
// =============================================================================

// Helper types for easier access
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

// Email Settings (matches vendor_email_settings table)
export interface VendorEmailSettings {
  id: string
  vendor_id: string
  from_name: string
  from_email: string
  reply_to: string | null
  domain: string
  domain_verified: boolean
  resend_domain_id: string | null
  email_header_image_url: string | null
  // Transactional email toggles
  enable_receipts: boolean
  enable_order_confirmations: boolean
  enable_order_updates: boolean
  enable_loyalty_updates: boolean
  enable_password_resets: boolean
  enable_welcome_emails: boolean
  // Marketing email settings
  enable_marketing: boolean
  require_double_opt_in: boolean
  // Custom content
  signature_html: string | null
  unsubscribe_footer_html: string | null
  created_at: string
  updated_at: string
}

// User with role and status for team management
export interface TeamUser {
  id: string
  vendor_id: string
  first_name: string
  last_name: string
  email: string
  role: 'vendor_owner' | 'vendor_manager' | 'location_manager' | 'pos_staff' | 'inventory_staff' | 'readonly' | 'admin'
  status: 'active' | 'inactive'
  location_ids: string[]
  created_at: string
  updated_at: string
}

// Supplier for inventory management
export interface Supplier {
  id: string
  vendor_id: string
  external_name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
