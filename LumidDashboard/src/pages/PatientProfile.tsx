import { useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Video, FileText, ShieldCheck, Sparkles, Clock, CheckCircle2, Eye, ArrowUpRight, Users } from '../lib/icons'
import { formatDay } from '../lib/dates'
import { formatINR } from '../lib/money'
import { relativeDateTime, relativeDaysAgo } from '../lib/format'
import { isDemoMode } from '../lib/env'
import { useNow } from '../lib/useNow'
import { toApiError } from '../lib/errors'
import { usePatient } from '../features/patients/hooks'
import { NotesPanel } from '../features/care/NotesPanel'
import { PatientFollowUps } from '../features/care/FollowUps'
import { useBookings } from '../features/bookings/hooks'
import { PaymentBadge } from '../components/ui/PaymentBadge'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState, ErrorState, Skeleton } from '../components/ui/StateViews'
import type { BookingStatus, BookingSummary } from '../types/domain'

const timelineTitle: Record<BookingStatus, string> = {
  completed: 'Session completed',
  confirmed: 'Session booked',
  pending_payment: 'Booking awaiting payment',
  cancelled: 'Booking cancelled',
  no_show: 'Missed session',
  expired: 'Booking not completed',
}

export default function PatientProfile() {
  const { id = '' } = useParams()
  const patient = usePatient(id)
  const history = useBookings({ patientId: id })
  const now = useNow()
  const { hash } = useLocation()
  const loaded = !!patient.data

  // `#notes-h` (linked from Overview) scrolls to the notes once the profile has rendered.
  // The section's scroll-margin keeps it clear of the sticky header.
  useEffect(() => {
    if (!loaded || !hash) return
    const id = requestAnimationFrame(() => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)))
      ;(target?.closest('section') ?? target)?.scrollIntoView({ block: 'start' })
    })
    return () => cancelAnimationFrame(id)
  }, [loaded, hash])

  if (patient.isLoading) return <ProfileSkeleton />

  if (patient.error) {
    const notFound = toApiError(patient.error).code === 'NOT_FOUND'
    return (
      <div className="px-4 lg:px-6 py-6">
        <BackLink />
        <div className="mt-4 bg-white border border-[var(--hairline)] rounded-[16px]">
          {notFound ? (
            <EmptyState icon={<Users size={18} />} title="Patient not found" description="This record doesn’t exist or isn’t part of your practice."
              action={<Link to="/app/patients" className="btn-secondary">Back to patients</Link>} />
          ) : (
            <ErrorState error={patient.error} onRetry={() => void patient.refetch()} />
          )}
        </div>
      </div>
    )
  }

  const p = patient.data!
  const bookings = history.data ?? []
  // One source for "Next" (header and side card): the soonest future, live booking.
  const next = bookings.find((b) => b.startsAt.getTime() > now && (b.status === 'confirmed' || b.status === 'pending_payment'))
  const nextLabel = next ? relativeDateTime(next.startsAt) : history.isLoading ? '…' : 'Not scheduled'
  const upcoming = bookings.filter((b) => b.startsAt.getTime() > now && b.status !== 'cancelled' && b.status !== 'expired')
  const past = [...bookings].filter((b) => !upcoming.includes(b)).reverse()

  return (
    <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
      <BackLink />

      <div className="mt-3 bg-white border border-[var(--hairline)] rounded-[16px] p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex gap-4">
            <Avatar name={p.name} size={56} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[24px] font-semibold tracking-tight leading-none">{p.name}</h1>
                <span className={`badge capitalize ${p.status === 'active' ? 'badge--green' : p.status === 'lapsed' ? 'badge--amber' : p.status === 'new' ? 'badge--sky' : 'badge--neutral'}`}>{p.status}</span>
              </div>
              <p className="text-[12px] text-[var(--stone)] mt-2">
                {p.sessionsCompleted} {p.sessionsCompleted === 1 ? 'session' : 'sessions'} • Last session: {p.lastSessionAt ? relativeDaysAgo(p.lastSessionAt) : '—'} • Next: {nextLabel}
              </p>
              <p className="text-[12px] text-[var(--stone)] mt-1">{p.email}{p.phone ? ` • ${p.phone}` : ''}</p>
              {p.focus && <p className="text-[12px] mt-2"><span className="px-2.5 py-1 rounded-full bg-[var(--color-primary-tint)] border border-[var(--hairline)] text-[var(--color-forest)] font-medium">{p.focus}</span></p>}
            </div>
          </div>
          <div className="lg:ml-auto flex flex-wrap gap-2">
            {next?.meetUrl && (
              <a href={next.meetUrl} target="_blank" rel="noreferrer" className="btn-primary order-last"><Video size={14} /> Join next session</a>
            )}
            <a href="#notes-h" className="btn-secondary"><FileText size={14} /> Notes</a>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-4">
            {isDemoMode && <DemoBetweenSessions />}

            <section className="rounded-[12px] border border-[var(--hairline)] p-4" aria-labelledby="timeline-h">
              {upcoming.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">UPCOMING</p>
                  <div className="mt-3 mb-5 space-y-3">
                    {upcoming.map((b) => <TimelineItem key={b.id} booking={b} active={false} />)}
                  </div>
                </>
              )}
              <p id="timeline-h" className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">HISTORY</p>
              {history.isLoading && <div className="mt-3 space-y-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /></div>}
              {history.error && <ErrorState compact error={history.error} onRetry={() => void history.refetch()} />}
              {!history.isLoading && !history.error && past.length === 0 && (
                <p className="text-[12px] text-[var(--stone)] mt-2">No past sessions yet. History builds up after the first session.</p>
              )}
              <div className="mt-3 space-y-3">
                {past.map((b, i) => <TimelineItem key={b.id} booking={b} active={i === 0} />)}
              </div>
            </section>

            <NotesPanel patientId={p.id} />

            <Link to="/app/insights" className="flex items-center gap-3 bg-[var(--surface-warm)] border border-dashed border-[var(--hairline-strong)] rounded-[16px] px-4 py-3.5 hover:bg-[var(--surface-soft)] transition">
              <Sparkles size={15} className="text-[var(--color-primary)] shrink-0" />
              <p className="text-[12px] text-[var(--slate)]"><span className="font-medium text-[var(--ink)]">Coming next:</span> patterns across this patient's sessions, shown with evidence and confidence — only with their consent.</p>
              <ArrowUpRight size={13} className="ml-auto text-[var(--stone)] shrink-0" />
            </Link>
          </div>

          <div className="space-y-4">
            <div className={`rounded-[12px] border p-4 ${next ? 'bg-[var(--color-primary-tint)] border-[color-mix(in_oklch,var(--color-primary)_22%,var(--color-hairline))]' : 'border-[var(--hairline)]'}`}>
              <p className={`text-[11px] font-semibold tracking-[0.08em] flex items-center gap-1.5 ${next ? 'text-[var(--badge-green-fg)]' : 'text-[var(--stone)]'}`}><Clock size={12} /> NEXT SESSION</p>
              {next ? (
                <>
                  <p className="text-[17px] font-semibold mt-1.5 text-[var(--color-forest)]">{relativeDateTime(next.startsAt)}</p>
                  <p className="text-[12px] text-[var(--stone)] flex flex-wrap items-center gap-1.5">{next.sessionTypeName} • {formatINR(next.pricePaise)} <PaymentBadge booking={next} /></p>
                </>
              ) : (
                <p className="text-[13px] text-[var(--stone)] mt-1">Not scheduled</p>
              )}
            </div>

            <PatientFollowUps patientId={p.id} />

            <div className="rounded-[12px] border border-[var(--hairline)] p-4">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)] flex items-center gap-1.5"><ShieldCheck size={12} /> CONSENT & PRIVACY</p>
              <div className="mt-3 space-y-2 text-[12px]">
                <div className="flex justify-between"><span>Booking terms</span><span className="font-semibold text-[var(--badge-green-fg)]">Accepted</span></div>
                <div className="flex justify-between"><span>Private Lumid conversations</span><span className="font-semibold text-[var(--stone)]">Not shared</span></div>
                <div className="flex justify-between"><span>Check-ins & summaries</span><span className="font-semibold text-[var(--stone)]">Not shared</span></div>
              </div>
              <p className="text-[11px] text-[var(--stone)] mt-3 leading-relaxed">Patient controls what you see. Consent is explicit, specific, and revocable.</p>
            </div>

            <Link to="/app/patients" className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[var(--stone)] hover:text-[var(--ink)] py-1">
              <Eye size={12} /> View all patients
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/** "← Patients", returning to the list with the filter/search the user came from. */
function BackLink() {
  const state = useLocation().state as { from?: unknown } | null
  const to = typeof state?.from === 'string' && state.from.startsWith('/app/patients') ? state.from : '/app/patients'
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 -ml-1 px-1 py-0.5 rounded-md text-[12px] font-semibold text-[var(--color-ink-muted-48)] hover:text-[var(--color-primary)] transition-colors">
      <ArrowLeft size={14} /> Patients
    </Link>
  )
}

