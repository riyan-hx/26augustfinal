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

const DEMO_KEY = 'lumid.demo'

/** True when the visitor chose "Explore with demo data" on the sign-in page. */
export const demoRequested = (() => {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem(DEMO_KEY) === '1' } catch { return false }
})()

export const isDemoMode =
  !env.supabaseUrl || !env.supabaseAnonKey || import.meta.env.VITE_DEMO_MODE === 'true' || demoRequested

/** Switches this browser to the sample practice (no account, nothing saved to the server). */
export function enterDemo(path = '/app') {
  try { localStorage.setItem(DEMO_KEY, '1') } catch { /* storage blocked: demo can't persist */ }
  window.location.assign(path)
}

/** Leaves the sample practice and returns to sign-in. */
export function exitDemo() {
  try { localStorage.removeItem(DEMO_KEY) } catch { /* nothing to clear */ }
  window.location.assign('/login')
}
