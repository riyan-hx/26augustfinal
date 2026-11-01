// Runtime configuration. Without Supabase env vars the app runs in demo mode
// on local fixtures, so previews and the current public demo keep working.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const functionsUrl = import.meta.env.VITE_FUNCTIONS_URL as string | undefined

export const env = {
  supabaseUrl: supabaseUrl ?? '',
  supabaseAnonKey: supabaseAnonKey ?? '',
  functionsUrl: functionsUrl ?? (supabaseUrl ? `${supabaseUrl}/functions/v1` : ''),
  publicSiteDomain: (import.meta.env.VITE_PUBLIC_SITE_DOMAIN as string | undefined) ?? '',
  appUrl: (import.meta.env.VITE_APP_URL as string | undefined) ?? '',
  /** Razorpay checkout through Edge Functions. Off: patients request a slot and pay at the session. */
  onlinePayments: import.meta.env.VITE_ONLINE_PAYMENTS === 'true',
}

export const isDemoMode =
  !env.supabaseUrl || !env.supabaseAnonKey || import.meta.env.VITE_DEMO_MODE === 'true'
