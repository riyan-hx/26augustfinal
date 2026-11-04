import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isDemoMode } from './env'

const client: SupabaseClient | null = isDemoMode
  ? null
  : createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    })

/** The Supabase client. Only feature api.ts modules may call this. */
export function db(): SupabaseClient {
  if (!client) throw new Error('Supabase is not configured (demo mode).')
  return client
}

export const supabaseClient = client
