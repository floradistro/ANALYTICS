import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

// Using untyped client for flexibility - types are defined locally in components
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const createServerClient = () => {
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  return createClient(supabaseUrl, serviceRoleKey)
}
