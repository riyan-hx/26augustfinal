import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { readSessionValue, writeSessionValue } from '../lib/sessionValue'
import { Search, ChevronRight, Clock, Users } from '../lib/icons'
import { AnimatedNumber, SlidingTabs } from '../lib/animated'
import { relativeDateTime, relativeDaysAgo } from '../lib/format'
import { usePatients } from '../features/patients/hooks'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/StateViews'
import { CopyBookingLinkButton } from '../features/practice/CopyBookingLinkButton'
import { NewBookingButton } from '../features/bookings/NewBookingDialog'
import { Badge, PageHeader, type BadgeTone } from '../components/ui/PageHeader'
import type { PatientStatus, PatientSummary } from '../types/domain'

const filters = ['All', 'Active', 'New', 'Lapsed'] as const
type PatientFilter = typeof filters[number]

const matchesFilter = (f: PatientFilter, status: PatientStatus) => f === 'All' || status === f.toLowerCase()

const statusTone: Record<PatientStatus, BadgeTone> = {
  active: 'green',
  lapsed: 'amber',
  new: 'sky',
  archived: 'neutral',
}

/** `?status=active|new|lapsed` keeps the list linkable from Overview. Search is never put in the URL. */
const paramFilter: Record<string, PatientFilter> = { active: 'Active', new: 'New', lapsed: 'Lapsed' }

const SEARCH_KEY = 'lumid:patients-search'

const lastLabel = (p: PatientSummary) => (p.lastSessionAt ? relativeDaysAgo(p.lastSessionAt) : '—')

