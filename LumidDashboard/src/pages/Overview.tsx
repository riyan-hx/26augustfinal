import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Copy, Check, ArrowUpRight, Clock3, CreditCard, AlertTriangle, FileText,
  CalendarPlus, UserPlus, CheckCircle2, Eye, Share2, Sparkles, Plus,
} from 'lucide-react'
import { todaySchedule, followUps, patients } from '../lib/data'

const sessionRate: Record<string, number> = { 'Individual Session': 1500, 'Initial Consultation': 2000, 'Follow-up': 1200 }

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-[var(--hairline)] rounded-[12px] px-4 py-3.5">
      <p className="text-[11px] font-medium text-[var(--stone)]">{label}</p>
      <p className="text-[20px] font-semibold text-[var(--ink)] tracking-tight mt-1 leading-none">{value}</p>
      <p className="text-[11px] text-[var(--stone)] mt-1.5">{sub}</p>
    </div>
  )
}

function PaidBadge({ paid }: { paid: boolean }) {
  return paid
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">Paid</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium">Awaiting</span>
}

export default function Overview() {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText('anitha.lumidai.in'); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  const earningsToday = todaySchedule.reduce((sum, s) => sum + (sessionRate[s.type] ?? 1500), 0)
  const collectedToday = todaySchedule.filter(s => s.paid).reduce((sum, s) => sum + (sessionRate[s.type] ?? 1500), 0)
  const followUpsDue = followUps.filter(f => f.due.toLowerCase().includes('today') || f.due.toLowerCase().includes('overdue')).length
  const lapsedPatients = patients.filter(p => p.status === 'lapsed').length

  const actionItems = [
    { icon: Clock3, tone: 'amber' as const, title: `${followUps[0].patient} — follow-up due`, sub: followUps[0].note, href: '/app/follow-ups' },
    { icon: CreditCard, tone: 'amber' as const, title: 'Arjun Nair — payment pending', sub: '₹1,500 · Individual Session, 8:00 PM', href: '/app/bookings' },
    { icon: AlertTriangle, tone: 'neutral' as const, title: 'Sneha Kulkarni — booking unconfirmed', sub: 'Fri · 3:00 PM, awaiting payment', href: '/app/bookings' },
    { icon: FileText, tone: 'neutral' as const, title: 'Vikram Shetty — note incomplete', sub: 'Session ended yesterday', href: '/app/sessions' },
  ]

  const weekBars = [
    { label: 'Mon', sessions: 5 }, { label: 'Tue', sessions: 4 }, { label: 'Wed', sessions: 3 },
    { label: 'Thu', sessions: 7 }, { label: 'Fri', sessions: 6 }, { label: 'Sat', sessions: 4 }, { label: 'Sun', sessions: 3 },
  ]
  const maxBar = Math.max(...weekBars.map(b => b.sessions))

  return (
    <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8 max-w-[1160px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--ink)] leading-none">Good morning, Dr. Anitha</h1>
          <p className="text-[13px] text-[var(--stone)] mt-1.5">Here's what needs your attention today.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copy} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[var(--hairline)] text-[12px] font-medium text-[var(--ink)] hover:bg-[var(--surface-warm)]">
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-[var(--stone)]" />} anitha.lumidai.in
          </button>
          <Link to="/app/calendar" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--green-700)] text-white text-[12px] font-medium hover:bg-[var(--green-800)]">
            <Plus size={13} /> New availability
          </Link>
        </div>
      </div>

      {/* Today at a glance */}
      <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Sessions today" value={String(todaySchedule.length)} sub={`${todaySchedule.filter(s => s.paid).length} paid · ${todaySchedule.filter(s => !s.paid).length} awaiting`} />
        <StatTile label="Today's earnings" value={`₹${earningsToday.toLocaleString('en-IN')}`} sub={`₹${collectedToday.toLocaleString('en-IN')} collected so far`} />
        <StatTile label="Follow-ups due" value={String(followUpsDue)} sub="Needs a nudge today" />
        <StatTile label="No-show rate" value="3.2%" sub="Down from 5.1% last month" />
      </div>

      {/* Schedule + Action center */}
      <div className="mt-4 grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <div className="bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-[var(--hairline)]">
            <h3 className="text-[13px] font-semibold text-[var(--ink)]">Today's schedule</h3>
            <Link to="/app/calendar" className="text-[11px] font-medium text-[var(--green-700)] flex items-center gap-1">Open calendar <ArrowUpRight size={11} /></Link>
          </div>
          <div className="divide-y divide-[var(--hairline)]">
            {todaySchedule.map(s => (
              <div key={s.time + s.patient} className="px-5 py-3.5 flex items-center gap-3">
                <span className="text-[12px] font-medium text-[var(--ink)] w-[64px] shrink-0">{s.time}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--ink)] truncate">{s.patient}</p>
                  <p className="text-[11px] text-[var(--stone)]">{s.type}{s.meeting && s.meeting !== '—' ? ` · ${s.meeting}` : ''}</p>
                </div>
                <span className="text-[12px] font-medium text-[var(--ink)] shrink-0">₹{(sessionRate[s.type] ?? 1500).toLocaleString('en-IN')}</span>
                <PaidBadge paid={s.paid} />
              </div>
            ))}
          </div>
          <div className="px-5 py-2.5 bg-[var(--surface-warm)] text-[11px] text-[var(--stone)]">
            Booking is confirmed only after Razorpay verifies payment.
          </div>
        </div>

        <div className="bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-[var(--hairline)]">
            <h3 className="text-[13px] font-semibold text-[var(--ink)]">Needs attention</h3>
            <p className="text-[11px] text-[var(--stone)] mt-0.5">{actionItems.length} things today</p>
          </div>
          <div className="p-2.5 space-y-1.5 flex-1">
            {actionItems.map(item => (
              <Link key={item.title} to={item.href} className="flex items-start gap-2.5 p-2.5 rounded-[10px] hover:bg-[var(--surface-warm)] transition">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${item.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-[var(--surface-warm)] text-[var(--stone)]'}`}>
                  <item.icon size={13} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[var(--ink)] leading-snug">{item.title}</p>
                  <p className="text-[11px] text-[var(--stone)] truncate">{item.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Month summary + booking page */}
      <div className="mt-4 grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <div className="bg-white border border-[var(--hairline)] rounded-[16px] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[var(--ink)]">This month</h3>
            <Link to="/app/earnings" className="text-[11px] font-medium text-[var(--green-700)] flex items-center gap-1">View earnings <ArrowUpRight size={11} /></Link>
          </div>
          <div className="flex items-baseline gap-4 mt-3">
            <div><p className="text-[22px] font-semibold text-[var(--ink)] tracking-tight leading-none">₹48,600</p><p className="text-[11px] text-[var(--stone)] mt-1">Earnings · +18% vs last month</p></div>
            <div><p className="text-[22px] font-semibold text-[var(--ink)] tracking-tight leading-none">32</p><p className="text-[11px] text-[var(--stone)] mt-1">Sessions · +14%</p></div>
          </div>
          <div className="mt-5 flex items-end gap-2.5 h-[64px]">
            {weekBars.map(b => (
              <div key={b.label} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                <div className="w-full rounded-[4px] bg-[var(--green-200)]" style={{ height: `${Math.max(8, (b.sessions / maxBar) * 48)}px` }} />
                <span className="text-[10px] text-[var(--stone)]">{b.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[var(--stone)] mt-3">Sessions per day this week — Thursday is your busiest day.</p>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-[var(--hairline)] rounded-[16px] p-5">
            <h3 className="text-[13px] font-semibold text-[var(--ink)]">Your booking page</h3>
            <p className="text-[12px] font-medium text-[var(--green-700)] mt-1.5">anitha.lumidai.in</p>
            <p className="text-[11px] text-[var(--stone)] mt-1">Share this in your Instagram bio, WhatsApp, or email signature.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={copy} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-[var(--green-700)] text-white text-[11px] font-medium">
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy link'}
              </button>
              <Link to="/app/your-page" className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-white border border-[var(--hairline)] text-[11px] font-medium text-[var(--ink)]">
                <Eye size={12} /> Open
              </Link>
              <button className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-full bg-white border border-[var(--hairline)] text-[var(--ink)]"><Share2 size={13} /></button>
            </div>
          </div>

          <div className="bg-white border border-[var(--hairline)] rounded-[16px] p-5">
            <h3 className="text-[13px] font-semibold text-[var(--ink)]">Recent activity</h3>
            <div className="mt-3 space-y-3">
              {[
                { icon: CalendarPlus, text: 'New booking from Rahul Sharma', time: '2 min ago' },
                { icon: CreditCard, text: 'Payment received · ₹1,500', time: '18 min ago' },
                { icon: CheckCircle2, text: 'Vikram completed his session', time: '1 hr ago' },
                { icon: UserPlus, text: 'New patient · Sneha Kulkarni', time: 'Yesterday' },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[var(--surface-warm)] flex items-center justify-center shrink-0 mt-0.5"><a.icon size={12} className="text-[var(--slate)]" /></div>
                  <div className="min-w-0"><p className="text-[12px] text-[var(--ink)] leading-snug">{a.text}</p><p className="text-[11px] text-[var(--stone)] mt-0.5">{a.time}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Patient continuity — quick nudge to lapsed patients, links to real page */}
      {lapsedPatients > 0 && (
        <div className="mt-4 bg-white border border-[var(--hairline)] rounded-[16px] px-5 py-3.5 flex items-center gap-3">
          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
          <p className="text-[12px] text-[var(--slate)]">
            <span className="font-medium text-[var(--ink)]">{lapsedPatients} patients</span> have no upcoming session booked.
          </p>
          <Link to="/app/patients" className="ml-auto text-[11px] font-medium text-[var(--green-700)] flex items-center gap-1 shrink-0">Review <ArrowUpRight size={11} /></Link>
        </div>
      )}

      {/* Intelligence — deliberately quiet, this is the vision, not a built feature yet */}
      <Link to="/app/insights" className="mt-4 flex items-center gap-3 bg-[var(--surface-warm)] border border-dashed border-[var(--hairline-strong)] rounded-[16px] px-5 py-3.5 hover:bg-[var(--surface-soft)] transition">
        <Sparkles size={15} className="text-[var(--green-700)] shrink-0" />
        <p className="text-[12px] text-[var(--slate)]"><span className="font-medium text-[var(--ink)]">Coming next:</span> consented insights that connect what happens between sessions to what you discuss in them.</p>
        <ArrowUpRight size={13} className="ml-auto text-[var(--stone)] shrink-0" />
      </Link>
    </div>
  )
}
