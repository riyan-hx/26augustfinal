import { useParams, Link } from 'react-router-dom'
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
  const next = bookings.find((b) => b.startsAt.getTime() > now && (b.status === 'confirmed' || b.status === 'pending_payment'))
  const upcoming = bookings.filter((b) => b.startsAt.getTime() > now && b.status !== 'cancelled' && b.status !== 'expired')
  const past = [...bookings].filter((b) => !upcoming.includes(b)).reverse()

  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <BackLink />

      <div className="mt-4 bg-white border border-[var(--hairline)] rounded-[16px] p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex gap-4">
            <Avatar name={p.name} size={56} />
            <div>
              <h1 className="text-[20px] font-semibold tracking-tight leading-none">{p.name}</h1>
              <p className="text-[12px] text-[var(--stone)] mt-1">
                {p.sessionsCompleted} {p.sessionsCompleted === 1 ? 'session' : 'sessions'} • Last session: {p.lastSessionAt ? relativeDaysAgo(p.lastSessionAt) : '—'} • Next: {p.nextSessionAt ? relativeDateTime(p.nextSessionAt) : 'Not scheduled'}
              </p>
              <p className="text-[12px] text-[var(--stone)] mt-1">{p.email}{p.phone ? ` • ${p.phone}` : ''}</p>
              {p.focus && <p className="text-[12px] mt-1"><span className="px-2 py-0.5 rounded-full bg-[var(--sage-50)] border border-[var(--hairline)]">{p.focus}</span></p>}
            </div>
          </div>
          <div className="lg:ml-auto flex flex-wrap gap-2">
            {next?.meetUrl && (
              <a href={next.meetUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-full bg-[var(--green-700)] text-white text-[12px] font-medium inline-flex items-center gap-1.5"><Video size={14} /> Join next session</a>
            )}
            <Link to="/app/sessions" className="px-4 py-2 rounded-full bg-white border border-[var(--hairline)] text-[12px] font-medium inline-flex items-center gap-1.5"><FileText size={14} /> Add note</Link>
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
              <Sparkles size={15} className="text-[var(--green-700)] shrink-0" />
              <p className="text-[12px] text-[var(--slate)]"><span className="font-medium text-[var(--ink)]">Coming next:</span> patterns across this patient's sessions, shown with evidence and confidence — only with their consent.</p>
              <ArrowUpRight size={13} className="ml-auto text-[var(--stone)] shrink-0" />
            </Link>
          </div>

          <div className="space-y-4">
            <div className="rounded-[12px] border border-[var(--hairline)] p-4">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)] flex items-center gap-1.5"><Clock size={12} /> NEXT SESSION</p>
              {next ? (
                <>
                  <p className="text-[14px] font-semibold mt-1">{relativeDateTime(next.startsAt)}</p>
                  <p className="text-[12px] text-[var(--stone)]">{next.sessionTypeName} • {formatINR(next.pricePaise)} • {next.status === 'pending_payment' ? 'Awaiting payment' : next.paymentStatus === 'captured' ? 'Paid' : 'Confirmed'}</p>
                </>
              ) : (
                <p className="text-[13px] text-[var(--stone)] mt-1">Not scheduled</p>
              )}
            </div>

            <PatientFollowUps patientId={p.id} />

            <div className="rounded-[12px] border border-[var(--hairline)] p-4">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)] flex items-center gap-1.5"><ShieldCheck size={12} /> CONSENT & PRIVACY</p>
              <div className="mt-3 space-y-2 text-[12px]">
                <div className="flex justify-between"><span>Booking terms</span><span className="font-semibold text-emerald-700">Accepted</span></div>
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

function BackLink() {
  return (
    <Link to="/app/patients" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--stone)] hover:text-[var(--ink)]">
      <ArrowLeft size={14} /> Back to patients
    </Link>
  )
}

function TimelineItem({ booking, active }: { booking: BookingSummary; active: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full border-2 ${active ? 'bg-[var(--green-700)] border-[var(--green-700)]' : 'border-[var(--stone)] bg-white'} mt-1`} />
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
        <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold flex items-center gap-1"><CheckCircle2 size={12} /> 2 of 3 actions completed</span>
        <span className="text-[11px] text-[var(--stone)]">Last check-in 1 day ago</span>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex gap-2 text-[12px]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--green-700)] mt-2 shrink-0" /> Completed 25-min focused work block — “Felt less overwhelmed after starting”</div>
        <div className="flex gap-2 text-[12px]"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" /> Skipped presentation prep — noted fear of evaluation</div>
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="px-4 lg:px-6 py-6" role="status" aria-label="Loading patient">
      <BackLink />
      <div className="mt-4 bg-white border border-[var(--hairline)] rounded-[16px] p-6 space-y-6">
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
