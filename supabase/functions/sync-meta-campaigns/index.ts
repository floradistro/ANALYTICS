import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { storeId } = await req.json()

    if (!storeId) {
      return new Response(
        JSON.stringify({ error: 'storeId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Meta integration
    const { data: integration, error: intError } = await supabase
      .from('meta_integrations')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'active')
      .single()

    if (intError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Meta integration not found', details: intError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Token is stored in access_token_encrypted field (but it's actually plaintext)
    const accessToken = integration.access_token_encrypted
    const adAccountId = integration.ad_account_id

    if (!accessToken || !adAccountId) {
      return new Response(
        JSON.stringify({ error: 'Missing access token or ad account ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch campaigns from Meta Marketing API
    const campaignsUrl = `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time&limit=100&access_token=${accessToken}`

    console.log('Fetching campaigns from:', adAccountId)

    const campaignsRes = await fetch(campaignsUrl)
    const campaignsData = await campaignsRes.json()

    if (campaignsData.error) {
      // Update integration with error
      await supabase
        .from('meta_integrations')
        .update({
          last_error: campaignsData.error.message,
          updated_at: new Date().toISOString()
        })
        .eq('store_id', storeId)

      return new Response(
        JSON.stringify({ error: 'Meta API error', details: campaignsData.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const campaigns = campaignsData.data || []
    let syncedCount = 0
    let insightsCount = 0

    console.log(`Found ${campaigns.length} campaigns`)

    // Process each campaign
    for (const campaign of campaigns) {
      // Fetch insights for this campaign (last 30 days)
      const insightsUrl = `https://graph.facebook.com/v21.0/${campaign.id}/insights?fields=impressions,reach,clicks,spend,cpc,cpm,ctr,actions,action_values&date_preset=last_30d&access_token=${accessToken}`

      let insights: any = {}
      try {
        const insightsRes = await fetch(insightsUrl)
        const insightsData = await insightsRes.json()
        insights = insightsData.data?.[0] || {}
        if (Object.keys(insights).length > 0) insightsCount++
      } catch (e) {
        console.error(`Failed to fetch insights for ${campaign.id}:`, e)
      }

      // Parse conversions from actions array
      let conversions = 0
      let conversionValue = 0
      if (insights.actions) {
        const purchaseAction = insights.actions.find((a: any) =>
          a.action_type === 'purchase' || a.action_type === 'omni_purchase'
        )
        if (purchaseAction) conversions = parseInt(purchaseAction.value) || 0
      }
      if (insights.action_values) {
        const purchaseValue = insights.action_values.find((a: any) =>
          a.action_type === 'purchase' || a.action_type === 'omni_purchase'
        )
        if (purchaseValue) conversionValue = parseFloat(purchaseValue.value) || 0
      }

      const spend = parseFloat(insights.spend) || 0

      // Upsert campaign
      const { error: upsertError } = await supabase
        .from('meta_campaigns')
        .upsert({
          store_id: storeId,
          meta_campaign_id: campaign.id,
          meta_account_id: adAccountId,
          name: campaign.name,
          status: campaign.status,
          effective_status: campaign.effective_status,
          objective: campaign.objective,
          daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
          lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
          budget_remaining: campaign.budget_remaining ? parseFloat(campaign.budget_remaining) / 100 : null,
          start_time: campaign.start_time,
          stop_time: campaign.stop_time,
          impressions: parseInt(insights.impressions) || 0,
          reach: parseInt(insights.reach) || 0,
          clicks: parseInt(insights.clicks) || 0,
          spend: spend,
          cpc: parseFloat(insights.cpc) || null,
          cpm: parseFloat(insights.cpm) || null,
          ctr: parseFloat(insights.ctr) || null,
          conversions: conversions,
          conversion_value: conversionValue,
          roas: spend > 0 ? conversionValue / spend : null,
          raw_insights: insights,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'store_id,meta_campaign_id',
        })

      if (upsertError) {
        console.error(`Failed to upsert campaign ${campaign.name}:`, upsertError)
      } else {
        syncedCount++
        console.log(`Synced: ${campaign.name} (${campaign.effective_status})`)
      }
    }

    // Clear last error on success
    await supabase
      .from('meta_integrations')
      .update({
        last_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('store_id', storeId)

    return new Response(
      JSON.stringify({
        success: true,
        campaigns_found: campaigns.length,
        campaigns_synced: syncedCount,
        with_insights: insightsCount,
        campaigns: campaigns.map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.effective_status
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
