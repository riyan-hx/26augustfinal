import { useState } from 'react'
import {
  ArrowUpRight, CreditCard, TrendingUp, TrendingDown, Users, CheckCircle2, Clock,
  Copy, Check, Plus, Link2, AlertTriangle, FileText, BarChart3, Calendar, UserPlus, CalendarPlus, Eye,
  Share2, Brain, AlertCircle, Search, SlidersHorizontal, Sparkles, Info, LayoutGrid
} from 'lucide-react'

function StatusBadge({ status }: { status: string }) {
  if (status === 'Paid') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[11px] font-medium"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Paid</span>
  if (status === 'Awaiting payment') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-[11px] font-medium"><span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> Awaiting</span>
  return <span className="px-2.5 py-1 rounded-full bg-white border border-[#E7ECE8] text-[#8A9487] text-[11px] font-medium">{status}</span>
}

function InfoDot() {
  return <span className="w-4 h-4 rounded-full border border-[#E7ECE8] flex items-center justify-center text-[#9CA3AF] text-[10px]"><Info size={10} /></span>
}

export default function Overview() {
  const [earningsRange, setEarningsRange] = useState<'7d'|'30d'|'3m'>('30d')
  const [healthTab, setHealthTab] = useState<'Sessions'|'Earnings'|'Patients'>('Sessions')
  const [scheduleTab, setScheduleTab] = useState<'All'|'Confirmed'|'Pending'|'Completed'>('All')
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText('anitha.lumid.ai'); setCopied(true); setTimeout(()=>setCopied(false),1500) }

  return (
    <div className="max-w-[1360px] mx-auto px-5 lg:px-8 py-5 pb-24 lg:pb-8 bg-[#FCFDFB]">
      <div className="grid grid-cols-12 gap-4">
        {/* PAGE HEADER — Sales Overview style */}
        <div className="col-span-12">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight text-[#111827] leading-none">Practice Overview</h1>
              <p className="text-[13px] text-[#6B7280] mt-1.5">Your current practice summary and activity.</p>
              <p className="text-[13px] text-[#6B7280] mt-3 lg:hidden">Good morning, Dr. Anitha — here’s what needs your attention today.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* avatar group like reference */}
              <div className="hidden sm:flex items-center -space-x-2">
                <img src="https://i.pravatar.cc/100?img=12" alt="" className="w-7 h-7 rounded-full border-2 border-white" />
                <div className="w-7 h-7 rounded-full bg-[#242E21] border-2 border-white flex items-center justify-center text-white text-[10px] font-semibold">G</div>
                <img src="https://i.pravatar.cc/100?img=14" alt="" className="w-7 h-7 rounded-full border-2 border-white" />
                <span className="w-7 h-7 rounded-full bg-white border border-[#E7ECE8] flex items-center justify-center text-[10px] font-medium text-[#6B7280]">+2</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E7ECE8] text-[12px] font-medium text-[#374151] shadow-sm">
                <Calendar size={12} /> Aug 01 — Aug 26
              </span>
              <button onClick={copy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E7ECE8] text-[12px] font-medium text-[#111827] hover:bg-[#F9FAFB] shadow-sm">
                <Link2 size={12} /> anitha.lumid.ai {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="opacity-60" />}
              </button>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2 mt-4">
            <h2 className="text-[16px] font-semibold text-[#111827]">Good morning, Dr. Anitha</h2>
            <span className="text-[12px] text-[#9CA3AF]">• Here’s what needs your attention today.</span>
            <div className="ml-auto flex items-center gap-2">
              <a href="/app/calendar" className="px-4 py-2 rounded-full bg-white border border-[#E7ECE8] text-[13px] font-medium text-[#111827] hover:bg-[#F9FAFB] shadow-sm">View calendar</a>
              <button className="px-4 py-2 rounded-full bg-[#111827] text-white text-[13px] font-medium hover:bg-black shadow-sm flex items-center gap-1"><Plus size={14} /> New availability</button>
            </div>
          </div>
        </div>

        {/* PRACTICE SETUP — thin pill like reference footer pill style */}
        <div className="col-span-12 bg-white border border-[#E7ECE8] rounded-[16px] px-4 py-2.5 flex flex-wrap items-center gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <span className="text-[11px] font-semibold tracking-[0.06em] text-[#111827]">GET YOUR PRACTICE READY — 4/6</span>
          <span className="flex items-center gap-1.5 text-[11px] text-[#6B7280]"><CheckCircle2 size={12} className="text-[#10B981]" /> Profile ✓ <span className="opacity-30">·</span> Pricing ✓ <span className="opacity-30">·</span> <span className="px-2 py-0.5 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E]">Availability ○</span> <span className="px-2 py-0.5 rounded-full bg-white border border-[#E7ECE8] text-[#9CA3AF]">Payments ○</span></span>
          <a href="/app/your-page" className="ml-auto text-[12px] font-medium text-[#111827]">Finish setup →</a>
        </div>

        {/* KPI ROW — 5 compact cards styled like reference small cards */}
        <div className="col-span-12 grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "TODAY'S SESSIONS", value: '4', sub: '3 confirmed · 1 upcoming', trend: null as string | null },
            { label: "TODAY'S EARNINGS", value: '₹6,000', sub: '+12% vs last week', trend: '+12%' },
            { label: 'THIS MONTH', value: '₹48,600', sub: '+18% vs last month', trend: '+18%' },
            { label: 'NEW PATIENTS', value: '8', sub: '+3 this month', trend: '+3' },
            { label: 'NO-SHOW RATE', value: '3.2%', sub: '↓ from 5.1%', trend: '-1.9%' },
          ].map(c => (
            <div key={c.label} className="bg-white border border-[#E7ECE8] rounded-[20px] px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <p className="text-[10px] font-semibold tracking-[0.08em] text-[#9CA3AF] flex items-center gap-1">{c.label} <InfoDot /></p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-[22px] font-semibold tracking-tight text-[#111827] leading-none">{c.value}</p>
                {c.trend && (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${c.label==='NO-SHOW RATE' ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]' : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'}`}>
                    {c.trend.includes('-') || c.trend.includes('↓') ? <TrendingDown size={10} /> : <TrendingUp size={10} />} {c.trend}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#9CA3AF] mt-1.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* PREMIUM 3-CARD ROW — directly mirroring Affiliate Revenue / Total Store Tax / My Balance */}
        {/* Card 1: Today's Sessions — Affiliate Revenue clone */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#E7ECE8] rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col">
          <div className="flex items-start justify-between">
            <p className="text-[13px] font-semibold text-[#111827] flex items-center gap-1.5">Today's Sessions <InfoDot /></p>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <p className="text-[28px] font-bold tracking-tight leading-none text-[#111827]">4</p>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[11px] font-semibold mb-1">
              <TrendingUp size={12} /> 9.6%
            </span>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-1">3 confirmed · 1 upcoming · 50 min avg</p>
          <div className="mt-4 rounded-[14px] border border-[#F3F4F6] bg-[#F9FAFB] p-3">
            <div className="flex items-center justify-between text-[11px] mb-2">
              <span className="text-[#6B7280]">Daily capacity</span>
              <span className="font-medium text-[#111827]">₹6,000.00</span>
            </div>
            <div className="h-6 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] overflow-hidden flex p-1 relative"
              style={{ backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(0,0,0,0.04) 6px, rgba(0,0,0,0.04) 12px)` }}>
              <div className="h-full rounded-full bg-[#88D95F] flex items-center justify-end pr-2" style={{ width: '65%' }}>
                <span className="text-[11px] font-bold text-white">65%</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-full border border-[#E7ECE8] bg-white px-3 py-2 text-[11px] font-medium text-[#374151]">
            <span className="w-6 h-6 rounded-full bg-[#F3F4F6] border border-[#E7ECE8] flex items-center justify-center"><LayoutGrid size={12} /></span>
            Schedule funnel statistic
          </div>
        </div>

        {/* Card 2: Earnings Breakdown — Total Store Tax clone */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#E7ECE8] rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col">
          <div className="flex items-start justify-between">
            <p className="text-[13px] font-semibold text-[#111827] flex items-center gap-1.5">Earnings Overview <InfoDot /></p>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <p className="text-[28px] font-bold tracking-tight leading-none text-[#111827]">₹48,600</p>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-[11px] font-semibold mb-1">
              <TrendingDown size={12} /> 3.8%
            </span>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-1">Compare from last month</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { pct: '61%', label: 'Paid', color: '#88D95F' },
              { pct: '31%', label: 'Pending', color: '#F59E0B' },
              { pct: '8%', label: 'Available', color: '#242E21' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="flex justify-center mb-1"><span className="px-2 py-0.5 rounded-full bg-white border border-[#E7ECE8] text-[10px] font-semibold text-[#6B7280]">{s.pct}</span></div>
                <div className="h-1.5 rounded-full" style={{ background: s.color }} />
                <p className="text-[10px] font-medium text-[#6B7280] mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 h-1.5 flex rounded-full overflow-hidden border border-[#F3F4F6]">
            <div className="h-full" style={{ width: '61%', background: '#88D95F' }} />
            <div className="h-full" style={{ width: '31%', background: '#F59E0B' }} />
            <div className="h-full" style={{ width: '8%', background: '#242E21' }} />
          </div>
          <div className="mt-3 rounded-full border border-[#E7ECE8] bg-[#F9FAFB] px-3 py-2 flex items-center gap-2 text-[11px] text-[#6B7280]">
            <FileText size={12} /> Your earnings have increased.
          </div>
        </div>

        {/* Card 3: Practice Balance — My Balance clone */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#E7ECE8] rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[#111827] flex items-center gap-1.5">Practice Balance <InfoDot /></p>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E7ECE8] text-[11px] font-medium text-[#374151]">
              <Calendar size={12} /> Month
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#242E21]" /> Income</span>
            <span className="flex items-center gap-1.5 text-[#9CA3AF]"><span className="w-2 h-2 rounded-full bg-[#E5E7EB]" /> Expense</span>
          </div>
          <div className="mt-4 flex items-end gap-2 h-[120px] relative">
            {/* Y axis */}
            <div className="hidden sm:flex flex-col justify-between h-full text-[10px] text-[#9CA3AF] pr-2">
              <span>100k</span><span>50k</span><span>0</span><span>-50k</span><span>-100k</span>
            </div>
            <div className="flex-1 flex items-end gap-1.5 h-full">
              {[
                { inc: 92, exp: 38, label: 'JAN' },
                { inc: 108, exp: 44, label: 'FEB' },
                { inc: 58, exp: 32, label: 'MAR' },
                { inc: 62, exp: 28, label: 'APR' },
                { inc: 34, exp: 52, label: 'MAY', active: true },
                { inc: 68, exp: 46, label: 'JUN' },
                { inc: 54, exp: 36, label: 'JUL' },
                { inc: 72, exp: 40, label: 'AUG' },
                { inc: 66, exp: 34, label: 'SEP' },
                { inc: 78, exp: 42, label: 'OCT' },
                { inc: 70, exp: 38, label: 'NOV' },
                { inc: 62, exp: 30, label: 'DEC' },
              ].map(m => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center gap-1">
                    <div className={`w-full rounded-t-[8px] ${m.active ? 'bg-[#242E21]' : 'bg-[#D1FAE5]'}`} style={{ height: `${Math.max(8, m.inc * 0.55)}px` }} />
                    <div className="w-full rounded-b-[8px] bg-[#E5E7EB]" style={{ height: `${Math.max(6, m.exp * 0.35)}px` }} />
                  </div>
                  <span className={`text-[9px] font-medium ${m.active ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>{m.label}</span>
                </div>
              ))}
            </div>
            {/* tooltip like May 2025 */}
            <div className="hidden lg:block absolute left-[46%] bottom-[36%] bg-white border border-[#E7ECE8] rounded-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-3 min-w-[130px]">
              <p className="text-[11px] font-semibold text-[#111827]">May, 2025</p>
              <p className="text-[11px] mt-1 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#242E21]" /> Income <span className="ml-auto font-semibold">₹52k</span></p>
              <p className="text-[11px] flex items-center gap-1.5 text-[#6B7280]"><span className="w-2 h-2 rounded-full bg-[#E5E7EB] border border-white" /> Expense <span className="ml-auto">₹6.9k</span></p>
            </div>
          </div>
        </div>

        {/* MAIN TABLE + SALES TRACKING — mirroring Track Order Status + Sales Tracking */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-[#E7ECE8] rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
          <div className="px-5 py-4 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#111827] flex items-center gap-1.5">Today's Schedule <InfoDot /></h3>
            <div className="flex items-center gap-1.5">
              <button className="w-7 h-7 rounded-full border border-[#E7ECE8] flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB]"><Search size={12} /></button>
              <button className="w-7 h-7 rounded-full border border-[#E7ECE8] flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB]"><SlidersHorizontal size={12} /></button>
              <button className="w-7 h-7 rounded-full border border-[#E7ECE8] flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB]"><Sparkles size={12} /></button>
            </div>
          </div>
          {/* Tabs like All Orders / Pending / Completed / Cancelled */}
          <div className="px-5">
            <div className="flex items-center gap-1 p-1 rounded-full bg-[#F3F4F6] border border-[#E7ECE8] w-fit text-[12px] font-medium">
              {[
                { k: 'All', c: 4 },
                { k: 'Confirmed', c: 2 },
                { k: 'Pending', c: 1 },
                { k: 'Completed', c: 1 },
              ].map(t => (
                <button key={t.k} onClick={() => setScheduleTab(t.k as any)}
                  className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 ${scheduleTab===t.k ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:text-[#111827]'}`}>
                  {t.k} <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${scheduleTab===t.k ? 'bg-white text-[#111827]' : 'bg-white border border-[#E7ECE8] text-[#6B7280]'}`}>{t.c}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 border-t border-[#F3F4F6] overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-semibold tracking-[0.06em] text-[#9CA3AF] border-b border-[#F3F4F6]">
                  <th className="px-4 py-2.5 font-semibold"><input type="checkbox" className="rounded border-[#E7ECE8]" /></th>
                  <th className="px-2 py-2.5 font-semibold">Time</th>
                  <th className="px-2 py-2.5 font-semibold">Patient</th>
                  <th className="px-2 py-2.5 font-semibold">Type</th>
                  <th className="px-2 py-2.5 font-semibold">Date</th>
                  <th className="px-2 py-2.5 font-semibold">Amount</th>
                  <th className="px-2 py-2.5 font-semibold">Status</th>
                  <th className="px-2 py-2.5">:</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9FAFB]">
                {[
                  { time: '5:00 PM', name: 'Divya Prasad', type: 'Individual', avatar: 'DP', img: 32, date: 'Today', amount: '₹1,500', status: 'Paid' },
                  { time: '6:30 PM', name: 'Vikram Shetty', type: 'Initial Consultation', avatar: 'VS', img: 12, date: 'Today', amount: '₹2,000', status: 'Paid' },
                  { time: '8:00 PM', name: 'Arjun Nair', type: 'Individual', avatar: 'AN', img: 15, date: 'Today', amount: '₹1,500', status: 'Awaiting payment' },
                  { time: 'Wed 10:00', name: 'Sneha Kulkarni', type: 'Follow-up', avatar: 'SK', img: 26, date: '28 Aug', amount: '₹1,500', status: 'Pending' },
                ].filter(r => scheduleTab==='All' || (scheduleTab==='Confirmed' && r.status==='Paid') || (scheduleTab==='Pending' && r.status!=='Paid') || (scheduleTab==='Completed' && r.status==='Paid')).map(r => (
                  <tr key={r.time} className="hover:bg-[#FCFDFB]">
                    <td className="px-4 py-3"><input type="checkbox" defaultChecked={r.name==='Vikram Shetty'} className="rounded border-[#E7ECE8] accent-[#111827]" /></td>
                    <td className="px-2 py-3 text-[12px] font-medium text-[#111827] whitespace-nowrap">{r.time}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#F4FAF1] border border-[#E7ECE8] flex items-center justify-center text-[10px] font-semibold text-[#242E21]">{r.avatar}</div>
                        <span className="text-[12px] font-medium text-[#111827] whitespace-nowrap">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-[11px] text-[#6B7280] whitespace-nowrap">{r.type}</td>
                    <td className="px-2 py-3 text-[11px] text-[#6B7280] whitespace-nowrap">{r.date}</td>
                    <td className="px-2 py-3 text-[11px] font-medium text-[#111827] whitespace-nowrap">{r.amount}</td>
                    <td className="px-2 py-3 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                    <td className="px-2 py-3 text-[#9CA3AF]">:</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-[#F9FAFB] border-t border-[#F3F4F6] flex items-center justify-between text-[11px]">
            <span className="text-[#6B7280]">Next availability · Wed 10:00–13:00 · No conflicts</span>
            <a href="/app/calendar" className="font-medium text-[#111827] flex items-center gap-1">Open calendar <ArrowUpRight size={11} /></a>
          </div>
        </div>

        {/* Sales Tracking clone — Booking Activity */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#E7ECE8] rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col">
          <h3 className="text-[13px] font-semibold text-[#111827] flex items-center gap-1.5">Booking Activity <InfoDot /></h3>
          <p className="text-[28px] font-bold tracking-tight text-[#111827] mt-3">12</p>
          <p className="text-[11px] text-[#9CA3AF]">Total bookings this month.</p>
          <div className="mt-3 h-3 rounded-full overflow-hidden flex border border-[#F3F4F6]">
            <div className="h-full bg-[#242E21]" style={{ width: '62.89%' }} />
            <div className="h-full bg-[#88D95F]" style={{ width: '24.74%' }} />
            <div className="h-full bg-[#D1FAE5]" style={{ width: '12.37%' }} />
          </div>
          <div className="mt-1.5 flex text-[10px] font-medium text-[#6B7280]">
            <span style={{ width: '62.89%' }}>62.89%</span>
            <span style={{ width: '24.74%' }} className="text-center">24.74%</span>
            <span style={{ width: '12.37%' }} className="text-right">12.37%</span>
          </div>
          <div className="mt-5 space-y-3">
            {[
              { dot: '#242E21', label: 'Confirmed', value: '₹44,100', trend: '15.6%', up: true },
              { dot: '#88D95F', label: 'Pending', value: '₹4,500', trend: '6.4%', up: false },
              { dot: '#D1FAE5', label: 'Available', value: '6 hrs', trend: '3.8%', up: true },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between rounded-[12px] border border-[#F3F4F6] bg-[#F9FAFB] px-3 py-2.5">
                <span className="flex items-center gap-2 text-[12px] font-medium text-[#111827]"><span className="w-2 h-2 rounded-full" style={{ background: r.dot }} /> {r.label}</span>
                <span className="text-[12px] font-semibold text-[#111827]">{r.value}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border ${r.up ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'}`}>
                  {r.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {r.trend} <span className="hidden sm:inline font-normal text-[#6B7280]">vs last month</span>
                </span>
              </div>
            ))}
          </div>
          <a href="/app/bookings" className="mt-4 text-[12px] font-medium text-[#111827]">View bookings →</a>
        </div>

        {/* ACTION CENTER — styled as premium card */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#E7ECE8] rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
          <div className="px-5 py-4 flex items-center justify-between border-b border-[#F3F4F6]">
            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.08em] text-[#111827] flex items-center gap-1.5">ACTION CENTER <InfoDot /></h3>
              <p className="text-[11px] text-[#9CA3AF]">4 things need your attention</p>
            </div>
            <a href="/app/follow-ups" className="text-[11px] font-medium text-[#111827]">View all →</a>
          </div>
          <div className="p-3 space-y-2.5 flex-1">
            {[
              { k: 'FOLLOW-UP DUE', name: 'Rahul Sharma', sub: '7 days ago', cta: 'Follow up', Icon: Clock, tone: 'amber' },
              { k: 'PAYMENT PENDING', name: 'Meera Nair', sub: '₹1,500 · Initial', cta: 'Review', Icon: CreditCard, tone: 'amber' },
              { k: 'BOOKING NOT CONFIRMED', name: 'Sneha Kulkarni', sub: 'Fri · 3:00 PM', cta: 'Nudge', Icon: AlertTriangle, tone: 'neutral' },
              { k: 'SESSION NOTE INCOMPLETE', name: 'Vikram Shetty', sub: 'Yesterday', cta: 'Complete', Icon: FileText, tone: 'neutral' },
            ].map(item => (
              <a key={item.k} href="/app/follow-ups" className="flex items-center gap-2.5 p-2.5 rounded-[14px] border border-[#F3F4F6] hover:bg-[#F9FAFB] hover:border-[#E7ECE8] transition bg-white">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${item.tone === 'amber' ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]' : 'bg-white border-[#E7ECE8] text-[#9CA3AF]'}`}><item.Icon size={12} /></div>
                <div className="flex-1 min-w-0"><p className="text-[10px] font-semibold tracking-[0.06em] text-[#9CA3AF]">{item.k}</p><p className="text-[12px] font-semibold leading-none mt-0.5 text-[#111827] truncate">{item.name}</p><p className="text-[11px] text-[#9CA3AF] truncate">{item.sub}</p></div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${item.tone === 'amber' ? 'bg-[#F59E0B] text-white' : 'bg-[#F3F4F6] text-[#111827] border border-[#E7ECE8]'}`}>{item.cta}</span>
              </a>
            ))}
          </div>
        </div>

        {/* PRACTICE HEALTH */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#E7ECE8] rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold tracking-[0.08em] text-[#111827] flex items-center gap-1">PRACTICE HEALTH <InfoDot /></h3>
            <div className="flex gap-1 bg-[#F3F4F6] rounded-full p-1 border border-[#E7ECE8]">
              {(['Sessions','Earnings','Patients'] as const).map(m => (
                <button key={m} onClick={()=>setHealthTab(m)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${healthTab===m?'bg-[#111827] text-white':'text-[#6B7280]'}`}>{m}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { k: 'SESSIONS', v: '32', sub: '+14%' },
              { k: 'EARNINGS', v: '₹48.6k', sub: '+18%' },
              { k: 'NO-SHOW', v: '3.2%', sub: '↓ 5.1%' },
            ].map(c => (
              <div key={c.k} className="rounded-[14px] bg-[#F9FAFB] border border-[#F3F4F6] p-3 text-center">
                <p className="text-[10px] font-semibold tracking-[0.06em] text-[#9CA3AF]">{c.k}</p>
                <p className="text-[16px] font-bold text-[#111827] mt-1">{c.v}</p>
                <p className="text-[11px] text-[#065F46]">{c.sub}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 h-[48px] flex items-end gap-1.5">
            {(healthTab==='Sessions'?[18,22,26,32]: healthTab==='Earnings'?[28000,32000,41000,48600]:[18,21,23,24]).map((v,i)=>{
              const h=(v/(healthTab==='Earnings'?48600: healthTab==='Sessions'?32:24))*100
              return <div key={i} className="flex-1 flex flex-col items-center gap-1"><div className="w-full rounded-t-[8px] bg-[#242E21]" style={{height:`${h}%`, minHeight:'8px'}} /><span className="text-[10px] text-[#9CA3AF]">W{i+1}</span></div>
            })}
          </div>
        </div>

        {/* EARNINGS OVERVIEW compact chart */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#E7ECE8] rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold tracking-[0.08em] text-[#111827] flex items-center gap-1">EARNINGS <InfoDot /></h3>
            <div className="flex gap-1 bg-[#F3F4F6] rounded-full p-1 border border-[#E7ECE8]">
              {(['7d','30d','3m'] as const).map(r=>(
                <button key={r} onClick={()=>setEarningsRange(r)} className={`px-2 py-1 rounded-full text-[10px] font-medium ${earningsRange===r?'bg-[#111827] text-white':'text-[#6B7280]'}`}>{r}</button>
              ))}
            </div>
          </div>
          <p className="text-[18px] font-bold text-[#111827] mt-3">₹48,600 <span className="text-[11px] font-semibold text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] px-1.5 py-0.5 rounded-full">+18%</span></p>
          <div className="mt-3 h-[48px] flex items-end gap-1">
            {(earningsRange==='7d'?[3200,5400,4800,6000,4200,3800,6000]: earningsRange==='30d'?[8200,9600,7400,11200,9800,12600,10800,13600]:[28000,32000,48600]).map((v,i)=>(
              <div key={i} className="flex-1 bg-[#242E21] rounded-t-[6px]" style={{height:`${Math.max(12,(v/13600)*100)}%`}} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-[10px] bg-[#ECFDF5] border border-[#A7F3D0] p-2 text-center"><p className="font-bold text-[#065F46]">₹44,100</p><p className="text-[#6B7280] text-[10px]">Paid · 29</p></div>
            <div className="rounded-[10px] bg-[#FFFBEB] border border-[#FDE68A] p-2 text-center"><p className="font-bold text-[#92400E]">₹4,500</p><p className="text-[#6B7280] text-[10px]">Pending · 3</p></div>
            <div className="rounded-[10px] bg-white border border-[#E7ECE8] p-2 text-center"><p className="font-bold">₹0</p><p className="text-[#9CA3AF] text-[10px]">Refunded</p></div>
          </div>
        </div>

        {/* PATIENT CONTINUITY */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#E7ECE8] rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between"><h3 className="text-[11px] font-semibold tracking-[0.08em] text-[#111827] flex items-center gap-1">PATIENT CONTINUITY <InfoDot /></h3><a href="/app/patients" className="text-[11px] font-medium text-[#111827]">View all →</a></div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { v:'24', l:'ACTIVE' },
              { v:'16', l:'UPCOMING' },
              { v:'5', l:'FOLLOW-UPS' },
              { v:'3', l:'NO FUTURE', alert:true },
            ].map(m=>(
              <div key={m.l} className={`rounded-[12px] border p-2 text-center ${m.alert?'bg-[#FFFBEB] border-[#FDE68A]':'bg-[#F9FAFB] border-[#F3F4F6]'}`}>
                <p className={`text-[16px] font-bold leading-none ${m.alert?'text-[#92400E]':'text-[#111827]'}`}>{m.v}</p>
                <p className="text-[8px] font-semibold tracking-[0.04em] text-[#9CA3AF] mt-1 leading-none">{m.l}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {[
              { name:'Rahul Sharma', img:12, sub:'7 days ago · No upcoming' },
              { name:'Meera Nair', img:14, sub:'4 days ago · Next Sep 2' },
            ].map(p=>(
              <div key={p.name} className="flex items-center gap-2.5 p-2.5 rounded-[14px] border border-[#F3F4F6] hover:bg-[#F9FAFB]">
                <img src={`https://i.pravatar.cc/100?img=${p.img}`} alt="" className="w-7 h-7 rounded-full" />
                <div className="flex-1 min-w-0"><p className="text-[12px] font-medium leading-none text-[#111827]">{p.name}</p><p className="text-[11px] text-[#9CA3AF] truncate">{p.sub}</p></div>
                <span className="px-3 py-1 rounded-full bg-[#111827] text-white text-[11px] font-medium">Review</span>
              </div>
            ))}
          </div>
        </div>

        {/* AVAILABILITY */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#E7ECE8] rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-[11px] font-semibold tracking-[0.08em] text-[#111827] flex items-center gap-1">YOUR AVAILABILITY <InfoDot /></h3>
          <p className="text-[18px] font-bold text-[#111827] mt-2">18h <span className="text-[11px] font-normal text-[#9CA3AF]">this week · 12 booked · 6 available</span></p>
          <div className="mt-3 space-y-2">
            {[
              { day: 'Mon', hours: 8, booked: 6 },
              { day: 'Tue', hours: 9, booked: 7 },
              { day: 'Wed', hours: 5, booked: 3 },
              { day: 'Thu', hours: 7, booked: 6 },
              { day: 'Fri', hours: 3, booked: 1 },
            ].map(d => (
              <div key={d.day} className="flex items-center gap-2">
                <span className="w-8 text-[11px] font-medium text-[#111827]">{d.day}</span>
                <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden border border-[#F3F4F6]">
                  <div className="h-full bg-[#242E21] rounded-full" style={{width: `${(d.booked/d.hours)*100}%`}} />
                </div>
                <span className="text-[10px] text-[#9CA3AF] w-8 text-right">{d.hours}h</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2.5 rounded-[12px] bg-[#FFFBEB] border border-[#FDE68A] text-[11px] text-[#92400E] flex items-center gap-2">
            <AlertTriangle size={12} /> Thursday is almost full
          </div>
        </div>

        {/* LUMID BETWEEN SESSIONS */}
        <div className="col-span-12 lg:col-span-4 bg-[#F9FAFB] border border-[#E7ECE8] rounded-[20px] p-5">
          <h3 className="text-[11px] font-semibold tracking-[0.08em] text-[#111827] flex items-center gap-1.5"><Users size={12} /> LUMID BETWEEN SESSIONS <InfoDot /></h3>
          <p className="text-[11px] text-[#6B7280] mt-1">Stay connected between sessions.</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 bg-white border border-[#E7ECE8] rounded-full px-3 py-2 text-[12px] shadow-sm"><CheckCircle2 size={12} className="text-[#10B981]" /> 8 patients completed a check-in</div>
            <div className="flex items-center gap-2 bg-white border border-[#E7ECE8] rounded-full px-3 py-2 text-[12px] shadow-sm"><BarChart3 size={12} className="text-[#111827]" /> 3 shared reflections</div>
          </div>
          <a href="/app/insights" className="mt-4 inline-flex w-full justify-center py-2 rounded-full bg-[#111827] text-white text-[12px] font-medium hover:bg-black">Review patient activity →</a>
        </div>

        {/* LUMID AI INSIGHTS — full width pill card */}
        <div className="col-span-12 bg-white border border-[#E7ECE8] rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#111827] flex items-center justify-center"><Brain size={13} className="text-white" /></div>
            <h3 className="text-[11px] font-semibold tracking-[0.08em] text-[#111827]">LUMID AI INSIGHTS</h3>
            <span className="text-[11px] text-[#9CA3AF]">Your practice at a glance</span>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: TrendingUp, text: 'Sessions are up 14% vs last month.', href: '/app/patients' },
              { icon: AlertCircle, text: '3 patients have no upcoming booking.', href: '/app/bookings' },
              { icon: CreditCard, text: '₹4,500 in payments are still pending.', href: '/app/calendar' },
              { icon: Calendar, text: 'Thursday is your busiest day this week.', href: '/app/calendar' },
            ].map((insight, i) => (
              <div key={i} className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-[14px] p-3 flex flex-col">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-white border border-[#E7ECE8] flex items-center justify-center shrink-0"><insight.icon size={12} className="text-[#111827]" /></div>
                  <p className="text-[12px] text-[#111827] leading-tight">{insight.text}</p>
                </div>
                <a href={insight.href} className="mt-3 text-[11px] font-medium text-[#111827]">Review →</a>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT ACTIVITY + QUICK ACTIONS */}
        <div className="col-span-12 lg:col-span-6 bg-white border border-[#E7ECE8] rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-[11px] font-semibold tracking-[0.08em] text-[#111827] flex items-center gap-1">RECENT ACTIVITY <InfoDot /></h3>
          <div className="mt-3 space-y-3">
            {[
              { time: '2 min ago', text: 'New booking from Rahul Sharma', icon: CalendarPlus },
              { time: '18 min ago', text: 'Payment received · ₹1,500', icon: CreditCard },
              { time: '1 hr ago', text: 'Vikram completed his session', icon: CheckCircle2 },
              { time: 'Yesterday', text: 'New patient · Sneha Kulkarni', icon: UserPlus },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#F9FAFB] border border-[#E7ECE8] flex items-center justify-center shrink-0 mt-0.5"><a.icon size={12} className="text-[#111827]" /></div>
                <div className="flex-1 min-w-0"><p className="text-[12px] text-[#111827]">{a.text}</p><p className="text-[10px] text-[#9CA3AF] mt-0.5">{a.time}</p></div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 bg-white border border-[#E7ECE8] rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-[11px] font-semibold tracking-[0.08em] text-[#111827] flex items-center gap-1">QUICK ACTIONS <InfoDot /></h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: 'New availability', icon: Plus, href: '/app/calendar' },
              { label: 'Add patient', icon: UserPlus, href: '/app/patients' },
              { label: 'Create booking', icon: CalendarPlus, href: '/app/bookings' },
              { label: 'View calendar', icon: Calendar, href: '/app/calendar' },
              { label: 'View earnings', icon: TrendingUp, href: '/app/earnings' },
              { label: 'Open booking page', icon: Eye, href: '/app/your-page' },
            ].map((action, i) => (
              <a key={i} href={action.href} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#F9FAFB] border border-[#E7ECE8] text-[12px] font-medium text-[#111827] hover:bg-white hover:border-[#111827] transition">
                <action.icon size={12} />{action.label}
              </a>
            ))}
          </div>
          <div className="mt-4 rounded-[14px] border border-[#E7ECE8] bg-[#F9FAFB] p-3">
            <p className="text-[11px] font-semibold text-[#111827]">Your booking page</p>
            <p className="text-[12px] font-medium text-[#111827] mt-1">anitha.lumid.ai</p>
            <div className="mt-2 flex gap-2">
              <button onClick={copy} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111827] text-white text-[11px] font-medium">{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied!' : 'Copy link'}</button>
              <a href="/app/your-page" className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E7ECE8] text-[11px] font-medium text-[#111827]"><Eye size={12} />Open</a>
              <button className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E7ECE8] text-[11px] font-medium text-[#111827]"><Share2 size={12} />Share</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
