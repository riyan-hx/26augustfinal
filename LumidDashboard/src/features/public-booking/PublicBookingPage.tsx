import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Clock, CreditCard, Shield, Video } from '../../lib/icons'
import { LumidLogo } from '../../components/LumidLogo'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews'
import { newIdempotencyKey } from '../../lib/api'
import { formatCountdown, formatDateTime, localDateKey } from '../../lib/dates'
import { env, isDemoMode } from '../../lib/env'
import { bookingUrlLabel } from '../../lib/links'
import { toApiError } from '../../lib/errors'
import { formatINR } from '../../lib/money'
import { bookingRequestSchema, fieldErrors } from '../../lib/schemas'
import { groupSlotsByDay } from '../../lib/slots'
import { useNow } from '../../lib/useNow'
import { createHold, getBookingStatus, getPublicProfile, getSlots, requestBooking, verifyPayment, type BookingRequestResult, type Hold, type PaymentProof, type PublicProfile } from './api'
import { openCheckout } from './razorpay'

/** 720 → "12 hours", 1440 → "1 day". */
function noticeLabel(min: number): string {
  if (min % 1440 === 0) return `${min / 1440} day${min === 1440 ? '' : 's'}`
  const h = Math.round(min / 60)
  return `${h} hour${h === 1 ? '' : 's'}`
}

type Phase = 'pick' | 'pay' | 'confirming' | 'done' | 'refund' | 'unsure' | 'requested'
/** Without online payments the patient requests a slot and pays the psychologist directly. */
const payAtSession = !isDemoMode && !env.onlinePayments
const POLL_MS = 3_000
const POLL_MAX_MS = 60_000
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function PublicBookingPage() {
  const { slug = 'demo' } = useParams()
  const profile = useQuery({ queryKey: ['public-profile', slug], queryFn: () => getPublicProfile(slug), retry: false })

  if (profile.isLoading) return <Shell><div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-72" /></div></Shell>
  if (profile.error) {
    const missing = toApiError(profile.error).code === 'NOT_FOUND'
    return (
      <Shell>
        <div className="bg-white border border-[var(--hairline)] rounded-[20px]">
          {missing
            ? <EmptyState icon={<CalendarDays size={18} />} title="This page isn’t available" description="The link may be mistyped, or this practice isn’t taking bookings right now." />
            : <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />}
        </div>
      </Shell>
    )
  }
  return <Shell slug={slug}><BookingFlow profile={profile.data!} /></Shell>
}

/** Fast path via verify; if that fails, poll the booking until the webhook confirms it. */
async function confirmPayment(h: Hold, proof: PaymentProof): Promise<Phase> {
  try {
    return (await verifyPayment(proof)) === 'confirmed' ? 'done' : 'refund'
  } catch { /* fall through to polling */ }
  const deadline = Date.now() + POLL_MAX_MS
  while (Date.now() < deadline) {
    await sleep(POLL_MS)
    try {
      const status = await getBookingStatus(h.bookingId, h.manageToken)
      if (status === 'confirmed' || status === 'completed') return 'done'
      if (status === 'expired' || status === 'cancelled') return 'refund'
    } catch { /* keep polling */ }
  }
  return 'unsure'
}

function Shell({ children, slug }: { children: ReactNode; slug?: string }) {
  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-[20px] border-b border-[var(--hairline)]">
        <div className="max-w-[980px] mx-auto px-4 lg:px-6 h-[52px] flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <LumidLogo className="h-[15px] sm:h-[17px]" />
            {slug && <span className="text-[10px] tracking-[0.12em] text-[var(--stone)] font-semibold hidden sm:inline border-l border-[var(--hairline)] pl-2.5 uppercase">{bookingUrlLabel(slug)}</span>}
          </span>
          <span className="text-[12px] text-[var(--stone)]">Secure • Private</span>
        </div>
      </header>
      <main className="max-w-[980px] mx-auto px-4 lg:px-6 py-8 lg:py-10">{children}</main>
    </div>
  )
}