export default function PatientsPage() {
  const [params, setParams] = useSearchParams()
  const filter: PatientFilter = paramFilter[params.get('status') ?? ''] ?? 'All'
  // Names, emails and phone numbers stay out of the URL (history, logs, shared links).
  const [query, setQueryState] = useState(() => readSessionValue(SEARCH_KEY))
  const setQuery = (q: string) => { setQueryState(q); writeSessionValue(SEARCH_KEY, q) }
  const { data: patients = [], isLoading, error, refetch } = usePatients()

  const setFilter = (f: PatientFilter) => setParams((prev) => {
    const next = new URLSearchParams(prev)
    if (f === 'All') next.delete('status'); else next.set('status', f.toLowerCase())
    return next
  })
  const clearAll = () => { setQuery(''); setParams(new URLSearchParams(), { replace: true }) }

  const q = query.trim().toLowerCase()
  const filtered = patients.filter(
    (p) =>
      matchesFilter(filter, p.status) &&
      (!q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || (p.phone ?? '').includes(q)),
  )
  // Counts per tab — same logic as the active filter, so each badge matches what selecting it shows.
  const counts = Object.fromEntries(
    filters.map((f) => [f, patients.filter((p) => matchesFilter(f, p.status)).length]),
  ) as Record<PatientFilter, number>

  const hasNoPatients = !isLoading && !error && patients.length === 0
  const noMatches = !isLoading && !error && patients.length > 0 && filtered.length === 0
  const lapsed = counts.Lapsed
  const status = params.get('status')
  const backTo = `/app/patients${status && paramFilter[status] ? `?status=${status}` : ''}`

  return (
    <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8">
      <PageHeader
        title="Patients"
        description="Everyone who has booked with you, with the context you need before a session. No scores, no labels."
        meta={<span><span className="font-semibold text-[var(--color-ink)] tabular-nums"><AnimatedNumber value={filtered.length} /></span> {filtered.length === 1 ? 'patient' : 'patients'}{filter !== 'All' ? ` · ${filter.toLowerCase()}` : ''}</span>}
        actions={
          <>
            <label className="field !w-auto flex items-center gap-2 !rounded-full !py-0 !min-h-[36px] flex-1 md:flex-none">
              <Search size={14} className="text-[var(--color-ink-muted-48)] shrink-0" />
              <span className="sr-only">Search patients</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone" className="bg-transparent outline-none text-[13px] w-full md:w-[210px] min-w-0" />
            </label>
            <NewBookingButton />
          </>
        }
      />

      {!isLoading && lapsed > 0 && filter !== 'Lapsed' && (
        <button type="button" onClick={() => setFilter('Lapsed')}
          className="mb-4 w-full flex items-center gap-3 rounded-[14px] border border-[color-mix(in_oklch,var(--badge-amber-fg)_22%,var(--color-hairline))] bg-[var(--badge-amber-bg)] px-4 py-3 text-left hover:brightness-[0.98] transition">
          <span className="w-8 h-8 rounded-full bg-white/70 text-[var(--badge-amber-fg)] flex items-center justify-center shrink-0"><Clock size={15} /></span>
          <span className="flex-1 min-w-0 text-[13px] text-[var(--color-ink)]">
            <span className="font-semibold">{lapsed} {lapsed === 1 ? 'patient has' : 'patients have'} lapsed</span>
            <span className="text-[var(--color-ink-muted-80)]"> · no upcoming session. A short follow-up can help.</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--badge-amber-fg)]">Review <ChevronRight size={14} /></span>
        </button>
      )}

      <SlidingTabs options={filters} active={filter} onChange={setFilter} counts={counts} size="sm" />

      <div className="mt-4 bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden">
        <div className="list-head hidden lg:grid grid-cols-[1.4fr_0.6fr_1fr_1fr_0.8fr_80px] gap-4 px-6 py-3 text-[11px] font-semibold tracking-[0.08em] text-[var(--color-ink-muted-48)]">
          <span>PATIENT</span><span>SESSIONS</span><span>LAST / NEXT</span><span>CURRENT FOCUS</span><span>STATUS</span><span></span>
        </div>

        {isLoading && <SkeletonRows rows={6} />}
        {error && <ErrorState error={error} onRetry={() => void refetch()} />}
        {hasNoPatients && (
          <EmptyState
            icon={<Users size={18} />}
            title="No patients yet"
            description="Patients appear here after their first booking through your page."
            action={<CopyBookingLinkButton />}
          />
        )}
        {noMatches && (
          <EmptyState
            title="No patients match"
            description="Try a different name, email or filter."
            action={<button className="btn-secondary" onClick={clearAll}>Clear filters</button>}
          />
        )}

        <div className="divide-y divide-[var(--hairline)]">
          {filtered.map((p) => (
            <Link key={p.id} to={`/app/patients/${p.id}`} state={{ from: backTo }} className="group block hover:bg-[var(--color-primary-tint)] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-primary)]">
              {/* Desktop row */}
              <div className="hidden lg:grid grid-cols-[1.4fr_0.6fr_1fr_1fr_0.8fr_80px] gap-4 px-6 py-4 items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={p.name} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium leading-none truncate">{p.name}</p>
                    <p className="text-[11px] text-[var(--color-ink-muted-48)] truncate mt-1">{p.email}</p>
                  </div>
                </div>
                <span className="text-[13px] font-semibold tabular-nums">{p.sessionsCompleted}</span>
                <div className="text-[12px] leading-tight">
                  <p className={p.nextSessionAt ? 'font-semibold text-[var(--color-forest)]' : 'text-[var(--color-ink-muted-48)]'}>{p.nextSessionAt ? `Next: ${relativeDateTime(p.nextSessionAt)}` : 'No upcoming session'}</p>
                  <p className="flex items-center gap-1 text-[var(--color-ink-muted-48)] mt-0.5"><Clock size={12} /> Last: {lastLabel(p)}</p>
                </div>
                <span className="text-[12px] text-[var(--color-ink-muted-80)] truncate">{p.focus ?? '—'}</span>
                <Badge tone={statusTone[p.status]} className="capitalize">{p.status}</Badge>
                <span className="flex justify-end"><ChevronRight size={16} className="text-[var(--color-ink-muted-48)] group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition" /></span>
              </div>
              {/* Mobile row */}
              <div className="lg:hidden p-4 flex gap-3">
                <Avatar name={p.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className="text-[14px] font-medium leading-none truncate">{p.name}</p><Badge tone={statusTone[p.status]} className="capitalize !py-0.5 !px-2">{p.status}</Badge></div>
                  <p className="text-[11px] text-[var(--stone)] mt-1">{p.focus ?? 'No focus recorded yet'}</p>
                  <p className="text-[11px] text-[var(--slate)] mt-1">{p.sessionsCompleted} {p.sessionsCompleted === 1 ? 'session' : 'sessions'} · Last: {lastLabel(p)} {p.nextSessionAt ? `· Next: ${relativeDateTime(p.nextSessionAt)}` : '· No upcoming'}</p>
                </div>
                <ChevronRight size={16} className="text-[var(--stone)] shrink-0 self-center" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
