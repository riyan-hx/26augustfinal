import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Copy, Check, MoreHorizontal, MoreVertical, Download, Plus, ChevronLeft, ChevronRight, ArrowUpRight,
  Stethoscope, Clock3, NotebookText, Search, SlidersHorizontal, HelpCircle,
  CreditCard, AlertTriangle, FileText, CalendarPlus, UserPlus, CheckCircle2,
  Sparkles, TrendingUp, CalendarOff, BarChart3, HeartHandshake,
} from 'lucide-react'
import { Button, Card, Chip } from '@heroui/react'
import { todaySchedule, followUps, patients, bookings } from '../lib/data'

const sessionRate: Record<string, number> = { 'Individual Session': 1500, 'Initial Consultation': 2000, 'Follow-up': 1200 }

/** One shared diagonal-hatch pattern, referenced by every chart on the page. */
function HatchDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <pattern id="hatch-indigo" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="var(--color-primary-soft)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-primary)" strokeWidth="2.4" />
        </pattern>
        <pattern id="hatch-rose" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="var(--badge-rose-bg)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--badge-rose-fg)" strokeWidth="2.4" />
        </pattern>
        <pattern id="hatch-violet" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="var(--badge-violet-bg)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--badge-violet-fg)" strokeWidth="2.4" />
        </pattern>
      </defs>
    </svg>
  )
}

function CardMenu() {
  return <button aria-label="Card options" className="text-[var(--color-ink-muted-48)] hover:text-[var(--color-ink)]"><MoreHorizontal size={16} /></button>
}

function IconBadge({ icon: Icon, bg, fg }: { icon: any; bg: string; fg: string }) {
  return (
    <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg, color: fg }}>
      <Icon size={15} strokeWidth={2} />
    </span>
  )
}

/** A checkbox that actually feels pressed — scales down on click, pops the
 *  check in with the system's one press easing, fills with the brand green. */
function RowCheckbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={onChange}
      className="w-[18px] h-[18px] rounded-[6px] border flex items-center justify-center shrink-0 transition-all duration-150 active:scale-90"
      style={{ background: checked ? 'var(--color-primary)' : 'var(--color-canvas)', borderColor: checked ? 'var(--color-primary)' : 'var(--color-hairline)' }}>
      <Check size={12} strokeWidth={3} className="text-white transition-all duration-150" style={{ opacity: checked ? 1 : 0, transform: checked ? 'scale(1)' : 'scale(0.5)' }} />
    </button>
  )
}

