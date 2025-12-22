import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY

/**
 * GET /api/emails/[id]
 * Fetches a single email's details from Resend API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 })
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 })
    }

    console.log(`Fetching email from Resend: ${id}`)

    // Fetch email details from Resend API
    const response = await fetch(`https://api.resend.com/emails/${id}`, {
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const responseText = await response.text()
    console.log(`Resend API response (${response.status}):`, responseText)

    if (!response.ok) {
      return NextResponse.json({
        error: 'Failed to fetch email from Resend',
        details: responseText,
        status: response.status
      }, { status: 200 }) // Return 200 so frontend can read the error
    }

    const email = JSON.parse(responseText)
    return NextResponse.json({ email })
  } catch (error) {
    console.error('Error fetching email:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}
