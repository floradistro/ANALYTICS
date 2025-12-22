import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY

/**
 * GET /api/emails?order_number=xxx
 * Fetches emails from Resend API filtered by order number in subject
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderNumber = searchParams.get('order_number')
    const customerEmail = searchParams.get('customer_email')

    if (!orderNumber && !customerEmail) {
      return NextResponse.json({ error: 'order_number or customer_email is required' }, { status: 400 })
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json({ emails: [], error: 'Resend API not configured' }, { status: 200 })
    }

    // Fetch emails from Resend API
    const listResponse = await fetch('https://api.resend.com/emails', {
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!listResponse.ok) {
      const error = await listResponse.text()
      console.error('Resend API error:', error)
      return NextResponse.json({ emails: [], error: 'Failed to fetch from Resend' }, { status: 200 })
    }

    const data = await listResponse.json()
    let emails = data.data || []

    // Filter by order number in subject (case-insensitive, exact match)
    if (orderNumber && emails.length > 0) {
      emails = emails.filter((email: any) =>
        email.subject?.includes(orderNumber)
      )
    }

    // Filter by customer email if provided
    if (customerEmail && emails.length > 0) {
      emails = emails.filter((email: any) => {
        const toAddresses = Array.isArray(email.to) ? email.to : [email.to]
        return toAddresses.some((to: string) => to.toLowerCase().includes(customerEmail.toLowerCase()))
      })
    }

    return NextResponse.json({ emails, source: 'resend_api' })
  } catch (error) {
    console.error('Error fetching emails:', error)
    return NextResponse.json({ emails: [], error: 'Internal server error' }, { status: 200 })
  }
}
