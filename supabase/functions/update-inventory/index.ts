import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
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

    // Optional: Add authentication/authorization here
    // For example, check for a secret token in the request headers
    const authHeader = req.headers.get('Authorization')
    const expectedSecret = Deno.env.get('UPDATE_INVENTORY_SECRET')

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Call the SQL function to update inventory market values
    const { data, error } = await supabaseClient.rpc('update_inventory_market_value_by_category')

    if (error) {
      console.error('Error updating inventory:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get summary stats to return
    const { data: stats, error: statsError } = await supabaseClient
      .from('inventory')
      .select('quantity, nrv_per_unit, lcm_value')
      .gt('quantity', 0)

    const summary = stats ? {
      total_items: stats.length,
      total_quantity: stats.reduce((sum, item) => sum + (item.quantity || 0), 0),
      total_market_value: stats.reduce((sum, item) => sum + ((item.quantity || 0) * (item.lcm_value || 0)), 0),
    } : null

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Inventory market values updated successfully',
        summary
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
