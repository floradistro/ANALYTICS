import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Script to run COGS migration directly
async function runMigration() {
  console.log('🚀 Starting COGS Migration...\n')

  // Create Supabase client with service role
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

  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20251215_cogs_tracking_system.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log(`📄 Migration file loaded (${migrationSQL.split('\n').length} lines)\n`)

    // Split into logical blocks and execute
    const blocks = migrationSQL.split('-- ============================================================================')
      .filter(block => block.trim().length > 0)

    console.log(`📦 Found ${blocks.length} migration blocks\n`)

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim()
      if (!block) continue

      // Extract title from comment
      const titleMatch = block.match(/^--\s*(.+?)$/m)
      const title = titleMatch ? titleMatch[1].trim() : `Block ${i + 1}`

      console.log(`\n${'='.repeat(70)}`)
      console.log(`📝 Executing: ${title}`)
      console.log('='.repeat(70))

      // Split block into statements
      const statements = block.split(';')
        .map(s => s.trim())
        .filter(s => {
          // Remove pure comment lines
          const cleanS = s.replace(/--.*$/gm, '').trim()
          return cleanS.length > 0 && !cleanS.startsWith('--')
        })

      console.log(`   Found ${statements.length} statements in this block`)

      for (let j = 0; j < statements.length; j++) {
        const statement = statements[j]
        if (!statement || statement.length < 10) continue

        // Get first line for logging
        const firstLine = statement.split('\n')[0].slice(0, 80)
        console.log(`   [${j + 1}/${statements.length}] ${firstLine}...`)

        try {
          // Execute via RPC if available, otherwise try direct query
          const { error } = await supabase.rpc('exec_sql', {
            sql_string: statement + ';'
          })

          if (error) {
            // Try direct query method
            const { error: directError } = await (supabase as any).from('_').rpc('query', {
              query: statement + ';'
            })

            if (directError) {
              console.error(`   ❌ Error: ${error.message}`)
              // Continue to next statement
            } else {
              console.log(`   ✅ Success (direct)`)
            }
          } else {
            console.log(`   ✅ Success`)
          }
        } catch (err: any) {
          console.error(`   ❌ Exception: ${err.message}`)
        }
      }
    }

    console.log('\n\n' + '='.repeat(70))
    console.log('🎉 Migration execution completed!')
    console.log('='.repeat(70))
    console.log('\n📋 Next steps:')
    console.log('   1. Check Supabase logs for any errors')
    console.log('   2. Run: npm run backfill-cogs')
    console.log('   3. Verify COGS data in analytics\n')

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✅ Script completed')
      process.exit(0)
    })
    .catch((err) => {
      console.error('❌ Script failed:', err)
      process.exit(1)
    })
}

export default runMigration