function BookingFlow({ profile }: { profile: PublicProfile }) {
  const tz = profile.timezone
  const [sessionTypeId, setSessionTypeId] = useState(profile.sessionTypes[0]?.id ?? '')
  const [dayKey, setDayKey] = useState<string | null>(null)
  const [slot, setSlot] = useState<Date | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', note: '', accept_terms: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [phase, setPhase] = useState<Phase>('pick')
  const [hold, setHold] = useState<Hold | null>(null)
  const [requested, setRequested] = useState<BookingRequestResult | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const attemptKey = useRef<string | null>(null)
  const now = useNow(1000)

  const sessionType = profile.sessionTypes.find((s) => s.id === sessionTypeId)
  const range = useMemo(() => {
    const from = new Date()
    return { from, to: new Date(from.getTime() + Math.min(profile.bookingWindowDays, 14) * 86_400_000) }
  }, [profile.bookingWindowDays])
  const slots = useQuery({
    queryKey: ['public-slots', profile.slug, sessionTypeId, localDateKey(range.from, tz)],
    queryFn: () => getSlots(profile.slug, sessionTypeId, range.from, range.to, tz),
    enabled: !!sessionTypeId && phase === 'pick', staleTime: 15_000,
  })
  const days = useMemo(() => groupSlotsByDay(slots.data ?? [], tz), [slots.data, tz])
  const activeDay = days.find((d) => d.key === dayKey) ?? days[0]

  const holdLeft = hold && phase === 'pay' ? hold.holdExpiresAt.getTime() - now : null
  const holdExpired = holdLeft !== null && holdLeft <= 0

  useEffect(() => { attemptKey.current = null }, [sessionTypeId, slot, form])

  function resetToPick(message: string | null) {
    setHold(null); setSlot(null); setPhase('pick'); setNotice(message); attemptKey.current = null
    void slots.refetch()
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!slot || !sessionType) { setNotice('Choose a time first.'); return }
    const parsed = bookingRequestSchema.safeParse({ slug: profile.slug, session_type_id: sessionType.id, starts_at: slot.toISOString(), ...form })
    if (!parsed.success) {
      const found = fieldErrors(parsed.error)
      setErrors(found)
      if (Object.keys(found).some((k) => !['full_name', 'email', 'phone', 'note', 'accept_terms'].includes(k))) setNotice('Something went wrong with this selection. Please pick the time again.')
      return
    }
    setErrors({}); setNotice(null); setBusy(true)
    attemptKey.current ??= newIdempotencyKey()
    try {
      if (payAtSession) { setRequested(await requestBooking(parsed.data)); setPhase('requested'); return }
      setHold(await createHold(parsed.data, attemptKey.current)); setPhase('pay')
    } catch (error) {
      const err = toApiError(error)
      if (err.code === 'SLOT_UNAVAILABLE') resetToPick(err.userMessage)
      else if (err.code === 'VALIDATION_FAILED' && err.fields) setErrors(err.fields)
      else setNotice(err.userMessage)
    } finally { setBusy(false) }
  }

  async function pay() {
    if (!hold || !sessionType) return
    setBusy(true); setNotice(null)
    try {
      if (isDemoMode) { setPhase('confirming'); setPhase((await verifyPayment({ orderId: '', paymentId: '', signature: '' })) === 'confirmed' ? 'done' : 'refund'); return }
      const result = await openCheckout({
        keyId: hold.payment.keyId, orderId: hold.payment.orderId, amount: hold.payment.amount, currency: hold.payment.currency,
        title: profile.displayName, description: sessionType.name, prefill: { name: form.full_name, email: form.email, contact: form.phone || undefined },
      })
      if (result.kind === 'dismissed') setNotice('Payment wasn’t completed. Your time is still held — you can try again.')
      else if (result.kind === 'failed') setNotice(`${result.reason} You can try again while your time is held.`)
      else { setPhase('confirming'); setPhase(await confirmPayment(hold, { orderId: result.response.razorpay_order_id, paymentId: result.response.razorpay_payment_id, signature: result.response.razorpay_signature })) }
    } catch {
      setNotice('We couldn’t open the payment window. Check your connection and try again.')
    } finally { setBusy(false) }
  }

  if (phase === 'requested' && requested) return (
    <Panel tone="success" icon={<CheckCircle2 size={20} />} title="Your time is reserved"
      body={`${sessionType?.name ?? 'Session'} with ${profile.displayName} · ${formatDateTime(requested.startsAt, tz)}. ${profile.displayName} will confirm and share how to pay (${formatINR(requested.pricePaise)}) and the call link with you at ${form.email}.`}
      footer={<span className="font-mono text-[12px]">Booking ID {requested.code}</span>} />
  )
  if (phase === 'confirming') return <Panel tone="info" title="Confirming your payment…" body="This usually takes a few seconds. Please don’t close this page or pay again." spinner />
  if (phase === 'done' && hold) return (
    <Panel tone="success" icon={<CheckCircle2 size={20} />} title="You’re booked"
      body={`${sessionType?.name ?? 'Session'} with ${profile.displayName} · ${formatDateTime(hold.startsAt, tz)}. A confirmation with your Google Meet link is on its way to ${form.email}.`}
      footer={<span className="font-mono text-[12px]">Booking ID {hold.code}</span>} />
  )
  if (phase === 'refund') return (
    <Panel tone="warn" icon={<AlertTriangle size={20} />} title="Your payment will be refunded"
      body="Your payment arrived after the time was released, so the booking couldn’t be confirmed. The full amount is refunded automatically to your original payment method in 5–7 working days."
      action={<button className="btn-primary" onClick={() => resetToPick(null)}>Pick another time</button>} />
  )
  if (phase === 'unsure') return (
    <Panel tone="warn" icon={<Clock size={20} />} title="Still confirming your payment"
      body="We haven’t received the bank’s confirmation yet. Please don’t pay again. You’ll get an email as soon as it’s confirmed, and if it can’t be, you’re refunded automatically."
      footer={hold && <span className="font-mono text-[12px]">Booking ID {hold.code}</span>} />
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
      <PracticeCard profile={profile} />
      <section className="min-w-0 bg-white border border-[var(--hairline)] rounded-[20px] p-5 lg:p-6" aria-label="Book a session">
        {phase === 'pick' && (
          <form onSubmit={submit} noValidate className="space-y-5">
            <h2 className="text-[16px] font-semibold">Book a session</h2>
            {notice && <p role="alert" className="text-[12px] rounded-xl bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)] px-3 py-2">{notice}</p>}

            <fieldset>
              <legend className="field-label">Session</legend>
              <div className="space-y-2">
                {profile.sessionTypes.map((s) => (
                  <label key={s.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${s.id === sessionTypeId ? 'border-[var(--color-neutral-strong)] bg-[var(--color-canvas-parchment)]' : 'border-[var(--hairline)]'}`}>
                    <input type="radio" name="session" className="mt-1" checked={s.id === sessionTypeId} onChange={() => { setSessionTypeId(s.id); setSlot(null); setDayKey(null) }} />
                    <span className="flex-1"><span className="block text-[13px] font-semibold">{s.name}</span><span className="block text-[12px] text-[var(--stone)]">{s.durationMinutes} min{s.description ? ` · ${s.description}` : ''}</span></span>
                    <span className="text-[13px] font-semibold tabular-nums">{formatINR(s.pricePaise)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <p className="field-label">Choose a time <span className="font-normal text-[var(--stone)]">({tz.replace('_', ' ')}{profile.minNoticeMinutes >= 60 ? ` · book at least ${noticeLabel(profile.minNoticeMinutes)} ahead` : ''})</span></p>
              {slots.isLoading && <Skeleton className="h-24" />}
              {slots.error && <ErrorState compact error={slots.error} onRetry={() => void slots.refetch()} />}
              {!slots.isLoading && !slots.error && days.length === 0 && (
                <p className="text-[12px] text-[var(--stone)] rounded-xl border border-dashed border-[var(--hairline)] p-4">No open times in the next {Math.min(profile.bookingWindowDays, 14)} days. Please check back soon.</p>
              )}
              {days.length > 0 && activeDay && (
                <>
                  <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Day">
                    {days.map((d) => (
                      <button key={d.key} type="button" role="tab" aria-selected={d.key === activeDay.key} onClick={() => { setDayKey(d.key); setSlot(null) }}
                        className={`shrink-0 px-3 py-2 rounded-xl border text-[12px] font-medium ${d.key === activeDay.key ? 'bg-[var(--color-primary)] text-white border-transparent' : 'bg-white border-[var(--hairline)]'}`}>{d.label}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                    {activeDay.slots.map((s) => (
                      <button key={s.startsAt.toISOString()} type="button" aria-pressed={slot?.getTime() === s.startsAt.getTime()} onClick={() => setSlot(s.startsAt)}
                        className={`py-2 rounded-lg border text-[12px] font-medium tabular-nums ${slot?.getTime() === s.startsAt.getTime() ? 'bg-[var(--color-primary)] text-white border-transparent' : 'bg-white border-[var(--hairline)] hover:bg-[var(--color-canvas-parchment)]'}`}>{s.label}</button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {slot && (
              <div className="space-y-3 pt-1">
                <Field label="Full name" error={errors.full_name}><input className="field" autoComplete="name" value={form.full_name} aria-invalid={!!errors.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
                <Field label="Email" error={errors.email}><input className="field" type="email" autoComplete="email" value={form.email} aria-invalid={!!errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                <Field label="Phone (optional)" error={errors.phone}><input className="field" type="tel" autoComplete="tel" value={form.phone} aria-invalid={!!errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="Anything you’d like them to know (optional)" error={errors.note}><textarea className="field" rows={3} maxLength={1000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
                <label className="flex items-start gap-2 text-[12px]">
                  <input type="checkbox" className="mt-0.5" checked={form.accept_terms} onChange={(e) => setForm({ ...form, accept_terms: e.target.checked })} />
                  <span>I agree to the booking terms. Cancellation is free up to {profile.cancellationCutoffHours} hours before the session.</span>
                </label>
                {errors.accept_terms && <p className="form-error">{errors.accept_terms}</p>}
                <button className="btn-primary w-full justify-center" disabled={busy}>{busy ? 'Holding your time…' : payAtSession ? `Request this time${sessionType ? ` · ${formatINR(sessionType.pricePaise)}` : ''}` : `Continue to payment${sessionType ? ` · ${formatINR(sessionType.pricePaise)}` : ''}`}</button>
                <p className="text-[11px] text-[var(--stone)] text-center">{payAtSession ? 'No payment now. You pay the psychologist directly before the session.' : 'Your time is held for 10 minutes while you pay.'}</p>
              </div>
            )}
          </form>
        )}

        {phase === 'pay' && hold && sessionType && (
          <div className="space-y-4">
            <button className="inline-flex items-center gap-1.5 text-[12px] text-[var(--stone)]" onClick={() => resetToPick(null)}><ArrowLeft size={13} /> Change time</button>
            <h2 className="text-[16px] font-semibold">Complete your payment</h2>
            <div className="rounded-xl border border-[var(--hairline)] p-4 text-[13px] space-y-1">
              <p className="font-semibold">{sessionType.name}</p>
              <p className="text-[var(--stone)]">{formatDateTime(hold.startsAt, tz)}</p>
              <p className="tabular-nums font-semibold pt-1">{formatINR(sessionType.pricePaise)}</p>
            </div>
            {holdExpired ? (
              <div role="alert" className="rounded-xl bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)] p-4 text-[13px]">
                <p className="font-semibold">Your hold ended</p>
                <p className="text-[12px] mt-1">The time was released so others can book it. Pick a time again to continue.</p>
                <button className="btn-primary mt-3" onClick={() => resetToPick(null)}>Pick a time</button>
              </div>
            ) : (
              <>
                {notice && <p role="alert" className="text-[12px] rounded-xl bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)] px-3 py-2">{notice}</p>}
                <p className="text-[12px] text-[var(--stone)] flex items-center gap-1.5" aria-live="off"><Clock size={13} /> Time held for <span className="font-semibold tabular-nums text-[var(--ink)]">{formatCountdown(hold.holdExpiresAt, new Date(now))}</span></p>
                <button className="btn-primary w-full justify-center" disabled={busy} onClick={() => void pay()}><CreditCard size={14} /> {busy ? 'Opening payment…' : isDemoMode ? 'Pay (demo)' : 'Pay securely with Razorpay'}</button>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function PracticeCard({ profile }: { profile: PublicProfile }) {
  return (
    <div className="bg-white border border-[var(--hairline)] rounded-[20px] p-6 lg:p-8">
      <div className="flex gap-4">
        <Avatar name={profile.displayName} size={80} />
        <div>
          <h1 className="font-serif text-[24px] font-semibold leading-tight">{profile.displayName}</h1>
          <p className="text-[13px] text-[var(--stone)] mt-1">{[profile.title, profile.city, profile.yearsExperience ? `${profile.yearsExperience} years` : null, profile.languages.join(', ')].filter(Boolean).join(' • ')}</p>
          <div className="flex gap-1.5 mt-2 flex-wrap">{profile.specialties.map((s) => <span key={s} className="px-2.5 py-1 rounded-full bg-[var(--green-50)] border border-[var(--green-200)] text-[11px] font-medium text-[var(--green-700)]">{s}</span>)}</div>
        </div>
      </div>
      {profile.bio && <p className="text-[13px] leading-relaxed text-[var(--slate)] mt-4 whitespace-pre-line">{profile.bio}</p>}
      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
        <Chip icon={<Shield size={12} />}>Private &amp; consent-first</Chip>
        <Chip icon={<Video size={12} />}>Google Meet link after payment</Chip>
        <Chip icon={<Clock size={12} />}>Free cancellation up to {profile.cancellationCutoffHours}h before</Chip>
      </div>
    </div>
  )
}

const Chip = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--canvas)] border border-[var(--hairline)]">{icon} {children}</span>
)

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <div><label className="block"><span className="field-label">{label}</span>{children}</label>{error && <p role="alert" className="form-error">{error}</p>}</div>
}

function Panel({ tone, title, body, icon, spinner, action, footer }: {
  tone: 'success' | 'warn' | 'info'; title: string; body: string; icon?: ReactNode; spinner?: boolean; action?: ReactNode; footer?: ReactNode
}) {
  const color = tone === 'success' ? 'bg-[var(--badge-green-bg)] text-[var(--badge-green-fg)]' : tone === 'warn' ? 'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)]' : 'bg-[var(--color-canvas-parchment)] text-[var(--ink)]'
  return (
    <div role="status" className="max-w-[520px] mx-auto bg-white border border-[var(--hairline)] rounded-[20px] p-8 text-center">
      <span className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
        {spinner ? <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : icon}
      </span>
      <h1 className="text-[20px] font-semibold mt-4">{title}</h1>
      <p className="text-[13px] text-[var(--stone)] leading-relaxed mt-2">{body}</p>
      {action && <div className="mt-4">{action}</div>}
      {footer && <div className="mt-4 text-[var(--stone)]">{footer}</div>}
      {tone === 'success' && <Link to="/" className="sr-only">Home</Link>}
    </div>
  )
}
