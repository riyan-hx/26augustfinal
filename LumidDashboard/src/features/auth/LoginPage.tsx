import { useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { emailSchema } from '../../lib/schemas'
import { toApiError } from '../../lib/errors'
import { supabaseClient } from '../../lib/supabase'
import { enterDemo } from '../../lib/env'
import { LumidLogo } from '../../components/LumidLogo'
import { PrimaryButton } from '../../components/ui/StateViews'
import { useAuth } from './AuthProvider'

type Mode = 'signin' | 'signup' | 'forgot' | 'link'

const MIN_PASSWORD = 8

/** Only in-app paths (under /app) are allowed as a post-login destination; rejects //host and backslashes. */
function safeNext(raw: string | null): string {
  if (!raw || raw.includes('\\') || raw.startsWith('//')) return '/app'
  return /^\/app(?:[/?#]|$)/.test(raw) ? raw : '/app'
}

function googleErrorMessage(error: { message: string }) {
  if (/unsupported provider|provider is not enabled/i.test(error.message)) {
    return 'Google sign-in is not enabled for this app yet. Enable Google in Supabase under Authentication → Sign In / Providers, then try again.'
  }
  return toApiError(error).userMessage
}

const COPY: Record<Mode, { title: string; blurb: string; submit: string }> = {
  signin: { title: 'Welcome back', blurb: 'Sign in to your practice with your email and password.', submit: 'Sign in' },
  signup: { title: 'Create your account', blurb: 'Set a password, then a three-minute setup gets your booking page ready.', submit: 'Create account' },
  forgot: { title: 'Reset your password', blurb: 'Enter your email and we’ll send you a link to choose a new password.', submit: 'Send reset link' },
  link: { title: 'Sign in with a link', blurb: 'We’ll email you a one-time link. New here? It creates your account too.', submit: 'Email me a sign-in link' },
}

export default function LoginPage() {
  const auth = useAuth()
  const [params, setParams] = useSearchParams()
  const next = safeNext(params.get('next'))
  const resetting = params.get('mode') === 'reset'
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null)

  if (auth.status === 'signed-in' && !resetting) return <Navigate to={next} replace />

  const redirectTo = `${window.location.origin}${next}`
  const copy = COPY[mode]

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setNotice(null)
  }

  async function run(action: () => Promise<void>) {
    if (!supabaseClient) return
    setError(null)
    setBusy(true)
    try { await action() } catch (e) { setError(toApiError(e).userMessage) } finally { setBusy(false) }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Enter a valid email.'); return }
    const address = parsed.data
    if ((mode === 'signin' || mode === 'signup') && !password) { setError('Enter your password.'); return }
    if (mode === 'signup' && password.length < MIN_PASSWORD) { setError(`Use at least ${MIN_PASSWORD} characters.`); return }

    void run(async () => {
      const client = supabaseClient!
      if (mode === 'signin') {
        const { error: err } = await client.auth.signInWithPassword({ email: address, password })
        if (err) setError(err.status === 400 ? 'That email and password don’t match.' : toApiError(err).userMessage)
      } else if (mode === 'signup') {
        const { data, error: err } = await client.auth.signUp({ email: address, password, options: { emailRedirectTo: redirectTo } })
        if (err) setError(err.status === 429 ? 'Too many attempts. Try again in a minute.' : toApiError(err).userMessage)
        else if (!data.session) setNotice({ title: 'Confirm your email', body: `We sent a confirmation link to ${address}. Open it on this device to finish creating your account.` })
      } else if (mode === 'forgot') {
        const { error: err } = await client.auth.resetPasswordForEmail(address, { redirectTo: `${window.location.origin}/login?mode=reset` })
        if (err) setError(err.status === 429 ? 'Too many attempts. Try again in a minute.' : toApiError(err).userMessage)
        else setNotice({ title: 'Check your email', body: `If an account exists for ${address}, a reset link is on its way. It expires in an hour.` })
      } else {
        const { error: err } = await client.auth.signInWithOtp({ email: address, options: { emailRedirectTo: redirectTo, shouldCreateUser: true } })
        if (err) setError(err.status === 429 ? 'Too many attempts. Try again in a minute.' : toApiError(err).userMessage)
        else setNotice({ title: 'Check your email', body: `We sent a sign-in link to ${address}. Open it on this device — it works once and expires in an hour.` })
      }
    })
  }

  function saveNewPassword(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) { setError(`Use at least ${MIN_PASSWORD} characters.`); return }
    void run(async () => {
      const { error: err } = await supabaseClient!.auth.updateUser({ password })
      if (err) { setError(toApiError(err).userMessage); return }
      setParams({}, { replace: true })
    })
  }

  async function withGoogle() {
    if (!supabaseClient) return
    setError(null)
    setGoogleLoading(true)
    try {
      const { error: authError } = await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
      if (authError) setError(googleErrorMessage(authError))
    } catch (authError) {
      setError(toApiError(authError).userMessage)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-canvas-parchment)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <LumidLogo className="h-[22px] mb-8" />
        <div className="bg-white border border-[var(--hairline)] rounded-[16px] p-6">
          {resetting && auth.status === 'signed-in' ? (
            <form onSubmit={saveNewPassword} noValidate>
              <h1 className="text-[20px] font-semibold text-[var(--ink)]">Choose a new password</h1>
              <p className="text-[13px] text-[var(--stone)] mt-1 leading-relaxed">Use at least {MIN_PASSWORD} characters.</p>
              <label htmlFor="new-password" className="field-label mt-5">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
              {error && <p className="form-error" role="alert">{error}</p>}
              <PrimaryButton type="submit" loading={busy} className="w-full mt-4">Save password</PrimaryButton>
            </form>
          ) : notice ? (
            <div aria-live="polite">
              <h1 className="text-[20px] font-semibold text-[var(--ink)]">{notice.title}</h1>
              <p className="text-[13px] text-[var(--stone)] mt-2 leading-relaxed">{notice.body}</p>
              <button className="btn-secondary mt-5" onClick={() => switchMode('signin')}>Back to sign in</button>
            </div>
          ) : (
            <>
              <h1 className="text-[20px] font-semibold text-[var(--ink)]">{copy.title}</h1>
              <p className="text-[13px] text-[var(--stone)] mt-1 leading-relaxed">{copy.blurb}</p>

              {(mode === 'signin' || mode === 'signup') && (
                <>
                  <button type="button" onClick={withGoogle} disabled={googleLoading || busy} className="btn-secondary w-full mt-6 !py-2.5 !text-[13px]">
                    {googleLoading ? 'Connecting to Google…' : 'Continue with Google'}
                  </button>
                  <div className="flex items-center gap-3 my-5 text-[11px] text-[var(--stone)]">
                    <span className="h-px flex-1 bg-[var(--hairline)]" /> or <span className="h-px flex-1 bg-[var(--hairline)]" />
                  </div>
                </>
              )}

              <form onSubmit={submit} noValidate className={mode === 'forgot' || mode === 'link' ? 'mt-6' : undefined}>
                <label htmlFor="login-email" className="field-label">Email</label>
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
                {(mode === 'signin' || mode === 'signup') && (
                  <>
                    <label htmlFor="login-password" className="field-label mt-3">Password</label>
                    <input id="login-password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password}
                      onChange={(e) => setPassword(e.target.value)} className="field" />
                  </>
                )}
                {mode === 'signin' && (
                  <button type="button" className="btn-link mt-2" onClick={() => switchMode('forgot')}>Forgot password?</button>
                )}
                {error && <p id="login-error" className="form-error" role="alert">{error}</p>}
                <PrimaryButton type="submit" loading={busy} disabled={googleLoading} className="w-full mt-4">{copy.submit}</PrimaryButton>
              </form>

              <div className="mt-3 flex flex-col gap-1">
                {mode === 'signin' && <button type="button" className="btn-link w-full" onClick={() => switchMode('signup')}>New here? Create an account</button>}
                {mode === 'signup' && <button type="button" className="btn-link w-full" onClick={() => switchMode('signin')}>Already have an account? Sign in</button>}
                {(mode === 'forgot' || mode === 'link') && <button type="button" className="btn-link w-full" onClick={() => switchMode('signin')}>Back to sign in</button>}
                {(mode === 'signin' || mode === 'signup') && <button type="button" className="btn-link w-full" onClick={() => switchMode('link')}>Email me a sign-in link instead</button>}
              </div>

              <div className="mt-5 pt-5 border-t border-[var(--hairline)]">
                <button type="button" className="btn-secondary w-full" onClick={() => enterDemo(next)}>Explore with demo data</button>
                <p className="text-[11px] text-[var(--stone)] mt-2 text-center">A sample practice in this browser only. No account, nothing is saved.</p>
              </div>
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
