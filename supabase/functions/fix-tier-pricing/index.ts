import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Update the function to handle tiered pricing
    const updateFunctionSQL = `
      CREATE OR REPLACE FUNCTION update_inventory_market_value_by_category()
      RETURNS void AS $$
      BEGIN
        WITH category_averages AS (
          SELECT
            cat.id as category_id,
            cat.name as category_name,
            CASE
              WHEN cat.name = 'Flower' THEN
                SUM(oi.line_subtotal) / NULLIF(SUM(oi.quantity_grams), 0)
              ELSE
                SUM(oi.line_subtotal) / NULLIF(
                  SUM(
                    CASE
                      WHEN oi.line_subtotal BETWEEN 20 AND 35 THEN 1
                      WHEN oi.line_subtotal BETWEEN 40 AND 55 THEN 2
                      WHEN oi.line_subtotal BETWEEN 60 AND 75 THEN 3
                      WHEN oi.line_subtotal BETWEEN 80 AND 95 THEN 4
                      WHEN oi.line_subtotal BETWEEN 100 AND 115 THEN 5
                      ELSE oi.quantity
                    END
                  ),
                  0
                )
            END as avg_price
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          JOIN products p ON p.id = oi.product_id
          JOIN categories cat ON cat.id = p.primary_category_id
          WHERE o.payment_status = 'paid'
            AND o.status != 'cancelled'
            AND o.created_at >= NOW() - INTERVAL '30 days'
          GROUP BY cat.id, cat.name
        )
        UPDATE inventory i
        SET
          nrv_per_unit = COALESCE(ca.avg_price, 0),
          lcm_value = COALESCE(ca.avg_price, 0),
          last_nrv_update = NOW()
        FROM products p
        LEFT JOIN category_averages ca ON ca.category_id = p.primary_category_id
        WHERE i.product_id = p.id
          AND i.quantity > 0;
      END;
      $$ LANGUAGE plpgsql;
    `

    // Execute the function update (this requires elevated privileges)
    // Note: This won't work without a way to execute raw SQL
    // For now, just call the existing function and return instructions

    const { data, error } = await supabaseClient.rpc('update_inventory_market_value_by_category')

    if (error) {
      console.error('Update error:', error)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Please run the following SQL in Supabase SQL Editor to enable tiered pricing',
        sql: updateFunctionSQL,
        current_update_ran: !error
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
