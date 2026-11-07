import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, CalendarDays, Check, Clock, CreditCard, Lock, Moon, Sun, Sunrise } from '../../lib/icons'
import { LumidLogo } from '../../components/LumidLogo'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/StateViews'
import { newIdempotencyKey } from '../../lib/api'
import { formatCountdown, formatDateTime, localDateKey } from '../../lib/dates'
import { env, isDemoMode } from '../../lib/env'
import { bookingUrlLabel } from '../../lib/links'
import { toApiError } from '../../lib/errors'
import { formatINR } from '../../lib/money'
import { bookingRequestSchema, fieldErrors } from '../../lib/schemas'
import { groupSlotsByDay, type SlotDay } from '../../lib/slots'
import { useNow } from '../../lib/useNow'
import { createHold, getBookingStatus, getPublicProfile, getSlots, requestBooking, verifyPayment, manageUrl, type BookingRequestResult, type Hold, type PaymentProof, type PublicProfile } from './api'
import { openCheckout } from './razorpay'
import { ProfileDetails, ProfileHero } from './ProfileSections'
import { firstName } from './theme'
import { BookingSuccess } from './BookingSuccess'

/** 720 → "12 hours", 1440 → "1 day". */
function noticeLabel(min: number): string {
  if (min % 1440 === 0) return `${min / 1440} day${min === 1440 ? '' : 's'}`
  const h = Math.round(min / 60)
  return `${h} hour${h === 1 ? '' : 's'}`
}

type Phase = 'pick' | 'pay' | 'confirming' | 'done' | 'refund' | 'unsure' | 'requested'
/**
 * Without online payments (the default, demo included) the patient requests a
 * slot and pays the psychologist directly; with them, Razorpay checkout.
 */
