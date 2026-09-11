import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Copy, Check, MoreHorizontal, Download, Plus, ChevronLeft, ChevronRight,
  Wallet, Repeat2, TrendingDown, TrendingUp, Stethoscope, Users, Clock3,
  CreditCard, AlertTriangle, FileText, CalendarPlus, UserPlus, CheckCircle2,
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

function TrendPill({ value, up = true }: { value: string; up?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${up ? 'bg-[var(--badge-green-bg)] text-[var(--badge-green-fg)]' : 'bg-[var(--badge-rose-bg)] text-[var(--badge-rose-fg)]'}`}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {value}
    </span>
  )
}

function IconBadge({ icon: Icon, bg, fg }: { icon: any; bg: string; fg: string }) {
  return (
    <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg, color: fg }}>
      <Icon size={15} strokeWidth={2} />
    </span>
  )
}

export default function Overview() {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText('anitha.lumidai.in'); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  const earningsToday = todaySchedule.reduce((sum, s) => sum + (sessionRate[s.type] ?? 1500), 0)
  const collectedToday = todaySchedule.filter(s => s.paid).reduce((sum, s) => sum + (sessionRate[s.type] ?? 1500), 0)
  const followUpsDue = followUps.filter(f => f.due.toLowerCase().includes('today') || f.due.toLowerCase().includes('overdue')).length
  const activePatients = patients.filter(p => p.status === 'active').length
  const lapsedPatients = patients.filter(p => p.status === 'lapsed').length

  const weekBars = [
    { label: 'Mon', sessions: 5 }, { label: 'Tue', sessions: 4 }, { label: 'Wed', sessions: 3 },
    { label: 'Thu', sessions: 7 }, { label: 'Fri', sessions: 6 }, { label: 'Sat', sessions: 4 }, { label: 'Sun', sessions: 3 },
  ]
  const maxBar = Math.max(...weekBars.map(b => b.sessions))

  const bookingMix = [
    { key: 'confirmed', label: 'Confirmed', color: 'var(--color-primary)', hatch: 'url(#hatch-indigo)' },
    { key: 'pending', label: 'Pending', color: 'var(--badge-amber-fg)', hatch: 'url(#hatch-violet)' },
    { key: 'cancelled', label: 'Cancelled', color: 'var(--badge-rose-fg)', hatch: 'url(#hatch-rose)' },
  ].map(g => ({ ...g, count: bookings.filter(b => (g.key === 'confirmed' ? (b.status === 'confirmed' || b.status === 'completed') : b.status === g.key)).length }))
  const bookingTotal = bookings.length

  const actionItems = [
    { icon: Clock3, tone: 'amber' as const, title: `${followUps[0].patient} — follow-up due`, sub: followUps[0].note, href: '/app/follow-ups' },
    { icon: CreditCard, tone: 'amber' as const, title: 'Arjun Nair — payment pending', sub: '₹1,500 · Individual Session, 8:00 PM', href: '/app/bookings' },
    { icon: AlertTriangle, tone: 'neutral' as const, title: 'Sneha Kulkarni — booking unconfirmed', sub: 'Fri · 3:00 PM, awaiting payment', href: '/app/bookings' },
    { icon: FileText, tone: 'neutral' as const, title: 'Vikram Shetty — note incomplete', sub: 'Session ended yesterday', href: '/app/sessions' },
  ]

  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1)
  const startOffset = 6 // Aug 1, 2026 is a Saturday

  return (
    <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8 max-w-[1220px] mx-auto">
      <HatchDefs />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-ink)] leading-none">Hey Anitha, glad to have you back! 🙌</h1>
          <p className="text-[13px] text-[var(--color-ink-muted-48)] mt-1.5">Here's what needs your attention today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onPress={copy}>
            {copied ? <Check className="text-success" /> : <Download />} Export CSV
          </Button>
          <Link to="/app/calendar">
            <Button size="sm"><Plus /> Add new</Button>
          </Link>
        </div>
      </div>

      {/* Hero KPI + 3 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hero — solid indigo, matches the reference's "Total doctors" tile */}
        <div className="col-span-2 lg:col-span-1 rounded-[20px] p-5 text-white flex flex-col justify-between" style={{ background: 'linear-gradient(155deg, var(--color-primary), var(--color-primary-focus))' }}>
          <div className="flex items-start justify-between">
            <span className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center"><Stethoscope size={15} /></span>
            <button aria-label="Card options" className="text-white/60 hover:text-white"><MoreHorizontal size={16} /></button>
          </div>
          <div className="mt-4">
            <p className="text-[12px] text-white/70">Sessions today</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[28px] font-bold leading-none">{todaySchedule.length}</p>
              <TrendPill value="+12%" />
            </div>
            <p className="text-[11px] text-white/60 mt-2">{todaySchedule.filter(s => s.paid).length} paid · {todaySchedule.filter(s => !s.paid).length} awaiting</p>
          </div>
          <div className="mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full bg-white" style={{ width: '65%' }} />
          </div>
          <p className="text-[10px] text-white/50 mt-1.5 text-right">{collectedToday > 0 ? `₹${collectedToday.toLocaleString('en-IN')} today` : 'No payments yet'}</p>
        </div>

        <Card className="p-4 gap-0">
          <div className="flex items-start justify-between">
            <IconBadge icon={Wallet} bg="var(--badge-blue-bg)" fg="var(--badge-blue-fg)" />
            <CardMenu />
          </div>
          <p className="text-[12px] text-[var(--color-ink-muted-48)] mt-3">Today's earnings</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[20px] font-bold text-[var(--color-ink)] leading-none">₹{earningsToday.toLocaleString('en-IN')}</p>
            <TrendPill value="+18%" />
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-[var(--color-hairline)] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '72%', background: 'var(--badge-blue-fg)' }} />
          </div>
          <p className="text-[10px] text-[var(--color-ink-muted-48)] mt-1.5 text-right">₹{collectedToday.toLocaleString('en-IN')} collected</p>
        </Card>

        <Card className="p-4 gap-0">
          <div className="flex items-start justify-between">
            <IconBadge icon={Repeat2} bg="var(--badge-rose-bg)" fg="var(--badge-rose-fg)" />
            <CardMenu />
          </div>
          <p className="text-[12px] text-[var(--color-ink-muted-48)] mt-3">Follow-ups due</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[20px] font-bold text-[var(--color-ink)] leading-none">{followUpsDue}</p>
            <TrendPill value="Today" up={false} />
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-[var(--color-hairline)] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '40%', background: 'var(--badge-rose-fg)' }} />
          </div>
          <p className="text-[10px] text-[var(--color-ink-muted-48)] mt-1.5 text-right">{followUps.length} in queue</p>
        </Card>

        <Card className="p-4 gap-0">
          <div className="flex items-start justify-between">
            <IconBadge icon={Users} bg="var(--badge-violet-bg)" fg="var(--badge-violet-fg)" />
            <CardMenu />
          </div>
          <p className="text-[12px] text-[var(--color-ink-muted-48)] mt-3">No-show rate</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[20px] font-bold text-[var(--color-ink)] leading-none">3.2%</p>
            <TrendPill value="-1.9%" />
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-[var(--color-hairline)] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '8%', background: 'var(--badge-violet-fg)' }} />
          </div>
          <p className="text-[10px] text-[var(--color-ink-muted-48)] mt-1.5 text-right">{activePatients} active patients</p>
        </Card>
      </div>

      {/* Practice overview chart + calendar/activity */}
      <div className="mt-4 grid lg:grid-cols-[1.7fr_1fr] gap-4 items-start">
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

      {/* Booking mix donut + patient status list + appointments */}
      <div className="mt-4 grid lg:grid-cols-3 gap-4 items-start">
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
          <div className="px-4 py-3.5 border-b border-[var(--color-hairline)] flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[var(--color-ink)]">Patient status</p>
            <Link to="/app/patients" className="text-[11px] font-medium" style={{ color: 'var(--color-primary)' }}>View all</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 py-3 border-b border-[var(--color-hairline)] text-center">
            <div><p className="text-[16px] font-bold text-[var(--color-ink)]">{activePatients}</p><p className="text-[10px] text-[var(--color-ink-muted-48)]">Active</p></div>
            <div><p className="text-[16px] font-bold text-[var(--color-ink)]">{lapsedPatients}</p><p className="text-[10px] text-[var(--color-ink-muted-48)]">Lapsed</p></div>
          </div>
          <div className="divide-y divide-[var(--color-hairline)]">
            {patients.slice(0, 3).map(p => (
              <div key={p.id} className="px-4 py-2.5 flex items-center gap-2.5">
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

        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[var(--color-hairline)] flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[var(--color-ink)]">Needs attention</p>
            <Link to="/app/follow-ups" className="text-[11px] font-medium" style={{ color: 'var(--color-primary)' }}>View all</Link>
          </div>
          <div className="divide-y divide-[var(--color-hairline)]">
            {actionItems.map(item => (
              <Link key={item.title} to={item.href} className="px-4 py-2.5 flex items-center gap-2.5 hover:bg-[var(--color-canvas-parchment)]">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.tone === 'amber' ? '' : ''}`} style={{ background: item.tone === 'amber' ? 'var(--badge-amber-bg)' : 'var(--color-canvas-parchment)', color: item.tone === 'amber' ? 'var(--badge-amber-fg)' : 'var(--color-ink-muted-48)' }}>
                  <item.icon size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-[var(--color-ink)] truncate">{item.title}</p>
                  <p className="text-[10px] text-[var(--color-ink-muted-48)] truncate">{item.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent activity — full width footer strip */}
      <Card className="mt-4 p-4">
        <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-3">Recent activity</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: CalendarPlus, text: 'New booking from Rahul Sharma', time: '2 min ago' },
            { icon: CreditCard, text: 'Payment received · ₹1,500', time: '18 min ago' },
            { icon: CheckCircle2, text: 'Vikram completed his session', time: '1 hr ago' },
            { icon: UserPlus, text: 'New patient · Sneha Kulkarni', time: 'Yesterday' },
          ].map((a, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--color-canvas-parchment)', color: 'var(--color-ink-muted-48)' }}><a.icon size={13} /></span>
              <div className="min-w-0"><p className="text-[11px] text-[var(--color-ink)] leading-snug">{a.text}</p><p className="text-[10px] text-[var(--color-ink-muted-48)] mt-0.5">{a.time}</p></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