function TimelineItem({ booking, active }: { booking: BookingSummary; active: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full border-2 ${active ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-hairline-strong)] bg-white'} mt-1`} />
        <div className="w-px flex-1 bg-[var(--hairline)] mt-1" />
      </div>
      <div>
        <p className="text-[10px] font-semibold tracking-[0.08em] text-[var(--stone)] uppercase">{formatDay(booking.startsAt)}</p>
        <p className="text-[12px] font-semibold leading-none mt-0.5">{timelineTitle[booking.status]}</p>
        <p className="text-[11px] text-[var(--stone)] leading-snug mt-1">{booking.sessionTypeName} • {booking.code}</p>
      </div>
    </div>
  )
}

/** Illustrative between-session card, shown only in the demo until check-ins ship (Phase 4). */
function DemoBetweenSessions() {
  return (
    <div className="rounded-[12px] border border-[var(--hairline)] p-4">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">BETWEEN SESSIONS <span className="ml-1 font-normal normal-case tracking-normal">· demo</span></p>
      <div className="flex items-center gap-2 mt-2">
        <span className="badge badge--green"><CheckCircle2 size={12} /> 2 of 3 actions completed</span>
        <span className="text-[11px] text-[var(--stone)]">Last check-in 1 day ago</span>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex gap-2 text-[12px]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-2 shrink-0" /> Completed 25-min focused work block — “Felt less overwhelmed after starting”</div>
        <div className="flex gap-2 text-[12px]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--badge-amber-fg)] mt-2 shrink-0" /> Skipped presentation prep — noted fear of evaluation</div>
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="px-4 lg:px-6 py-6" role="status" aria-label="Loading patient">
      <BackLink />
      <div className="mt-3 bg-white border border-[var(--hairline)] rounded-[16px] p-6 space-y-6">
        <div className="flex gap-4 items-center">
          <Skeleton className="w-14 h-14 rounded-full" />
          <div className="space-y-2 flex-1"><Skeleton className="h-5 w-48" /><Skeleton className="h-3 w-72" /></div>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    </div>
  )
}
