import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronRight, Clock, Users } from '../lib/icons'
import { AnimatedNumber, SlidingTabs } from '../lib/animated'
import { relativeDateTime, relativeDaysAgo } from '../lib/format'
import { usePatients } from '../features/patients/hooks'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState, ErrorState, SkeletonRows } from '../components/ui/StateViews'
import { CopyBookingLinkButton } from '../features/practice/CopyBookingLinkButton'
import type { PatientStatus, PatientSummary } from '../types/domain'

const filters = ['All', 'Active', 'New', 'Lapsed'] as const
type PatientFilter = typeof filters[number]

const matchesFilter = (f: PatientFilter, status: PatientStatus) => f === 'All' || status === f.toLowerCase()

const statusStyles: Record<PatientStatus, string> = {
  active: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  lapsed: 'bg-amber-50 border-amber-200 text-amber-700',
  new: 'bg-slate-50 border-slate-200 text-slate-700',
  archived: 'bg-zinc-100 border-zinc-300 text-zinc-600',
}

const lastLabel = (p: PatientSummary) => (p.lastSessionAt ? relativeDaysAgo(p.lastSessionAt) : '—')

export default function PatientsPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PatientFilter>('All')
  const { data: patients = [], isLoading, error, refetch } = usePatients()

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

  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Patients</h1>
          <p className="text-[12px] text-[var(--stone)] mt-1"><AnimatedNumber value={filtered.length} /> {filtered.length === 1 ? 'patient' : 'patients'} • No mental health scores — only meaningful context</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex-1 lg:w-[280px] flex items-center gap-2 bg-white border border-[var(--hairline)] rounded-full px-3.5 py-2.5">
            <Search size={14} className="text-[var(--stone)]" />
            <span className="sr-only">Search patients</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone" className="bg-transparent outline-none text-[13px] w-full" />
          </label>
        </div>
      </div>

      <div className="mt-4">
        <SlidingTabs options={filters} active={filter} onChange={setFilter} counts={counts} size="sm" />
      </div>

      <div className="mt-4 bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden">
        <div className="hidden lg:grid grid-cols-[1.4fr_0.6fr_1fr_1fr_0.8fr_80px] gap-4 px-6 py-3 bg-[var(--canvas)] text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">
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
            action={<button className="btn-secondary" onClick={() => { setQuery(''); setFilter('All') }}>Clear filters</button>}
          />
        )}

        <div className="divide-y divide-[var(--hairline)]">
          {filtered.map((p) => (
            <Link key={p.id} to={`/app/patients/${p.id}`} className="block hover:bg-[var(--sage-50)]/60 transition focus-visible:outline-2 focus-visible:outline-[var(--color-neutral-strong)]">
              {/* Desktop row */}
              <div className="hidden lg:grid grid-cols-[1.4fr_0.6fr_1fr_1fr_0.8fr_80px] gap-4 px-6 py-4 items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={p.name} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-none truncate">{p.name}</p>
                    <p className="text-[11px] text-[var(--stone)] truncate">{p.email}</p>
                  </div>
                </div>
                <span className="text-[13px] font-semibold tabular-nums">{p.sessionsCompleted}</span>
                <div className="text-[12px] leading-tight">
                  <p className="flex items-center gap-1"><Clock size={12} className="text-[var(--stone)]" /> Last: {lastLabel(p)}</p>
                  <p className="text-[var(--green-700)] font-medium">{p.nextSessionAt ? `Next: ${relativeDateTime(p.nextSessionAt)}` : 'No upcoming session'}</p>
                </div>
                <span className="text-[12px] px-2.5 py-1 rounded-full bg-[var(--sage-50)] border border-[var(--hairline)] w-fit">{p.focus ?? '—'}</span>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border w-fit capitalize ${statusStyles[p.status]}`}>{p.status}</span>
                <span className="flex justify-end"><ChevronRight size={16} className="text-[var(--stone)]" /></span>
              </div>
              {/* Mobile row */}
              <div className="lg:hidden p-4 flex gap-3">
                <Avatar name={p.name} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold leading-none">{p.name} <span className="text-[11px] font-normal text-[var(--stone)]">• {p.sessionsCompleted} {p.sessionsCompleted === 1 ? 'session' : 'sessions'}</span></p>
                  <p className="text-[11px] text-[var(--stone)] mt-1">{p.focus ?? 'No focus recorded yet'}</p>
                  <p className="text-[11px] text-[var(--slate)] mt-1">Last: {lastLabel(p)} {p.nextSessionAt ? `• Next: ${relativeDateTime(p.nextSessionAt)}` : '• No upcoming'}</p>
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
