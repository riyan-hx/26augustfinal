import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Filter, MoreHorizontal, Search, X } from '../../lib/icons'
import { formatINR } from '../../lib/money'
import { formatTime } from '../../lib/dates'
import { relativeDateTime } from '../../lib/format'
import { CopyBookingLinkButton } from '../practice/CopyBookingLinkButton'
import { useProfile } from '../practice/hooks'
import { Avatar } from '../../components/ui/Avatar'
import { EmptyState, ErrorState, SkeletonRows } from '../../components/ui/StateViews'
import type { BookingSummary, PatientSummary } from '../../types/domain'
import { PaymentBadge } from '../../components/ui/PaymentBadge'
import { card, CardTitle, Pill } from './ui'
import { dayLabel, durationMin, isPaid, mailto, reminderMailto } from './utils'

interface Query { isLoading: boolean; error: unknown; refetch: () => unknown }

/** Today and the next three days as a searchable table. */
export function TodaySchedule({ rows, patients, upcomingWeek, now, practice, q }: {
  rows: BookingSummary[]; patients: Map<string, PatientSummary>; upcomingWeek: BookingSummary[]; now: number; practice: string; q: Query
}) {
  const published = useProfile().data?.published ?? false
  const [query, setQuery] = useState('')
  const [unpaidOnly, setUnpaidOnly] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const needle = query.trim().toLowerCase()
  const shown = rows.filter((b) => (!unpaidOnly || !isPaid(b)) && (!needle || b.patientName.toLowerCase().includes(needle) || b.sessionTypeName.toLowerCase().includes(needle)))
  const picked = shown.filter((b) => selected.has(b.id))
  const allPicked = shown.length > 0 && picked.length === shown.length
  const emails = [...new Set(picked.map((b) => b.patientEmail).filter((e): e is string => !!e))]

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = () => setSelected(allPicked ? new Set() : new Set(shown.map((b) => b.id)))
  const filtered = !!needle || unpaidOnly
  const nextId = rows.find((b) => b.startsAt.getTime() > now && b.status !== 'completed')?.id

  return (
    <section className={`${card} p-5`} aria-labelledby="today-h">
      <CardTitle id="today-h" title="Today’s schedule"
        sub={q.isLoading || q.error ? ' ' : `${rows.length} ${rows.length === 1 ? 'session' : 'sessions'} · today and next 3 days`}
        right={
          <div className="hidden md:flex items-center gap-2">
            <SearchBox value={query} onChange={setQuery} />
            <FilterButton on={unpaidOnly} onClick={() => setUnpaidOnly((v) => !v)} />
          </div>
        } />
      <div className="md:hidden mt-4 flex gap-2">
        <SearchBox value={query} onChange={setQuery} />
        <FilterButton on={unpaidOnly} onClick={() => setUnpaidOnly((v) => !v)} />
      </div>

      {q.isLoading && <div className="mt-5"><SkeletonRows rows={3} height="h-[56px]" /></div>}
      {!!q.error && <div className="mt-3"><ErrorState error={q.error} onRetry={() => void q.refetch()} /></div>}
      {!q.isLoading && !q.error && rows.length === 0 && (
        <EmptyState icon={<CalendarDays size={18} />} title="No sessions in the next few days"
          description={upcomingWeek[0] ? `Next: ${upcomingWeek[0].patientName}, ${relativeDateTime(upcomingWeek[0].startsAt)}.` : published ? 'Share your booking link so patients can book a time.' : 'Finish setting up your booking page so patients can book a time.'}
          action={upcomingWeek[0] ? undefined : <CopyBookingLinkButton />} />
      )}

      {!q.isLoading && !q.error && rows.length > 0 && (
        <>
          {picked.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-[14px] bg-[var(--color-primary-soft)] text-[13px]" role="status">
              <span className="font-medium">{picked.length} selected</span>
              {emails.length > 0 && <a className="btn-quiet" href={mailto('', 'About your upcoming session', `Hi,\n\n\n\n${practice}`) + `&bcc=${encodeURIComponent(emails.join(','))}`}>Email {emails.length === 1 ? 'patient' : `${emails.length} patients`}</a>}
              <button type="button" className="btn-link ml-auto" onClick={() => setSelected(new Set())}>Clear</button>
            </div>
          )}
          <div className="mt-4 border border-[var(--hairline)] rounded-[14px] overflow-hidden">
            <table className="w-full text-left table-fixed">
              <thead className="bg-[var(--color-surface-panel)] text-[12px] text-[var(--stone)]">
                <tr>
                  <th className="hidden sm:table-cell w-12 pl-4 py-2.5"><Check checked={allPicked} onChange={toggleAll} label="Select all sessions" /></th>
                  <th className="pl-4 sm:pl-2 py-2.5 font-normal w-[78px] sm:w-[120px]">Time</th>
                  <th className="py-2.5 font-normal">Patient</th>
                  <th className="hidden lg:table-cell py-2.5 font-normal w-[22%]">Session</th>
                  <th className="hidden md:table-cell py-2.5 font-normal w-[80px]">Fee</th>
                  <th className="py-2.5 font-normal w-[100px] sm:w-[118px]">Payment</th>
                  <th className="w-10 sm:w-12 pr-2 sm:pr-3 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hairline)]">
                {shown.map((b) => (
                  <ScheduleRow key={b.id} booking={b} focus={patients.get(b.patientId)?.focus ?? null} now={now} practice={practice}
                    firstVisit={patients.get(b.patientId)?.sessionsCompleted === 0} isNext={b.id === nextId}
                    checked={selected.has(b.id)} onToggle={() => toggle(b.id)} />
                ))}
                {shown.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[13px] text-[var(--stone)]">
                    No sessions match. <button type="button" className="font-medium text-[var(--ink)] underline underline-offset-4" onClick={() => { setQuery(''); setUnpaidOnly(false) }}>Clear {filtered ? 'filters' : ''}</button>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      <Link to="/app/calendar" className="inline-block mt-3 text-[12px] text-[var(--stone)] hover:text-[var(--ink)] hover:underline underline-offset-4">Open full calendar →</Link>
    </section>
  )
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative flex-1 md:flex-none md:w-[220px]">
      <span className="sr-only">Search patients</span>
      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--stone)] pointer-events-none" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search patients"
        className="w-full h-9 pl-9 pr-4 rounded-full border border-[var(--hairline)] bg-white text-[13px] placeholder:text-[var(--stone)] focus:outline-none focus:border-[var(--color-primary)]" />
    </label>
  )
}

function FilterButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-full border text-[13px] font-medium shrink-0 transition-colors ${on ? 'bg-[var(--color-forest)] text-white border-transparent' : 'bg-white border-[var(--hairline)] hover:bg-[var(--color-surface-panel)]'}`}>
      <Filter size={14} />Unpaid only{on && <X size={13} />}
    </button>
  )
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <input type="checkbox" checked={checked} onChange={onChange} aria-label={label}
    className="w-4 h-4 rounded-[5px] accent-[var(--color-primary)] cursor-pointer align-middle" />
}

function ScheduleRow({ booking: b, focus, firstVisit, isNext, now, practice, checked, onToggle }: {
  booking: BookingSummary; focus: string | null; firstVisit: boolean; isNext: boolean; now: number; practice: string; checked: boolean; onToggle: () => void
}) {
  const paid = isPaid(b)
  const live = b.startsAt.getTime() - now < 10 * 60_000 && b.endsAt.getTime() > now
  return (
    <tr className={`text-[13px] transition-colors ${checked ? 'bg-[var(--color-primary-tint)]' : 'hover:bg-[#fafbf9]'}`}>
      <td className="hidden sm:table-cell pl-4 py-2.5"><Check checked={checked} onChange={onToggle} label={`Select ${b.patientName}`} /></td>
      <td className="pl-4 sm:pl-2 py-2.5 align-middle">
        <p className="tabular-nums">{formatTime(b.startsAt)}</p>
        {live ? <span className="mt-0.5 inline-block"><Pill tone="green" dot>Now</Pill></span>
          : isNext ? <span className="mt-0.5 inline-block"><Pill tone="sky">Next</Pill></span>
          : <p className="text-[12px] text-[var(--stone)]">{dayLabel(b.startsAt, now)}</p>}
      </td>
      <td className="py-2.5 pr-3">
        <Link to={`/app/patients/${b.patientId}`} className="flex items-center gap-3 min-w-0 group">
          <span className="hidden sm:inline-flex"><Avatar name={b.patientName} size={30} /></span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="truncate font-medium text-[var(--ink)] group-hover:underline underline-offset-4">{b.patientName}</span>
              {firstVisit && <Pill tone="sky">New</Pill>}
            </span>
            <span className="block text-[12px] text-[var(--stone)] truncate">{focus ?? b.sessionTypeName}</span>
          </span>
        </Link>
      </td>
      <td className="hidden lg:table-cell py-2.5 pr-3">
        <p className="truncate">{b.sessionTypeName}</p>
        <p className="text-[12px] text-[var(--stone)]">{durationMin(b)} min</p>
      </td>
      <td className="hidden md:table-cell py-2.5 tabular-nums">{formatINR(b.pricePaise)}</td>
      <td className="py-2.5"><PaymentBadge booking={b} /></td>
      <td className="pr-1 sm:pr-3 py-2.5 text-right"><RowMenu b={b} paid={paid} live={live} practice={practice} /></td>
    </tr>
  )
}

function RowMenu({ b, paid, live, practice }: { b: BookingSummary; paid: boolean; live: boolean; practice: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  const reminder = paid ? null : reminderMailto(b, practice)
  const item = 'block w-full text-left px-3 py-2 rounded-[8px] text-[13px] hover:bg-[var(--color-surface-panel)]'
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" aria-label={`More for ${b.patientName}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[var(--stone)] hover:bg-[var(--color-surface-panel)] hover:text-[var(--ink)]">
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-9 z-20 w-[200px] p-1.5 bg-white rounded-[12px] border border-[var(--hairline)] shadow-[var(--shadow-pop)]">
          <Link role="menuitem" to={`/app/patients/${b.patientId}`} className={item}>Open patient</Link>
          {b.meetUrl && <a role="menuitem" href={b.meetUrl} target="_blank" rel="noreferrer" className={item}>{live ? 'Join Google Meet' : 'Open Meet link'}</a>}
          {reminder && <a role="menuitem" href={reminder} className={item}>Send payment reminder</a>}
          <Link role="menuitem" to="/app/calendar" className={item}>View in calendar</Link>
        </div>
      )}
    </div>
  )
}
