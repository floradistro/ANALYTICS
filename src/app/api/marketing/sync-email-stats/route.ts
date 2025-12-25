import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const resendApiKey = process.env.RESEND_API_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { storeId } = await request.json()

    if (!storeId) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 })
    }

    // Get email sends that need status updates
    const { data: sends } = await supabase
      .from('email_sends')
      .select('id, resend_email_id')
      .eq('store_id', storeId)
      .not('resend_email_id', 'is', null)
      .is('delivered_at', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!sends || sends.length === 0) {
      return NextResponse.json({ message: 'No emails to sync', updated: 0 })
    }

    let updatedCount = 0

    // Check each email status via Resend API
    for (const send of sends) {
      try {
        const response = await fetch(`https://api.resend.com/emails/${send.resend_email_id}`, {
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
          },
        })

        if (!response.ok) continue

        const emailData = await response.json()
        const updates: Record<string, any> = {}

        // Map Resend status to our fields
        if (emailData.last_event === 'delivered' || emailData.last_event === 'opened' || emailData.last_event === 'clicked') {
          updates.delivered_at = emailData.created_at
          updates.status = 'delivered'
        }

        if (emailData.last_event === 'opened') {
          updates.opened_at = new Date().toISOString()
        }

        if (emailData.last_event === 'clicked') {
          updates.clicked_at = new Date().toISOString()
          if (!updates.opened_at) updates.opened_at = new Date().toISOString()
        }

        if (emailData.last_event === 'bounced') {
          updates.bounced_at = new Date().toISOString()
          updates.status = 'bounced'
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from('email_sends')
            .update(updates)
            .eq('id', send.id)
          updatedCount++
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 50))
      } catch (err) {
        console.error(`Error syncing email ${send.id}:`, err)
      }
    }

    // Update campaign stats
    const { data: campaignSends } = await supabase
      .from('email_sends')
      .select('campaign_id, delivered_at, opened_at, clicked_at, bounced_at')
      .eq('store_id', storeId)
      .not('campaign_id', 'is', null)

    if (campaignSends) {
      // Group by campaign
      const campaignStats = new Map<string, { delivered: number; opened: number; clicked: number; bounced: number }>()

      campaignSends.forEach(send => {
        if (!send.campaign_id) return
        const stats = campaignStats.get(send.campaign_id) || { delivered: 0, opened: 0, clicked: 0, bounced: 0 }
        if (send.delivered_at) stats.delivered++
        if (send.opened_at) stats.opened++
        if (send.clicked_at) stats.clicked++
        if (send.bounced_at) stats.bounced++
        campaignStats.set(send.campaign_id, stats)
      })

      // Update each campaign
      for (const [campaignId, stats] of campaignStats) {
        await supabase
          .from('email_campaigns')
          .update({
            total_delivered: stats.delivered,
            total_opened: stats.opened,
            total_clicked: stats.clicked,
            total_bounced: stats.bounced,
          })
          .eq('id', campaignId)
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
    })

  } catch (error) {
    console.error('Sync email stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