const payAtSession = !env.onlinePayments
const POLL_MS = 3_000
const POLL_MAX_MS = 60_000
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function PublicBookingPage() {
  const { slug = 'demo' } = useParams()
  const profile = useQuery({ queryKey: ['public-profile', slug], queryFn: () => getPublicProfile(slug), retry: false })

  if (profile.isLoading) return <Shell><div className="space-y-4"><Skeleton className="h-[300px] rounded-[28px]" /><div className="grid lg:grid-cols-[1fr_400px] gap-6"><Skeleton className="h-96 rounded-[24px]" /><Skeleton className="h-96 rounded-[24px]" /></div></div></Shell>
  if (profile.error) {
    const missing = toApiError(profile.error).code === 'NOT_FOUND'
    return (
      <Shell>
        <div className="max-w-[560px] mx-auto bg-white border border-[var(--hairline)] rounded-[24px]">
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

export function Shell({ children, slug }: { children: ReactNode; slug?: string }) {
  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-[20px] border-b border-[var(--hairline)]">
        <div className="max-w-[1160px] mx-auto px-4 lg:px-6 h-[56px] flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <LumidLogo className="h-[15px] sm:h-[17px]" />
            {slug && <span className="text-[11px] text-[var(--stone)] font-medium hidden sm:inline border-l border-[var(--hairline)] pl-2.5">{bookingUrlLabel(slug)}</span>}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--slate)] rounded-full border border-[var(--hairline)] bg-white px-3 py-1.5"><Lock size={13} /> Secure booking</span>
        </div>
      </header>
      <main className="max-w-[1160px] mx-auto px-4 lg:px-6 py-6 lg:py-10 pb-28 lg:pb-12">{children}</main>
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
  const bookRef = useRef<HTMLElement>(null)
  const detailsRef = useRef<HTMLDivElement>(null)
  const now = useNow(1000)
  const qc = useQueryClient()

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
  useEffect(() => { if (slot) detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [slot])
  const success = phase === 'done' || phase === 'requested'
  useEffect(() => { if (success) window.scrollTo({ top: 0 }) }, [success])

  const scrollToBook = () => bookRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  function resetToPick(message: string | null) {
    setHold(null); setSlot(null); setPhase('pick'); setNotice(message); attemptKey.current = null
    void slots.refetch()
  }

  function bookAnother() {
    setRequested(null); setForm((f) => ({ ...f, note: '', accept_terms: false })); resetToPick(null)
    requestAnimationFrame(scrollToBook)
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
      if (payAtSession) {
        setRequested(await requestBooking(parsed.data)); setPhase('requested')
        void qc.invalidateQueries() // the taken slot (and, in demo, the dashboard) must not come from cache
        return
      }
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
    <BookingSuccess kind="requested" profile={profile} sessionName={sessionType?.name ?? 'Session'} startsAt={requested.startsAt} endsAt={requested.endsAt}
      code={requested.code} email={form.email} patientName={form.full_name} pricePaise={requested.pricePaise}
      manageUrl={manageUrl(requested.bookingId, requested.manageToken)} onBookAnother={bookAnother} />
  )
  if (phase === 'done' && hold) return (
    <BookingSuccess kind="paid" profile={profile} sessionName={sessionType?.name ?? 'Session'} startsAt={hold.startsAt} endsAt={hold.endsAt}
      code={hold.code} email={form.email} patientName={form.full_name} pricePaise={sessionType?.pricePaise ?? hold.payment.amount}
      manageUrl={isDemoMode ? null : manageUrl(hold.bookingId, hold.manageToken)} onBookAnother={bookAnother} />
  )
  if (phase === 'confirming') return <Panel tone="info" title="Confirming your payment…" body="This usually takes a few seconds. Please don’t close this page or pay again." spinner />
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

  const from = Math.min(...profile.sessionTypes.map((s) => s.pricePaise))

  return (
    <>
      <ProfileHero profile={profile} onBook={scrollToBook} />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
        <ProfileDetails profile={profile} />

        <section ref={bookRef} id="book" aria-label="Book a session"
          className="scroll-mt-20 lg:sticky lg:top-[76px] min-w-0 rounded-[24px] bg-white border border-[var(--hairline)] shadow-[0_18px_48px_-28px_rgba(36,46,33,0.35)] overflow-hidden">
          <div className="px-5 sm:px-6 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, #EAF6E1 0%, #F4F9EF 55%, #FFFFFF 100%)' }}>
            <p className="text-[12px] font-semibold text-[#2F6B1F]">Book with {firstName(profile.displayName)}</p>
            <h2 className="text-[19px] font-semibold tracking-[-0.02em] mt-0.5">Find a time that works</h2>
          </div>

          {phase === 'pick' && (
            <form onSubmit={submit} noValidate className="px-5 sm:px-6 pb-6 pt-4 space-y-6">
              {notice && <p role="alert" className="text-[12px] rounded-xl bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)] px-3 py-2">{notice}</p>}

              <fieldset>
                <StepLabel n={1} done={!!sessionType}>Choose a session</StepLabel>
                <div className="space-y-2">
                  {profile.sessionTypes.map((s) => {
                    const on = s.id === sessionTypeId
                    return (
                      <label key={s.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-colors ${on ? 'border-[#4FA82E] bg-[#F4FAEE] ring-1 ring-[#4FA82E]' : 'border-[var(--hairline)] hover:bg-[var(--canvas)]'}`}>
                        <input type="radio" name="session" className="sr-only" checked={on} onChange={() => { setSessionTypeId(s.id); setSlot(null); setDayKey(null) }} />
                        <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 ${on ? 'border-[#4FA82E] bg-[#4FA82E] text-white' : 'border-[var(--hairline-strong,var(--hairline))]'}`}>{on && <Check size={12} strokeWidth={3} />}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[14px] font-semibold">{s.name}</span>
                          <span className="flex items-start gap-1 text-[12px] text-[var(--stone)] mt-0.5"><Clock size={12} className="shrink-0 mt-[3px]" /> {s.durationMinutes} min{s.description ? ` · ${s.description}` : ''}</span>
                        </span>
                        <span className="text-[14px] font-semibold tabular-nums">{formatINR(s.pricePaise)}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <div>
                <StepLabel n={2} done={!!slot}>Pick a day and time</StepLabel>
                <p className="text-[12px] text-[var(--stone)] -mt-1 mb-3">{tz.replace('_', ' ')}{profile.minNoticeMinutes >= 60 ? ` · book at least ${noticeLabel(profile.minNoticeMinutes)} ahead` : ''}</p>
                {slots.isLoading && <Skeleton className="h-32 rounded-2xl" />}
                {slots.error && <ErrorState compact error={slots.error} onRetry={() => void slots.refetch()} />}
                {!slots.isLoading && !slots.error && days.length === 0 && (
                  <p className="text-[13px] text-[var(--stone)] rounded-2xl border border-dashed border-[var(--hairline)] p-4">No open times in the next {Math.min(profile.bookingWindowDays, 14)} days. Please check back soon.</p>
                )}
                {days.length > 0 && activeDay && (
                  <>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x" role="tablist" aria-label="Day">
                      {days.map((d) => <DayPill key={d.key} day={d} tz={tz} active={d.key === activeDay.key} onClick={() => { setDayKey(d.key); setSlot(null) }} />)}
                    </div>
                    <TimeGroups day={activeDay} tz={tz} selected={slot} onPick={setSlot} />
                  </>
                )}
              </div>

              {slot && sessionType && (
                <div ref={detailsRef} className="space-y-3 scroll-mt-24">
                  <StepLabel n={3} done={false}>Your details</StepLabel>
                  <div className="flex items-center gap-3 rounded-2xl px-3.5 py-3" style={{ background: '#E6F0FA', color: '#24537A' }}>
                    <CalendarDays size={16} />
                    <span className="text-[13px] font-semibold flex-1">{formatDateTime(slot, tz)}</span>
                    <button type="button" className="text-[12px] font-semibold underline underline-offset-2" onClick={() => setSlot(null)}>Change</button>
                  </div>
                  <Field label="Full name" error={errors.full_name}><input className="field !min-h-[44px]" autoComplete="name" value={form.full_name} aria-invalid={!!errors.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
                  <Field label="Email" error={errors.email}><input className="field !min-h-[44px]" type="email" autoComplete="email" value={form.email} aria-invalid={!!errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                  <Field label="Phone (optional)" error={errors.phone}><input className="field !min-h-[44px]" type="tel" autoComplete="tel" value={form.phone} aria-invalid={!!errors.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                  <Field label="Anything you’d like them to know (optional)" error={errors.note}><textarea className="field" rows={3} maxLength={1000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
                  <label className="flex items-start gap-2.5 text-[12px] text-[var(--slate)]">
                    <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#4FA82E]" checked={form.accept_terms} onChange={(e) => setForm({ ...form, accept_terms: e.target.checked })} />
                    <span>I agree to the booking terms. Cancellation is free up to {profile.cancellationCutoffHours} hours before the session.</span>
                  </label>
                  {errors.accept_terms && <p className="form-error">{errors.accept_terms}</p>}
                  <button className="btn-primary w-full justify-center !min-h-[48px] !text-[15px]" disabled={busy}>
                    {busy ? 'Holding your time…' : payAtSession ? `Request this time · ${formatINR(sessionType.pricePaise)}` : `Continue to payment · ${formatINR(sessionType.pricePaise)}`}
                  </button>
                  <p className="text-[12px] text-[var(--stone)] text-center flex items-center justify-center gap-1.5"><Lock size={12} />{payAtSession ? 'No payment now. You pay the psychologist directly.' : 'Your time is held for 10 minutes while you pay.'}</p>
                </div>
              )}
            </form>
          )}

          {phase === 'pay' && hold && sessionType && (
            <div className="px-5 sm:px-6 pb-6 pt-4 space-y-4">
              <button className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--stone)]" onClick={() => resetToPick(null)}><ArrowLeft size={13} /> Change time</button>
              <h3 className="text-[16px] font-semibold">Complete your payment</h3>
              <div className="rounded-2xl border border-[var(--hairline)] p-4 text-[13px] space-y-1">
                <p className="font-semibold">{sessionType.name}</p>
                <p className="text-[var(--stone)]">{formatDateTime(hold.startsAt, tz)}</p>
                <p className="tabular-nums font-semibold text-[18px] pt-1">{formatINR(sessionType.pricePaise)}</p>
              </div>
              {holdExpired ? (
                <div role="alert" className="rounded-2xl bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)] p-4 text-[13px]">
                  <p className="font-semibold">Your hold ended</p>
                  <p className="text-[12px] mt-1">The time was released so others can book it. Pick a time again to continue.</p>
                  <button className="btn-primary mt-3" onClick={() => resetToPick(null)}>Pick a time</button>
                </div>
              ) : (
                <>
                  {notice && <p role="alert" className="text-[12px] rounded-xl bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)] px-3 py-2">{notice}</p>}
                  <p className="text-[12px] text-[var(--stone)] flex items-center gap-1.5" aria-live="off"><Clock size={13} /> Time held for <span className="font-semibold tabular-nums text-[var(--ink)]">{formatCountdown(hold.holdExpiresAt, new Date(now))}</span></p>
                  <button className="btn-primary w-full justify-center !min-h-[48px] !text-[15px]" disabled={busy} onClick={() => void pay()}><CreditCard size={16} /> {busy ? 'Opening payment…' : isDemoMode ? 'Pay (demo)' : 'Pay securely with Razorpay'}</button>
                </>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Mobile: booking always one tap away */}
      {phase === 'pick' && !slot && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-[16px] border-t border-[var(--hairline)] px-4 py-3 flex items-center gap-3">
          <span className="flex-1 min-w-0">
            <span className="block text-[12px] text-[var(--stone)]">Sessions from</span>
            <span className="block text-[15px] font-semibold tabular-nums">{Number.isFinite(from) ? formatINR(from) : ''}</span>
          </span>
          <button type="button" className="btn-primary !min-h-[44px] !px-5 !text-[14px]" onClick={scrollToBook}><CalendarDays size={16} /> Book a session</button>
        </div>
      )}
    </>
  )
}

function StepLabel({ n, done, children }: { n: number; done: boolean; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[14px] font-semibold mb-3">
      <span className={`w-6 h-6 rounded-full text-[12px] inline-flex items-center justify-center ${done ? 'bg-[#4FA82E] text-white' : 'bg-[var(--canvas)] text-[var(--slate)] border border-[var(--hairline)]'}`}>{done ? <Check size={12} strokeWidth={3} /> : n}</span>
      {children}
    </p>
  )
}

function DayPill({ day, tz, active, onClick }: { day: SlotDay; tz: string; active: boolean; onClick: () => void }) {
  const d = day.slots[0]!.startsAt
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { timeZone: tz, ...o }).format(d)
  return (
    <button type="button" role="tab" aria-selected={active} aria-label={day.label} onClick={onClick}
      className={`snap-start shrink-0 w-[64px] py-2.5 rounded-2xl border text-center transition-colors ${active ? 'bg-[var(--color-forest)] text-white border-transparent shadow-[0_6px_16px_-6px_rgba(36,46,33,0.5)]' : 'bg-white border-[var(--hairline)] hover:bg-[var(--canvas)]'}`}>
      <span className={`block text-[11px] font-semibold uppercase ${active ? 'text-white/75' : 'text-[var(--stone)]'}`}>{f({ weekday: 'short' })}</span>
      <span className="block text-[20px] font-semibold leading-tight tabular-nums">{f({ day: 'numeric' })}</span>
      <span className={`block text-[10px] font-medium ${active ? 'text-[var(--color-lime)]' : 'text-[#2F6B1F]'}`}>{day.slots.length} open</span>
    </button>
  )
}

function TimeGroups({ day, tz, selected, onPick }: { day: SlotDay; tz: string; selected: Date | null; onPick: (d: Date) => void }) {
  const hourOf = (d: Date) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(d))
  const groups = [
    { key: 'Morning', icon: <Sunrise size={14} />, slots: day.slots.filter((s) => hourOf(s.startsAt) < 12) },
    { key: 'Afternoon', icon: <Sun size={14} />, slots: day.slots.filter((s) => { const h = hourOf(s.startsAt); return h >= 12 && h < 17 }) },
    { key: 'Evening', icon: <Moon size={14} />, slots: day.slots.filter((s) => hourOf(s.startsAt) >= 17) },
  ].filter((g) => g.slots.length)
  return (
    <div className="mt-4 space-y-4">
      {groups.map((g) => (
        <div key={g.key}>
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--stone)] mb-2">{g.icon}{g.key}</p>
          <div className="grid grid-cols-3 gap-2">
            {g.slots.map((s) => {
              const on = selected?.getTime() === s.startsAt.getTime()
              return (
                <button key={s.startsAt.toISOString()} type="button" aria-pressed={on} onClick={() => onPick(s.startsAt)}
                  className={`h-10 rounded-xl border text-[13px] font-semibold tabular-nums transition-all ${on ? 'bg-[var(--color-lime)] text-[var(--color-forest)] border-transparent shadow-[0_6px_16px_-6px_rgba(96,170,60,0.6)] scale-[1.03]' : 'bg-white border-[var(--hairline)] hover:border-[#4FA82E] hover:bg-[#F4FAEE]'}`}>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <div><label className="block"><span className="field-label">{label}</span>{children}</label>{error && <p role="alert" className="form-error">{error}</p>}</div>
}

export function Panel({ tone, title, body, icon, spinner, action, footer }: {
  tone: 'success' | 'warn' | 'info'; title: string; body: string; icon?: ReactNode; spinner?: boolean; action?: ReactNode; footer?: ReactNode
}) {
  const color = tone === 'success' ? 'bg-[var(--badge-green-bg)] text-[var(--badge-green-fg)]' : tone === 'warn' ? 'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)]' : 'bg-[var(--color-canvas-parchment)] text-[var(--ink)]'
  return (
    <div role="status" className="max-w-[520px] mx-auto bg-white border border-[var(--hairline)] rounded-[24px] p-8 text-center">
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
