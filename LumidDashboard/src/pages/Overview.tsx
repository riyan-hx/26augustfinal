import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Copy, Check, ArrowUpRight, Clock3, CreditCard, AlertTriangle, FileText,
  CalendarPlus, UserPlus, CheckCircle2, Eye, Share2, Sparkles, Plus,
} from 'lucide-react'
import { Button, buttonVariants, Card, Chip, Alert } from '@heroui/react'
import { todaySchedule, followUps, patients } from '../lib/data'

const sessionRate: Record<string, number> = { 'Individual Session': 1500, 'Initial Consultation': 2000, 'Follow-up': 1200 }

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="px-4 py-3.5 gap-0">
      <p className="type-caption text-muted">{label}</p>
      <p className="text-[22px] font-semibold text-foreground tracking-tight mt-1 leading-none">{value}</p>
      <p className="type-caption text-muted mt-1.5">{sub}</p>
    </Card>
  )
}

function PaidChip({ paid }: { paid: boolean }) {
  return (
    <Chip color={paid ? 'success' : 'warning'} variant="soft" size="sm">
      {paid ? 'Paid' : 'Awaiting'}
    </Chip>
  )
}

export default function Overview() {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText('anitha.lumidai.in'); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  const earningsToday = todaySchedule.reduce((sum, s) => sum + (sessionRate[s.type] ?? 1500), 0)
  const collectedToday = todaySchedule.filter(s => s.paid).reduce((sum, s) => sum + (sessionRate[s.type] ?? 1500), 0)
  const followUpsDue = followUps.filter(f => f.due.toLowerCase().includes('today') || f.due.toLowerCase().includes('overdue')).length
  const lapsedPatients = patients.filter(p => p.status === 'lapsed').length

  const actionItems = [
    { icon: Clock3, tone: 'warning' as const, title: `${followUps[0].patient} — follow-up due`, sub: followUps[0].note, href: '/app/follow-ups' },
    { icon: CreditCard, tone: 'warning' as const, title: 'Arjun Nair — payment pending', sub: '₹1,500 · Individual Session, 8:00 PM', href: '/app/bookings' },
    { icon: AlertTriangle, tone: 'default' as const, title: 'Sneha Kulkarni — booking unconfirmed', sub: 'Fri · 3:00 PM, awaiting payment', href: '/app/bookings' },
    { icon: FileText, tone: 'default' as const, title: 'Vikram Shetty — note incomplete', sub: 'Session ended yesterday', href: '/app/sessions' },
  ]

  const weekBars = [
    { label: 'Mon', sessions: 5 }, { label: 'Tue', sessions: 4 }, { label: 'Wed', sessions: 3 },
    { label: 'Thu', sessions: 7 }, { label: 'Fri', sessions: 6 }, { label: 'Sat', sessions: 4 }, { label: 'Sun', sessions: 3 },
  ]
  const maxBar = Math.max(...weekBars.map(b => b.sessions))

  return (
    <div className="px-4 lg:px-6 py-6 pb-24 lg:pb-8 max-w-[1160px] mx-auto">
      {/* Header — exact type roles: page title = display-md (34px/600/-0.374px), lede = body (17px/400) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3" style={{ paddingBottom: 'var(--spacing-lg)' }}>
        <div>
          <h1 className="type-display-md text-foreground">Good morning, Dr. Anitha</h1>
          <p className="type-body text-muted mt-1">Here's what needs your attention today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onPress={copy}>
            {copied ? <Check className="text-success" /> : <Copy />} anitha.lumidai.in
          </Button>
          <Link to="/app/calendar" className={buttonVariants({ size: 'sm' })}>
            <Plus /> New availability
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
        <Card className="overflow-hidden p-0 gap-0">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-border">
            <Card.Title className="type-body-strong">Today's schedule</Card.Title>
            <Link to="/app/calendar" className="text-xs font-medium text-accent flex items-center gap-1">Open calendar <ArrowUpRight size={11} /></Link>
          </div>
          <div className="divide-y divide-border">
            {todaySchedule.map(s => (
              <div key={s.time + s.patient} className="px-5 py-3.5 flex items-center gap-3">
                <span className="text-sm font-medium text-foreground w-16 shrink-0">{s.time}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.patient}</p>
                  <p className="text-xs text-muted">{s.type}{s.meeting && s.meeting !== '—' ? ` · ${s.meeting}` : ''}</p>
                </div>
                <span className="text-sm font-medium text-foreground shrink-0">₹{(sessionRate[s.type] ?? 1500).toLocaleString('en-IN')}</span>
                <PaidChip paid={s.paid} />
              </div>
            ))}
          </div>
          <div className="px-5 py-2.5 bg-surface-secondary text-xs text-muted">
            Booking is confirmed only after Razorpay verifies payment.
          </div>
        </Card>

        <Card className="overflow-hidden p-0 gap-0">
          <div className="px-5 py-3.5 border-b border-border">
            <Card.Title className="type-body-strong">Needs attention</Card.Title>
            <Card.Description className="mt-0.5">{actionItems.length} things today</Card.Description>
          </div>
          <div className="p-2.5 space-y-1.5 flex-1">
            {actionItems.map(item => (
              <Link key={item.title} to={item.href} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-surface-secondary transition">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${item.tone === 'warning' ? 'bg-warning/15 text-warning' : 'bg-surface-secondary text-muted'}`}>
                  <item.icon size={13} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground leading-snug">{item.title}</p>
                  <p className="text-xs text-muted truncate">{item.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Month summary + booking page */}
      <div className="mt-4 grid lg:grid-cols-[1.6fr_1fr] gap-4">
        <Card>
          <Card.Header className="flex-row items-center justify-between">
            <Card.Title className="type-body-strong">This month</Card.Title>
            <Link to="/app/earnings" className="text-xs font-medium text-accent flex items-center gap-1">View earnings <ArrowUpRight size={11} /></Link>
          </Card.Header>
          <Card.Content>
            <div className="flex items-baseline gap-4">
              <div><p className="text-xl font-semibold text-foreground tracking-tight leading-none">₹48,600</p><p className="text-xs text-muted mt-1">Earnings · +18% vs last month</p></div>
              <div><p className="text-xl font-semibold text-foreground tracking-tight leading-none">32</p><p className="text-xs text-muted mt-1">Sessions · +14%</p></div>
            </div>
            <div className="mt-5 flex items-end gap-2.5 h-16">
              {weekBars.map(b => (
                <div key={b.label} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                  <div className="w-full rounded bg-accent/25" style={{ height: `${Math.max(8, (b.sessions / maxBar) * 48)}px` }} />
                  <span className="text-[10px] text-muted">{b.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">Sessions per day this week — Thursday is your busiest day.</p>
          </Card.Content>
        </Card>

        <div className="space-y-4">
          <Card>
            <Card.Title className="type-body-strong">Your booking page</Card.Title>
            <p className="text-xs font-medium text-accent mt-1.5">anitha.lumidai.in</p>
            <Card.Description className="mt-1">Share this in your Instagram bio, WhatsApp, or email signature.</Card.Description>
            <Card.Footer className="mt-3 gap-2 px-0">
              <Button size="sm" className="flex-1" onPress={copy}>
                {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy link'}
              </Button>
              <Link to="/app/your-page" className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'flex-1' })}>
                <Eye /> Open
              </Link>
              <Button isIconOnly aria-label="Share" variant="secondary" size="sm"><Share2 /></Button>
            </Card.Footer>
          </Card>

          <Card>
            <Card.Title className="type-body-strong">Recent activity</Card.Title>
            <Card.Content className="mt-1 gap-3">
              {[
                { icon: CalendarPlus, text: 'New booking from Rahul Sharma', time: '2 min ago' },
                { icon: CreditCard, text: 'Payment received · ₹1,500', time: '18 min ago' },
                { icon: CheckCircle2, text: 'Vikram completed his session', time: '1 hr ago' },
                { icon: UserPlus, text: 'New patient · Sneha Kulkarni', time: 'Yesterday' },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-surface-secondary flex items-center justify-center shrink-0 mt-0.5"><a.icon size={12} className="text-muted" /></div>
                  <div className="min-w-0"><p className="text-xs text-foreground leading-snug">{a.text}</p><p className="text-xs text-muted mt-0.5">{a.time}</p></div>
                </div>
              ))}
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* Patient continuity — quick nudge to lapsed patients */}
      {lapsedPatients > 0 && (
        <Alert status="warning" className="mt-4">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              <span className="font-medium text-foreground">{lapsedPatients} patients</span> have no upcoming session booked.
            </Alert.Description>
          </Alert.Content>
          <Link to="/app/patients" className="text-xs font-medium text-accent flex items-center gap-1 shrink-0 self-center">Review <ArrowUpRight size={11} /></Link>
        </Alert>
      )}

      {/* Intelligence — deliberately quiet, this is the vision, not a built feature yet */}
      <Link to="/app/insights">
        <Alert className="mt-4 hover:bg-surface-secondary transition">
          <Alert.Indicator><Sparkles /></Alert.Indicator>
          <Alert.Content>
            <Alert.Description><span className="font-medium text-foreground">Coming next:</span> consented insights that connect what happens between sessions to what you discuss in them.</Alert.Description>
          </Alert.Content>
          <ArrowUpRight size={13} className="text-muted shrink-0 self-center" />
        </Alert>
      </Link>
    </div>
  )
}
