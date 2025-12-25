import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const resendApiKey = process.env.RESEND_API_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function POST(request: NextRequest) {
  try {
    if (!resend) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
    }

    const { campaignId } = await request.json()

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    // Fetch the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status === 'sent') {
      return NextResponse.json({ error: 'Campaign already sent' }, { status: 400 })
    }

    // Get vendor email settings
    const { data: emailSettings } = await supabase
      .from('vendor_email_settings')
      .select('from_name, from_email')
      .eq('store_id', campaign.store_id)
      .single()

    const fromName = emailSettings?.from_name || 'Flora Distro'
    const fromEmail = emailSettings?.from_email || 'noreply@floradistro.com'

    // Get segment customers
    const segmentId = campaign.target_audience?.segment_id
    let customers: { id: string; email: string; first_name: string | null }[] = []

    if (segmentId) {
      // First try to get from memberships table
      const { data: memberships } = await supabase
        .from('customer_segment_memberships')
        .select('customer_id')
        .eq('segment_id', segmentId)

      if (memberships && memberships.length > 0) {
        const customerIds = memberships.map(m => m.customer_id)
        const { data: customerData } = await supabase
          .from('customers')
          .select('id, email, first_name')
          .in('id', customerIds)
          .not('email', 'is', null)

        customers = customerData || []
      } else {
        // Fallback: query customers directly based on segment criteria
        const { data: segment } = await supabase
          .from('customer_segments')
          .select('name, filter_criteria')
          .eq('id', segmentId)
          .single()

        if (segment) {
          customers = await getCustomersForSegment(campaign.store_id, segment)
        }
      }
    } else {
      // No segment - get all customers with email and marketing consent
      const { data: allCustomers } = await supabase
        .from('customers')
        .select('id, email, first_name')
        .eq('store_id', campaign.store_id)
        .not('email', 'is', null)
        .limit(1000)

      customers = allCustomers || []
    }

    if (customers.length === 0) {
      await supabase
        .from('email_campaigns')
        .update({ status: 'draft', total_recipients: 0, total_sent: 0 })
        .eq('id', campaignId)

      return NextResponse.json({ error: 'No customers to send to', sent: 0 }, { status: 400 })
    }

    // Update campaign status
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sending',
        total_recipients: customers.length,
      })
      .eq('id', campaignId)

    // Send emails in batches
    let sentCount = 0
    let errorCount = 0
    const batchSize = 10 // Resend rate limits

    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize)

      await Promise.all(batch.map(async (customer) => {
        try {
          // Personalize content
          const personalizedHtml = (campaign.html_content || '')
            .replace(/{{first_name}}/g, customer.first_name || 'there')
            .replace(/{{email}}/g, customer.email)

          // Send via Resend
          const { data, error } = await resend.emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: customer.email,
            subject: campaign.subject,
            html: personalizedHtml || `<p>${campaign.subject}</p>`,
          })

          if (error) {
            console.error(`Failed to send to ${customer.email}:`, error)
            errorCount++
          } else {
            sentCount++

            // Log the send
            await supabase.from('email_sends').insert({
              store_id: campaign.store_id,
              customer_id: customer.id,
              campaign_id: campaignId,
              email_type: 'marketing',
              to_email: customer.email,
              to_name: customer.first_name,
              from_email: fromEmail,
              from_name: fromName,
              subject: campaign.subject,
              resend_email_id: data?.id,
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
          }
        } catch (err) {
          console.error(`Error sending to ${customer.email}:`, err)
          errorCount++
        }
      }))

      // Small delay between batches
      if (i + batchSize < customers.length) {
        await new Promise(r => setTimeout(r, 100))
      }
    }

    // Update campaign with final counts
    await supabase
      .from('email_campaigns')
      .update({
        status: 'sent',
        total_sent: sentCount,
        sent_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    return NextResponse.json({
      success: true,
      sent: sentCount,
      errors: errorCount,
      total: customers.length,
    })

  } catch (error) {
    console.error('Send campaign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper to query customers based on segment criteria
async function getCustomersForSegment(
  storeId: string,
  segment: { name: string; filter_criteria: any }
): Promise<{ id: string; email: string; first_name: string | null }[]> {
  const criteria = segment.filter_criteria || {}

  // Build query based on segment name/criteria
  let query = supabase
    .from('customers')
    .select('id, email, first_name')
    .eq('store_id', storeId)
    .not('email', 'is', null)

  // VIP Customers - high spenders
  if (criteria.total_spent?.min) {
    query = query.gte('total_spent', criteria.total_spent.min)
  }

  // At Risk - days since last order
  if (criteria.days_since_last_order) {
    const minDays = criteria.days_since_last_order.min || 0
    const maxDays = criteria.days_since_last_order.max || 365
    const minDate = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString()
    const maxDate = new Date(Date.now() - minDays * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('last_order_at', minDate).lte('last_order_at', maxDate)
  }

  // New Customers - recent first order
  if (segment.name.toLowerCase().includes('new')) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('first_order_at', thirtyDaysAgo)
  }

  // Never Ordered
  if (segment.name.toLowerCase().includes('never ordered')) {
    query = query.is('first_order_at', null)
  }

  // Limit for safety
  query = query.limit(5000)

  const { data } = await query

  return data || []
}