export default function Overview() {
  const [copied, setCopied] = useState(false)
  const [activeFilter, setActiveFilter] = useState('Today')
  const copy = () => { navigator.clipboard?.writeText('anitha.lumidai.in'); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  // Today's Schedule table — selection, status tabs, and the per-row menu
  const [scheduleTab, setScheduleTab] = useState<'all' | 'paid' | 'awaiting'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const toggleRow = (time: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(time)) next.delete(time)
    else next.add(time)
    return next
  })

  const earningsToday = todaySchedule.reduce((sum, s) => sum + (sessionRate[s.type] ?? 1500), 0)
  const collectedToday = todaySchedule.filter(s => s.paid).reduce((sum, s) => sum + (sessionRate[s.type] ?? 1500), 0)
  const paidCount = todaySchedule.filter(s => s.paid).length
  const awaitingCount = todaySchedule.filter(s => !s.paid).length
  const followUpsDue = followUps.filter(f => f.due.toLowerCase().includes('today') || f.due.toLowerCase().includes('overdue')).length
  const activePatients = patients.filter(p => p.status === 'active').length
  const lapsedPatients = patients.filter(p => p.status === 'lapsed').length

  const weekBars = [
    { label: 'Mon', sessions: 5 }, { label: 'Tue', sessions: 4 }, { label: 'Wed', sessions: 3 },
    { label: 'Thu', sessions: 7 }, { label: 'Fri', sessions: 6 }, { label: 'Sat', sessions: 4 }, { label: 'Sun', sessions: 3 },
  ]
  const maxBar = Math.max(...weekBars.map(b => b.sessions))
  const busiestDay = weekBars.reduce((max, b) => b.sessions > max.sessions ? b : max, weekBars[0])
  const weekTotal = weekBars.reduce((sum, b) => sum + b.sessions, 0)

  // Continuity — patients with no future session booked. This is the one
  // metric a generic booking tool has no reason to track: it's the whole
  // point of a practice built around not letting care lapse silently.
  const noFuturePatients = patients.filter(p => !p.nextSession)
  const upcomingPatients = patients.filter(p => p.nextSession).length
  const pendingBookings = bookings.filter(b => b.status === 'pending')
  const pendingAmount = pendingBookings.reduce((sum, b) => sum + Number(b.amount.replace(/[^0-9]/g, '')), 0)

  const insights = [
    { icon: TrendingUp, text: <>Sessions are up <span className="font-semibold text-[var(--color-ink)]">14%</span> vs last week — {weekTotal} booked so far.</>, href: '/app/earnings' },
    { icon: CalendarOff, text: <><span className="font-semibold text-[var(--color-ink)]">{noFuturePatients.length} patients</span> have no upcoming session booked.</>, href: '/app/patients' },
    { icon: CreditCard, text: <><span className="font-semibold text-[var(--color-ink)]">₹{pendingAmount.toLocaleString('en-IN')}</span> in payments are still pending.</>, href: '/app/bookings' },
    { icon: BarChart3, text: <><span className="font-semibold text-[var(--color-ink)]">{busiestDay.label}</span> is your busiest day this week.</>, href: '/app/calendar' },
  ]

  const bookingMix = [
    { key: 'confirmed', label: 'Confirmed', color: 'var(--color-primary)', hatch: 'url(#hatch-indigo)' },
    { key: 'pending', label: 'Pending', color: 'var(--badge-amber-fg)', hatch: 'url(#hatch-violet)' },
    { key: 'cancelled', label: 'Cancelled', color: 'var(--badge-rose-fg)', hatch: 'url(#hatch-rose)' },
  ].map(g => ({ ...g, count: bookings.filter(b => (g.key === 'confirmed' ? (b.status === 'confirmed' || b.status === 'completed') : b.status === g.key)).length }))
  const bookingTotal = bookings.length

  const actionItems = [
    { icon: Clock3, tone: 'amber' as const, title: `${followUps[0].patient} — follow-up due`, sub: followUps[0].note, href: '/app/follow-ups', cta: 'Send nudge' },
    { icon: CreditCard, tone: 'rose' as const, title: 'Arjun Nair — payment pending', sub: '₹1,500 · Individual Session, 8:00 PM', href: '/app/bookings', cta: 'Remind' },
    { icon: AlertTriangle, tone: 'rose' as const, title: 'Sneha Kulkarni — booking unconfirmed', sub: 'Fri · 3:00 PM, awaiting payment', href: '/app/bookings', cta: 'Review' },
    { icon: FileText, tone: 'neutral' as const, title: 'Vikram Shetty — note incomplete', sub: 'Session ended yesterday', href: '/app/sessions', cta: 'Add note' },
  ]
  const toneStyles = {
    amber: { bg: 'var(--badge-amber-bg)', fg: 'var(--badge-amber-fg)' },
    rose: { bg: 'var(--badge-rose-bg)', fg: 'var(--badge-rose-fg)' },
    neutral: { bg: 'var(--color-canvas-parchment)', fg: 'var(--color-ink-muted-48)' },
  }

  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1)
  const startOffset = 6 // Aug 1, 2026 is a Saturday

  return (
    <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8 max-w-[1220px] mx-auto">
      <HatchDefs />

      {/* Header — greeting + payment alert + primary actions, matches the Figma file's top bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[var(--color-ink)] leading-none">Good Morning, Dr. Anitha</h1>
          <p className="text-[13px] text-[var(--color-ink-muted-48)] mt-1.5">Here's what needs your attention today.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copy} className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[var(--color-hairline)] text-[12px] font-medium text-[var(--color-ink-muted-48)] hover:text-[var(--color-ink)] hover:bg-[var(--color-canvas-parchment)] transition">
            {copied ? <Check size={13} style={{ color: 'var(--color-primary)' }} /> : <Copy size={13} />} anitha.lumidai.in
          </button>
          <Link to="/app/calendar">
            <Button size="sm"><Plus /> Add New Booking</Button>
          </Link>
        </div>
      </div>

      {/* Filter pills — matches the Figma file's Today / This Week / This Month segmented control */}
      <div className="flex items-center gap-1.5 mb-4 bg-[var(--color-canvas-parchment)] w-fit p-1 rounded-full border border-[var(--color-hairline)]">
        {['Today', 'This Week', 'This Month'].map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition ${activeFilter === f ? 'bg-[var(--color-canvas)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted-48)] hover:text-[var(--color-ink)]'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* KPI row — one flat card divided by hairlines, matches the Figma file exactly */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-[var(--color-hairline)] rounded-[16px] overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-hairline)] bg-[var(--color-canvas)]">
        <div className="p-5">
          <p className="text-[11px] font-semibold tracking-wide uppercase text-[var(--color-ink-muted-48)]">Sessions Today</p>
          <p className="text-[28px] font-bold text-[var(--color-ink)] mt-2 leading-none">{todaySchedule.length}</p>
          <p className="text-[12px] mt-2 truncate">
            <span className="font-medium" style={{ color: 'var(--color-primary)' }}>{paidCount} Paid</span>
            <span className="text-[var(--color-ink-muted-48)]"> · </span>
            <span className="font-medium" style={{ color: 'var(--badge-amber-fg)' }}>{awaitingCount} Payment Awaiting</span>
          </p>
        </div>
        <div className="p-5">
          <p className="text-[11px] font-semibold tracking-wide uppercase text-[var(--color-ink-muted-48)]">Today's Earnings</p>
          <p className="text-[28px] font-bold text-[var(--color-ink)] mt-2 leading-none">₹{earningsToday.toLocaleString('en-IN')}</p>
          <p className="text-[12px] mt-2 font-medium" style={{ color: 'var(--color-primary)' }}>₹{collectedToday.toLocaleString('en-IN')} collected so far</p>
        </div>
        <div className="p-5">
          <p className="text-[11px] font-semibold tracking-wide uppercase text-[var(--color-ink-muted-48)]">Follow-ups Due</p>
          <p className="text-[28px] font-bold text-[var(--color-ink)] mt-2 leading-none">{followUpsDue}</p>
          <p className="text-[12px] mt-2 text-[var(--color-ink-muted-48)]">Needs a nudge today</p>
        </div>
        <div className="p-5">
          <p className="text-[11px] font-semibold tracking-wide uppercase text-[var(--color-ink-muted-48)]">No-show Rate</p>
          <p className="text-[28px] font-bold text-[var(--color-ink)] mt-2 leading-none">3.2%</p>
          <p className="text-[12px] mt-2 font-medium" style={{ color: 'var(--color-primary)' }}>-1.9% last month</p>
        </div>
      </div>

      {/* Today's Schedules + Needs attention — the two "what's happening / what needs me" lists, side by side */}
      <div className="mt-6 grid lg:grid-cols-[1.7fr_1fr] gap-5 items-start">
        <Card className="p-0 overflow-hidden" onClick={() => menuFor && setMenuFor(null)}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-[var(--color-hairline)] flex items-center justify-between gap-2">
            <p className="text-[17px] font-bold text-[var(--color-ink)] flex items-center gap-1.5 shrink-0">
              Today's Schedule
              <HelpCircle size={13} className="text-[var(--color-ink-muted-48)] hidden sm:block" aria-hidden="true" />
              <span className="sr-only">Everyone booked in for today, across every session type.</span>
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <button aria-label="Search schedule" className="hidden sm:flex w-8 h-8 rounded-full border border-[var(--color-hairline)] items-center justify-center text-[var(--color-ink-muted-48)] hover:bg-[var(--color-canvas-parchment)] hover:text-[var(--color-ink)] transition"><Search size={13} /></button>
              <button aria-label="Filter schedule" className="hidden sm:flex w-8 h-8 rounded-full border border-[var(--color-hairline)] items-center justify-center text-[var(--color-ink-muted-48)] hover:bg-[var(--color-canvas-parchment)] hover:text-[var(--color-ink)] transition"><SlidersHorizontal size={13} /></button>
              <Link to="/app/calendar" className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full border border-[var(--color-hairline)] text-[12px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-canvas-parchment)] transition whitespace-nowrap">
                <span className="hidden sm:inline">Open Calendar</span><span className="sm:hidden">Calendar</span> <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>

          {/* Status tabs — real categories from today's own data, not invented ones */}
          <div className="px-5 pt-3.5 flex items-center gap-1.5 overflow-x-auto">
            {[
              { key: 'all' as const, label: 'All', count: todaySchedule.length },
              { key: 'paid' as const, label: 'Paid', count: paidCount },
              { key: 'awaiting' as const, label: 'Awaiting', count: awaitingCount },
            ].map(t => (
              <button key={t.key} onClick={() => setScheduleTab(t.key)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150 shrink-0"
                style={scheduleTab === t.key
                  ? { background: 'var(--color-primary)', color: '#fff' }
                  : { background: 'var(--color-canvas-parchment)', color: 'var(--color-ink-muted-48)' }}>
                {t.label}
                <span className="inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded-full text-[10px]"
                  style={scheduleTab === t.key ? { background: 'rgba(255,255,255,0.25)', color: '#fff' } : { background: 'var(--color-hairline)', color: 'var(--color-ink-muted-48)' }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Selection bar — slides in only while rows are checked, so the table stays quiet at rest */}
          <div className="grid transition-[grid-template-rows] duration-200 ease-out" style={{ gridTemplateRows: selected.size > 0 ? '1fr' : '0fr' }}>
            <div className="overflow-hidden">
              <div className="mx-5 mt-3 px-3.5 py-2 rounded-[10px] flex items-center justify-between" style={{ background: 'var(--color-primary-soft)' }}>
                <span className="text-[12px] font-medium" style={{ color: 'var(--color-primary-focus)' }}>{selected.size} selected</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelected(new Set())} className="text-[11px] font-medium px-2.5 py-1 rounded-full hover:bg-white/60 transition" style={{ color: 'var(--color-primary-focus)' }}>Clear</button>
                  <button className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white transition hover:opacity-80" style={{ color: 'var(--color-primary-focus)' }}>Export</button>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mt-1 divide-y divide-[var(--color-hairline)]">
            {todaySchedule.filter(s => scheduleTab === 'all' || (scheduleTab === 'paid') === s.paid).map(s => {
              const amount = sessionRate[s.type] ?? 1500
              const patientRecord = patients.find(p => p.name === s.patient)
              const isChecked = selected.has(s.time)
              return (
                <div key={s.time} className="group relative px-5 py-4 flex items-center gap-3.5 transition-colors duration-150" style={{ background: isChecked ? 'var(--color-primary-soft)' : undefined }}
                  onMouseLeave={() => setMenuFor(cur => cur === s.time ? null : cur)}>
                  <RowCheckbox checked={isChecked} onChange={() => toggleRow(s.time)} label={`Select ${s.patient}`} />
                  <span className="hidden sm:flex items-center gap-1.5 text-[13px] text-[var(--color-ink-muted-48)] w-[72px] shrink-0"><Clock3 size={13} /> {s.time}</span>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>{patientRecord?.avatar ?? s.patient.slice(0, 2).toUpperCase()}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--color-ink)] truncate">{s.patient}</p>
                    <p className="text-[11px] text-[var(--color-ink-muted-48)] truncate">
                      <span className="sm:hidden">{s.time} · </span>{s.type}<span className="hidden sm:inline"> · Today</span><span className="sm:hidden"> · ₹{amount.toLocaleString('en-IN')} · {s.paid ? 'Paid' : 'Awaiting'}</span>
                    </p>
                    {patientRecord?.prepNote && (
                      <p className="text-[11px] text-[var(--color-ink-muted-48)] mt-1 flex items-start gap-1.5 leading-snug">
                        <NotebookText size={11} className="mt-[2px] shrink-0" style={{ color: 'var(--color-primary)' }} />
                        <span className="line-clamp-1">{patientRecord.prepNote}</span>
                      </p>
                    )}
                  </div>
                  <span className="hidden sm:block text-[13px] font-medium text-[var(--color-ink)] w-[72px] text-right shrink-0">₹{amount.toLocaleString('en-IN')}</span>
                  <span className="w-[92px] shrink-0 hidden sm:flex justify-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: s.paid ? 'var(--badge-green-bg)' : 'var(--badge-amber-bg)', color: s.paid ? 'var(--badge-green-fg)' : 'var(--badge-amber-fg)' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.paid ? 'var(--badge-green-fg)' : 'var(--badge-amber-fg)' }} />
                      {s.paid ? 'Paid' : 'Awaiting'}
                    </span>
                  </span>
                  <Link to={patientRecord ? `/app/patients/${patientRecord.id}` : '/app/patients'}
                    className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[var(--color-hairline)] text-[12px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-canvas-parchment)] transition shrink-0">
                    View Profile <ArrowUpRight size={12} />
                  </Link>
                  <div className="relative shrink-0">
                    <button aria-label="Row options" onClick={e => { e.stopPropagation(); setMenuFor(cur => cur === s.time ? null : s.time) }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-ink-muted-48)] hover:bg-[var(--color-canvas-parchment)] hover:text-[var(--color-ink)] transition"><MoreVertical size={14} /></button>
                    {menuFor === s.time && (
                      <div onClick={e => e.stopPropagation()} className="absolute right-0 top-9 z-10 w-[168px] rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-canvas)] py-1.5 animate-[fadeIn_120ms_ease-out]">
                        {patientRecord && (
                          <Link to={`/app/patients/${patientRecord.id}`} className="flex items-center gap-2 px-3.5 py-2 text-[12px] text-[var(--color-ink)] hover:bg-[var(--color-canvas-parchment)]">View profile</Link>
                        )}
                        <Link to="/app/calendar" className="flex items-center gap-2 px-3.5 py-2 text-[12px] text-[var(--color-ink)] hover:bg-[var(--color-canvas-parchment)]">Reschedule</Link>
                        {!s.paid && <Link to="/app/bookings" className="flex items-center gap-2 px-3.5 py-2 text-[12px] hover:bg-[var(--color-canvas-parchment)]" style={{ color: 'var(--color-primary-focus)' }}>Send payment reminder</Link>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer — quick scheduling context, mirrors CalendarPage's own availability mock */}
          <div className="px-5 py-3 border-t border-[var(--color-hairline)] bg-[var(--color-canvas-parchment)]/60 flex items-center justify-between text-[11px]">
            <span className="text-[var(--color-ink-muted-48)]">Next availability · <span className="font-medium text-[var(--color-ink)]">Thu, 10:00 AM</span> · No conflicts</span>
            <Link to="/app/calendar" className="font-medium" style={{ color: 'var(--color-primary)' }}>Open calendar →</Link>
          </div>
        </Card>

        {/* Needs attention — tiered by urgency (rose = time-sensitive money/booking risk, amber = due today, neutral = housekeeping) */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[17px] font-bold text-[var(--color-ink)]">Needs attention</p>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold" style={{ background: 'var(--color-canvas-parchment)', color: 'var(--color-ink-muted-48)' }}>{actionItems.length}</span>
            </div>
            <Link to="/app/follow-ups" className="text-[12px] font-medium" style={{ color: 'var(--color-primary)' }}>View all</Link>
          </div>
          <div className="divide-y divide-[var(--color-hairline)]">
            {actionItems.map(item => (
              <Link key={item.title} to={item.href} className="px-5 py-3.5 flex items-center gap-3 group hover:bg-[var(--color-canvas-parchment)] transition">
                <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: toneStyles[item.tone].bg, color: toneStyles[item.tone].fg }}>
                  <item.icon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-[var(--color-ink)] truncate">{item.title}</p>
                  <p className="text-[11px] text-[var(--color-ink-muted-48)] truncate mt-0.5">{item.sub}</p>
                </div>
                <span className="hidden sm:inline text-[11px] font-medium shrink-0 opacity-0 group-hover:opacity-100 transition" style={{ color: 'var(--color-primary)' }}>{item.cta}</span>
                <ChevronRight size={14} className="text-[var(--color-ink-muted-48)] shrink-0" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Lumid AI Insights — real, computed observations about the practice, not decoration */}
      <Card className="mt-6 p-5">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-ink)' }}>
            <Sparkles size={13} className="text-white" />
          </span>
          <p className="text-[13px] font-bold tracking-wide uppercase text-[var(--color-ink)]">Lumid AI Insights</p>
          <span className="text-[12px] text-[var(--color-ink-muted-48)]">Your practice at a glance</span>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {insights.map((insight, i) => (
            <div key={i} className="rounded-[12px] p-3.5 flex flex-col justify-between gap-3" style={{ background: 'var(--color-canvas-parchment)' }}>
              <div className="flex items-start gap-2.5">
                <insight.icon size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--color-ink-muted-48)' }} />
                <p className="text-[12px] text-[var(--color-ink)] leading-snug">{insight.text}</p>
              </div>
              <Link to={insight.href} className="text-[11px] font-semibold" style={{ color: 'var(--color-primary)' }}>Review →</Link>
            </div>
          ))}
        </div>
      </Card>

      {/* Patient continuity + recent activity — continuity is the metric unique to a care practice: who's fallen off the calendar */}
      <div className="mt-6 grid lg:grid-cols-[1.6fr_1fr] gap-5 items-start">
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
            <p className="text-[13px] font-bold text-[var(--color-ink)] flex items-center gap-1.5">
              <HeartHandshake size={15} style={{ color: 'var(--color-primary)' }} /> Patient Continuity
            </p>
            <Link to="/app/patients" className="text-[12px] font-medium inline-flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>View all <ArrowUpRight size={12} /></Link>
          </div>
          <div className="grid grid-cols-4 gap-2 px-5 py-3.5 border-b border-[var(--color-hairline)]">
            {[
              { label: 'Active', value: activePatients, warn: false },
              { label: 'Upcoming', value: upcomingPatients, warn: false },
              { label: 'Follow-ups', value: followUps.length, warn: false },
              { label: 'No future', value: noFuturePatients.length, warn: true },
            ].map(stat => (
              <div key={stat.label} className="rounded-[10px] p-2.5 text-center" style={{ background: stat.warn ? 'var(--badge-amber-bg)' : 'var(--color-canvas-parchment)' }}>
                <p className="text-[17px] font-bold leading-none" style={{ color: stat.warn ? 'var(--badge-amber-fg)' : 'var(--color-ink)' }}>{stat.value}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wide mt-1" style={{ color: stat.warn ? 'var(--badge-amber-fg)' : 'var(--color-ink-muted-48)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="divide-y divide-[var(--color-hairline)]">
            {noFuturePatients.length === 0 ? (
              <p className="px-5 py-6 text-[12px] text-center text-[var(--color-ink-muted-48)]">Everyone has a next session booked. Nothing at risk of lapsing.</p>
            ) : noFuturePatients.map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>{p.avatar}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-[var(--color-ink)] truncate">{p.name}</p>
                  <p className="text-[11px] text-[var(--color-ink-muted-48)] truncate">Last seen {p.lastSession} · No upcoming session</p>
                </div>
                <Link to={`/app/patients/${p.id}`} className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-[var(--color-hairline)] hover:bg-[var(--color-canvas-parchment)] transition shrink-0" style={{ color: 'var(--color-ink)' }}>Review</Link>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-hairline)]">
            <p className="text-[13px] font-bold text-[var(--color-ink)]">Recent Activity</p>
          </div>
          <div className="divide-y divide-[var(--color-hairline)]">
            {[
              { icon: CalendarPlus, text: 'New booking from Rahul Sharma', time: '2 min ago' },
              { icon: CreditCard, text: 'Payment received · ₹1,500', time: '18 min ago' },
              { icon: CheckCircle2, text: 'Vikram completed his session', time: '1 hr ago' },
              { icon: UserPlus, text: 'New patient · Sneha Kulkarni', time: 'Yesterday' },
            ].map((a, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-canvas-parchment)', color: 'var(--color-ink-muted-48)' }}><a.icon size={13} /></span>
                <div className="min-w-0 flex-1"><p className="text-[12px] text-[var(--color-ink)] leading-snug">{a.text}</p><p className="text-[10px] text-[var(--color-ink-muted-48)] mt-0.5">{a.time}</p></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Practice overview chart + calendar/activity */}
      <div className="mt-6 grid lg:grid-cols-[1.7fr_1fr] gap-5 items-start">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconBadge icon={Stethoscope} bg="var(--color-primary-soft)" fg="var(--color-primary)" />
              <p className="text-[14px] font-semibold text-[var(--color-ink)]">Practice overview</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[var(--color-ink-muted-48)] bg-[var(--color-canvas-parchment)] px-3 py-1.5 rounded-full">This week</span>
              <button aria-label="Export chart" className="w-7 h-7 rounded-full border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-ink-muted-48)]"><Download size={13} /></button>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 text-[11px] text-[var(--color-ink-muted-48)]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} /> Sessions</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--badge-violet-fg)' }} /> Follow-ups</span>
          </div>

          <div className="mt-5 h-[180px] flex items-end gap-3">
            {weekBars.map((b, i) => (
              <div key={b.label} className="flex-1 flex flex-col items-center justify-end gap-2 h-full relative group">
                {i === 3 && (
                  <div className="absolute -top-2 -translate-y-full bg-[var(--color-ink)] text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                    <span className="font-semibold">Thu</span> · {b.sessions} sessions
                  </div>
                )}
                <svg width="100%" height={Math.max(16, (b.sessions / maxBar) * 150)} viewBox={`0 0 32 ${Math.max(16, (b.sessions / maxBar) * 150)}`} preserveAspectRatio="none">
                  <rect width="32" height={Math.max(16, (b.sessions / maxBar) * 150)} rx="6" fill={i === 3 ? 'url(#hatch-indigo)' : 'var(--color-canvas-parchment)'} stroke={i === 3 ? 'var(--color-primary)' : 'var(--color-hairline)'} />
                </svg>
                <span className="text-[10px] text-[var(--color-ink-muted-48)]">{b.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[var(--color-ink-muted-48)] mt-3">Sessions per day this week — Thursday is your busiest day.</p>
        </Card>

        {/* Calendar + activity popover, matching the reference's date-picker-with-detail-card */}
        <Card className="p-4 relative overflow-visible">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[var(--color-ink)]">August 2026</p>
            <div className="flex gap-1">
              <button aria-label="Previous month" className="w-6 h-6 rounded-full hover:bg-[var(--color-canvas-parchment)] flex items-center justify-center text-[var(--color-ink-muted-48)]"><ChevronLeft size={13} /></button>
              <button aria-label="Next month" className="w-6 h-6 rounded-full hover:bg-[var(--color-canvas-parchment)] flex items-center justify-center text-[var(--color-ink-muted-48)]"><ChevronRight size={13} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-[10px] font-medium text-[var(--color-ink-muted-48)] mt-3 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="py-1">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1 mt-1">
            {Array(startOffset).fill(null).concat(calendarDays).slice(0, 35).map((d, i) => (
              d ? (
                <button key={i} className={`w-7 h-7 mx-auto rounded-full text-[11px] flex items-center justify-center ${d === 26 ? 'text-white font-semibold' : 'text-[var(--color-ink-muted-80)] hover:bg-[var(--color-canvas-parchment)]'}`} style={d === 26 ? { background: 'var(--color-primary)' } : undefined}>{d}</button>
              ) : <span key={i} />
            ))}
          </div>

          {/* Activity detail popover — anchored under the 26th, matching the reference */}
          <div className="mt-4 rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-canvas-parchment)] p-3">
            <p className="text-[11px] font-semibold text-[var(--color-ink)] mb-2">Today's activity</p>
            <div className="space-y-2">
              {todaySchedule.map(s => (
                <div key={s.time} className="flex items-center gap-2 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.paid ? 'var(--badge-green-fg)' : 'var(--badge-amber-fg)' }} />
                  <span className="flex-1 text-[var(--color-ink)] truncate">{s.patient}</span>
                  <span className="text-[var(--color-ink-muted-48)] shrink-0">{s.time}</span>
                </div>
              ))}
            </div>
            <Link to="/app/calendar" className="mt-2.5 flex items-center justify-center gap-1.5 py-1.5 rounded-full bg-[var(--color-canvas)] border border-[var(--color-hairline)] text-[11px] font-medium text-[var(--color-ink)]">
              <Plus size={12} /> Add session
            </Link>
          </div>
        </Card>
      </div>

      {/* Booking mix donut + patient status */}
      <div className="mt-6 grid lg:grid-cols-2 gap-5 items-start">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[var(--color-ink)]">Booking mix</p>
            <CardMenu />
          </div>
          <div className="flex items-center justify-center mt-2">
            <svg width="150" height="150" viewBox="0 0 150 150">
              {(() => {
                let acc = 0
                const r = 55, cx = 75, cy = 75, circ = 2 * Math.PI * r
                return bookingMix.map(seg => {
                  const frac = seg.count / bookingTotal
                  const dash = frac * circ
                  const offset = circ - acc * circ
                  acc += frac
                  return <circle key={seg.key} cx={cx} cy={cy} r={r} fill="none" stroke={seg.hatch} strokeWidth="20" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={offset} transform={`rotate(-90 ${cx} ${cy})`} />
                })
              })()}
              <text x="75" y="70" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--color-ink)">{bookingTotal}</text>
              <text x="75" y="88" textAnchor="middle" fontSize="10" fill="var(--color-ink-muted-48)">bookings</text>
            </svg>
          </div>
          <div className="mt-2 flex justify-center gap-4">
            {bookingMix.map(seg => (
              <span key={seg.key} className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-muted-80)]"><span className="w-2 h-2 rounded-full" style={{ background: seg.color }} /> {seg.label} · {seg.count}</span>
            ))}
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[var(--color-ink)]">Patient status</p>
            <Link to="/app/patients" className="text-[12px] font-medium" style={{ color: 'var(--color-primary)' }}>View all</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 px-5 py-3 border-b border-[var(--color-hairline)] text-center">
            <div><p className="text-[16px] font-bold text-[var(--color-ink)]">{activePatients}</p><p className="text-[10px] text-[var(--color-ink-muted-48)]">Active</p></div>
            <div><p className="text-[16px] font-bold text-[var(--color-ink)]">{lapsedPatients}</p><p className="text-[10px] text-[var(--color-ink-muted-48)]">Lapsed</p></div>
          </div>
          <div className="divide-y divide-[var(--color-hairline)]">
            {patients.slice(0, 3).map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>{p.avatar}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-[var(--color-ink)] truncate">{p.name}</p>
                  <p className="text-[10px] text-[var(--color-ink-muted-48)] truncate">{p.focus}</p>
                </div>
                <Chip size="sm" color={p.status === 'active' ? 'success' : p.status === 'lapsed' ? 'danger' : 'default'} variant="soft">{p.status}</Chip>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
