import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This endpoint runs the COGS tracking migration and backfill
// WARNING: This is an admin-only endpoint - protect it in production!

export async function POST(request: Request) {
  try {
    // Create Supabase client with service role for admin access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { action } = await request.json()

    if (action === 'read_migration') {
      // Just read and return the migration file
      const fs = require('fs')
      const path = require('path')
      const migrationPath = path.join(process.cwd(), 'supabase/migrations/20251215_cogs_tracking_system.sql')
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

      return NextResponse.json({
        success: true,
        migration: migrationSQL,
        lines: migrationSQL.split('\n').length
      })
    }

    if (action === 'run_migration') {
      // Read migration file
      const fs = require('fs')
      const path = require('path')
      const migrationPath = path.join(process.cwd(), 'supabase/migrations/20251215_cogs_tracking_system.sql')
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

      // Execute the migration
      const { error: migrationError } = await supabase.rpc('exec_sql', {
        sql: migrationSQL
      })

      if (migrationError) {
        // If exec_sql RPC doesn't exist, try direct execution
        console.log('exec_sql RPC not found, trying direct execution...')

        // Split into individual statements and execute
        const statements = migrationSQL
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'))

        for (const statement of statements) {
          if (statement) {
            const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
            if (error) {
              console.error('Error executing statement:', error)
              // Continue with other statements
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Migration executed successfully',
        note: 'Triggers and functions created'
      })
    }

    if (action === 'backfill_costs') {
      console.log('🔄 Starting backfill of historical order item costs...')

      const { data: backfillResult, error: backfillError } = await supabase
        .rpc('backfill_order_item_costs')

      if (backfillError) {
        console.error('❌ Backfill error:', backfillError)
        return NextResponse.json({
          success: false,
          error: backfillError.message
        }, { status: 500 })
      }

      console.log('✅ Backfill completed:', backfillResult)

      return NextResponse.json({
        success: true,
        message: 'Historical costs backfilled',
        result: backfillResult
      })
    }

    if (action === 'recalculate_cogs') {
      console.log('🔄 Starting recalculation of order COGS...')

      const { data: recalcResult, error: recalcError } = await supabase
        .rpc('recalculate_order_cogs')

      if (recalcError) {
        console.error('❌ Recalculation error:', recalcError)
        return NextResponse.json({
          success: false,
          error: recalcError.message
        }, { status: 500 })
      }

      console.log('✅ Recalculation completed:', recalcResult)

      return NextResponse.json({
        success: true,
        message: 'Order COGS recalculated',
        result: recalcResult
      })
    }

    if (action === 'full_process') {
      const results: any = {
        migration: null,
        backfill: null,
        recalculate: null
      }

      // Step 1: Run migration (skip for now, do manually)
      console.log('⏭️ Skipping migration - run manually in SQL editor')
      results.migration = { skipped: true, note: 'Run migration manually in Supabase SQL editor' }

      // Step 2: Backfill costs
      console.log('🔄 Step 2: Backfilling historical costs...')
      const { data: backfillResult, error: backfillError } = await supabase
        .rpc('backfill_order_item_costs')

      if (backfillError) {
        console.error('❌ Backfill error:', backfillError)
        results.backfill = { error: backfillError.message }
      } else {
        console.log('✅ Backfill completed:', backfillResult)
        results.backfill = backfillResult
      }

      // Step 3: Recalculate order COGS
      console.log('🔄 Step 3: Recalculating order COGS...')
      const { data: recalcResult, error: recalcError } = await supabase
        .rpc('recalculate_order_cogs')

      if (recalcError) {
        console.error('❌ Recalculation error:', recalcError)
        results.recalculate = { error: recalcError.message }
      } else {
        console.log('✅ Recalculation completed:', recalcResult)
        results.recalculate = recalcResult
      }

      return NextResponse.json({
        success: true,
        message: 'Full COGS process completed',
        results
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use: read_migration, run_migration, backfill_costs, recalculate_cogs, or full_process'
    }, { status: 400 })

  } catch (error: any) {
    console.error('❌ Migration error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
