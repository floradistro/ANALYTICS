import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as postgres from 'https://deno.land/x/postgres@v0.17.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { sql } = await req.json()

    if (!sql) {
      return new Response(
        JSON.stringify({ error: 'SQL is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Connect directly to Postgres
    const client = new postgres.Client({
      user: 'postgres',
      password: Deno.env.get('DB_PASSWORD') || 'fuckshitpisasscunt',
      hostname: 'db.uaednwpxursknmwdeejn.supabase.co',
      port: 5432,
      database: 'postgres',
      tls: {
        enabled: true,
        enforce: false,
        caCertificates: []
      }
    })

    await client.connect()

    const result = await client.queryArray(sql)

    await client.end()

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('SQL execution error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
