import { useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { emailSchema } from '../../lib/schemas'
import { toApiError } from '../../lib/errors'
import { supabaseClient } from '../../lib/supabase'
import { LumidLogo } from '../../components/LumidLogo'
import { PrimaryButton } from '../../components/ui/StateViews'
import { useAuth } from './AuthProvider'

/** Only same-site paths are allowed as a post-login destination. */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/app'
}

export default function LoginPage() {
  const auth = useAuth()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (auth.status === 'signed-in') return <Navigate to={next} replace />

  const redirectTo = `${window.location.origin}${next}`

  async function sendLink(e: FormEvent) {
    e.preventDefault()
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email.')
      return
    }
    if (!supabaseClient) return
    setError(null)
    setSending(true)
    const { error: authError } = await supabaseClient.auth.signInWithOtp({
      email: parsed.data,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    })
    setSending(false)
    if (authError) setError(authError.status === 429 ? 'Too many attempts. Try again in a minute.' : toApiError(authError).userMessage)
    else setSentTo(parsed.data)
  }

  async function withGoogle() {
    if (!supabaseClient) return
    const { error: authError } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (authError) setError(toApiError(authError).userMessage)
  }

  return (
    <main className="min-h-screen bg-[var(--color-canvas-parchment)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <LumidLogo className="h-[22px] mb-8" />
        <div className="bg-white border border-[var(--hairline)] rounded-[16px] p-6">
          {sentTo ? (
            <div aria-live="polite">
              <h1 className="text-[20px] font-semibold text-[var(--ink)]">Check your email</h1>
              <p className="text-[13px] text-[var(--stone)] mt-2 leading-relaxed">
                We sent a sign-in link to <span className="font-semibold text-[var(--ink)]">{sentTo}</span>. It works once and expires in an hour.
              </p>
              <button className="btn-secondary mt-5" onClick={() => setSentTo(null)}>Use a different email</button>
            </div>
          ) : (
            <>
              <h1 className="text-[20px] font-semibold text-[var(--ink)]">Sign in to your practice</h1>
              <p className="text-[13px] text-[var(--stone)] mt-1">New here? The same link creates your account.</p>

              <button type="button" onClick={withGoogle} className="btn-secondary w-full mt-6 !py-2.5 !text-[13px]">
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-5 text-[11px] text-[var(--stone)]">
                <span className="h-px flex-1 bg-[var(--hairline)]" /> or <span className="h-px flex-1 bg-[var(--hairline)]" />
              </div>

              <form onSubmit={sendLink} noValidate>
                <label htmlFor="login-email" className="field-label">Work email</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="field"
                  placeholder="you@practice.in"
                />
                {error && <p id="login-error" className="form-error">{error}</p>}
                <PrimaryButton type="submit" loading={sending} className="w-full mt-4">Email me a sign-in link</PrimaryButton>
              </form>
            </>
          )}
        </div>
        <p className="text-[11px] text-[var(--stone)] mt-4 leading-relaxed">
          By continuing you agree to Lumid’s Terms and Data Processing Agreement.
        </p>
      </div>
    </main>
  )
}
