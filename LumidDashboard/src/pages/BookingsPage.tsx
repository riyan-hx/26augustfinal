import { useState } from 'react'
import { bookings } from '../lib/data'
import { Search, Filter, MoreHorizontal, CheckCircle2, Clock3, XCircle, AlertTriangle } from '../lib/icons'
import { AnimatedNumber, SlidingTabs } from '../lib/animated'

const statusStyles: Record<string, string> = {
  confirmed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  pending: 'bg-amber-50 border-amber-200 text-amber-700',
  completed: 'bg-slate-50 border-slate-200 text-slate-700',
  cancelled: 'bg-red-50 border-red-200 text-red-700',
  'no-show': 'bg-zinc-100 border-zinc-300 text-zinc-600',
}

const filters = ['All', 'New', 'Confirmed', 'Completed', 'Cancelled', 'No-show'] as const
type BookingFilter = typeof filters[number]
/** "New" maps to a pending booking — awaiting payment, not yet on the
 *  calendar — since that's what "new" means in this flow's own language. */
const matchesFilter = (f: BookingFilter, status: string) =>
  f === 'All' || (f === 'New' ? status === 'pending' : status.toLowerCase() === f.toLowerCase())

export default function BookingsPage() {
  const [filter, setFilter] = useState<BookingFilter>('All')
  const filtered = bookings.filter(b => matchesFilter(filter, b.status))
  const counts = Object.fromEntries(filters.map(f => [f, bookings.filter(b => matchesFilter(f, b.status)).length])) as Record<BookingFilter, number>

  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-semibold tracking-tight">Bookings</h1>
          <p className="text-[12px] text-[var(--stone)] mt-1"><AnimatedNumber value={filtered.length} /> {filter === 'All' ? 'total' : filter.toLowerCase()} • Confirmed only after payment is verified • Razorpay secured</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-[var(--hairline)] rounded-full px-3 py-2">
            <Search size={14} className="text-[var(--stone)]" />
            <input placeholder="Search patient, booking ID…" className="bg-transparent outline-none text-[12px] w-[160px]" />
          </div>
          <button className="w-9 h-9 rounded-full bg-white border border-[var(--hairline)] flex items-center justify-center"><Filter size={14} /></button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SlidingTabs options={filters} active={filter} onChange={setFilter} counts={counts} size="sm" />
        <span className="ml-auto text-[11px] text-[var(--stone)] self-center hidden sm:inline">Flow: Select slot → Details → Pay → Verified → Calendar → Link → Reminder</span>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block mt-4 bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden">
        <div className="grid grid-cols-[1.2fr_1fr_0.9fr_0.7fr_0.7fr_40px] gap-4 px-6 py-3 bg-[var(--canvas)] text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">
          <span>PATIENT / BOOKING</span><span>SESSION</span><span>DATE & TIME</span><span>PAYMENT</span><span>STATUS</span><span></span>
        </div>
        <div className="divide-y divide-[var(--hairline)]">
          {filtered.map(b => (
            <div key={b.id} className="grid grid-cols-[1.2fr_1fr_0.9fr_0.7fr_0.7fr_40px] gap-4 px-6 py-4 items-center hover:bg-[var(--sage-50)]/50">
              <div className="flex items-center gap-3">
                <img src={`https://i.pravatar.cc/100?img=${parseInt(b.id.slice(-1)) + 10}`} alt="" className="w-9 h-9 rounded-full object-cover" />
                <div>
                  <p className="text-[13px] font-semibold leading-none">{b.patient}</p>
                  <p className="text-[11px] text-[var(--stone)]">{b.id}</p>
                </div>
              </div>
              <span className="text-[12px]">{b.type}</span>
              <span className="text-[12px]">{b.date}</span>
              <span className="text-[12px] font-medium">{b.amount}</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold w-fit ${statusStyles[b.status]}`}>
                {b.status === 'confirmed' && <CheckCircle2 size={12} />}{b.status === 'pending' && <Clock3 size={12} />}{b.status === 'cancelled' && <XCircle size={12} />}{b.status === 'no-show' && <AlertTriangle size={12} />} {b.status}
              </span>
              <button className="w-8 h-8 rounded-full hover:bg-[var(--canvas)] flex items-center justify-center"><MoreHorizontal size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden mt-4 space-y-3">
        {filtered.map(b => (
          <div key={b.id} className="bg-white border border-[var(--hairline)] rounded-[16px] p-4 flex gap-3">
            <img src={`https://i.pravatar.cc/100?img=${parseInt(b.id.slice(-1)) + 10}`} alt="" className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold">{b.patient} <span className="text-[11px] text-[var(--stone)]">• {b.id}</span></p>
              <p className="text-[12px] text-[var(--stone)]">{b.type} • {b.date} • {b.amount}</p>
              <span className={`inline-flex mt-2 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${statusStyles[b.status]}`}>{b.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-[16px] p-4 flex gap-3">
        <div className="w-8 h-8 rounded-full bg-white border border-amber-200 flex items-center justify-center shrink-0"><AlertTriangle size={14} className="text-amber-600" /></div>
        <div>
          <p className="text-[13px] font-semibold">Why payment first?</p>
          <p className="text-[12px] text-[var(--slate)] leading-relaxed mt-1">A booking is NOT confirmed until Razorpay verifies the payment. This removes awkward follow-ups and secures income before the calendar is blocked. No-shows drop to ~5% after enforcement.</p>
        </div>
      </div>
    </div>
  )
}
