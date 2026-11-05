import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Repeat2, TrendingUp, Wallet } from '../../lib/icons'
import { ErrorState, Skeleton } from '../../components/ui/StateViews'
import type { BookingSummary } from '../../types/domain'
import { card, CardTitle, Pill, type Tone } from './ui'
import { DAY } from './utils'

interface Query { isLoading: boolean; error: unknown; refetch: () => unknown }

/* ---------- Numbers row ---------- */

export interface KpiItem {
  label: string; value: string; icon: keyof typeof kpiIcons; loading: boolean; error?: boolean
  chip?: { text: string; tone: Tone }; sub?: ReactNode; to?: string; hero?: boolean
}

const kpiIcons = { earnings: <Wallet size={14} />, awaiting: <CreditCard size={14} />, followups: <Repeat2 size={14} />, noshow: <TrendingUp size={14} /> }

/** Four numbers in one white tray: the first is the dark-green hero tile. */
export function KpiRow({ items }: { items: KpiItem[] }) {
  return (
    <section aria-label="Today in numbers" className={`${card} p-2 grid grid-cols-2 xl:grid-cols-4 gap-2`}>
      {items.map((k) => {
        const body = (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className={`text-[12px] sm:text-[13px] font-medium leading-snug ${k.hero ? 'text-white' : 'text-[var(--ink)]'}`}>{k.label}</p>
              <span className={`hidden sm:flex w-7 h-7 rounded-full items-center justify-center shrink-0 ${k.hero ? 'bg-white/15 text-white' : 'bg-white text-[var(--ink)]'}`}>{kpiIcons[k.icon]}</span>
            </div>
            {k.loading ? <Skeleton className="h-9 w-28 mt-4" />
              : <p className={`text-[22px] sm:text-[24px] font-semibold tracking-tight mt-1.5 tabular-nums truncate ${k.hero ? 'text-white' : ''}`}>{k.error ? '—' : k.value}</p>}
            <div className={`mt-2 flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-1 min-w-0 text-[11px] sm:text-[12px] ${k.hero ? 'text-white/85' : 'text-[var(--stone)]'}`}>
              {k.error ? 'Couldn’t load' : (
                <>
                  {k.chip && (k.hero
                    ? <span className="px-2 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-semibold tabular-nums whitespace-nowrap">{k.chip.text}</span>
                    : <Pill tone={k.chip.tone}>{k.chip.text}</Pill>)}
                  <span className="truncate">{k.sub}</span>
                </>
              )}
            </div>
          </>
        )
        const cls = `block rounded-[14px] p-3.5 sm:p-4 min-w-0 transition-[filter,background-color] ${k.hero ? 'text-white hover:brightness-110' : 'bg-[var(--color-surface-panel)] hover:bg-[#ecf0eb]'}`
        const style = k.hero ? { background: 'var(--gradient-forest)' } : undefined
        return k.to
          ? <Link key={k.label} to={k.to} className={cls} style={style}>{body}</Link>
          : <div key={k.label} className={cls} style={style}>{body}</div>
      })}
    </section>
  )
}

/* ---------- Next 7 days ---------- */

/** Next seven days at a glance: one bar per day, height by sessions booked. */
export function WeekStrip({ bookings, start, q }: { bookings: BookingSummary[]; start: Date; q: Query }) {
  const loading = q.isLoading
  const days = Array.from({ length: 7 }, (_, i) => {
    const from = start.getTime() + i * DAY
    const n = bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'expired' && b.startsAt.getTime() >= from && b.startsAt.getTime() < from + DAY).length
    return { label: new Date(from + 12 * 3_600_000).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'narrow' }), n }
  })
  const max = Math.max(1, ...days.map((d) => d.n))
  const total = days.reduce((s, d) => s + d.n, 0)
  return (
    <section className={`${card} p-5`} aria-labelledby="week-h">
      <CardTitle id="week-h" title="Next 7 days"
        sub={loading || q.error ? ' ' : total ? `${total} ${total === 1 ? 'session' : 'sessions'} booked` : 'Nothing booked yet'}
        right={<Link to="/app/calendar" className="text-[12px] text-[var(--stone)] hover:text-[var(--ink)] underline-offset-4 hover:underline">Calendar →</Link>} />
      {q.error ? <div className="mt-3"><ErrorState compact error={q.error} onRetry={() => void q.refetch()} /></div> : (
        <div className="mt-4 grid grid-cols-7 gap-2 items-end h-[120px]" aria-label="Sessions per day">
          {days.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-2 h-full justify-end">
              <span className="text-[12px] tabular-nums text-[var(--stone)]">{loading ? '' : d.n || ''}</span>
              <span className={`w-full max-w-[32px] rounded-[8px] transition-[height] duration-300 ${i === 0 ? 'bg-[var(--color-lime)]' : d.n ? 'bg-[#cfe9bd]' : 'bg-[var(--color-surface-panel)]'}`}
                style={{ height: loading ? 8 : Math.max(8, (d.n / max) * 76) }} />
              <span className={`text-[12px] ${i === 0 ? 'font-semibold' : 'text-[var(--stone)]'}`}>{i === 0 ? 'Today' : d.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
