import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, SlidersHorizontal, ChevronRight, Clock, Users } from '../lib/icons'
import { patients } from '../lib/data'

export default function PatientsPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'Active', 'Follow-up due', 'Lapsed', 'New']

  const filtered = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(query.toLowerCase()) || p.email.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = filter === 'All' || (filter === 'Active' && p.status === 'active') || (filter === 'Lapsed' && p.status === 'lapsed') || (filter === 'New' && p.status === 'new') || (filter === 'Follow-up due' && p.status === 'lapsed')
    return matchesSearch && matchesFilter
  })

  return (
    <div className="px-4 lg:px-6 py-6 pb-20 lg:pb-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[26px] font-semibold tracking-tight flex items-center gap-2"><Users size={20} className="text-[var(--green-700)]" /> Patients</h1>
          <p className="text-[12px] text-[var(--stone)] mt-1">{filtered.length} patients • No mental health scores — only meaningful context</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 lg:w-[280px] flex items-center gap-2 bg-white border border-[var(--hairline)] rounded-full px-3.5 py-2.5">
            <Search size={14} className="text-[var(--stone)]" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, email, phone" className="bg-transparent outline-none text-[13px] w-full" />
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-[var(--hairline)] flex items-center justify-center"><SlidersHorizontal size={14} /></button>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`shrink-0 px-4 py-1.5 rounded-full text-[12px] font-medium border ${filter === f ? 'bg-[var(--green-700)] text-white border-transparent' : 'bg-white border-[var(--hairline)] text-[var(--slate)]'}`}>{f}</button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block mt-4 bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden">
        <div className="grid grid-cols-[1.4fr_0.6fr_1fr_1fr_0.8fr_80px] gap-4 px-6 py-3 bg-[var(--canvas)] text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">
          <span>PATIENT</span><span>SESSIONS</span><span>LAST / NEXT</span><span>CURRENT FOCUS</span><span>STATUS</span><span></span>
        </div>
        <div className="divide-y divide-[var(--hairline)]">
          {filtered.map(p => (
            <Link key={p.id} to={`/app/patients/${p.id}`} className="grid grid-cols-[1.4fr_0.6fr_1fr_1fr_0.8fr_80px] gap-4 px-6 py-4 items-center hover:bg-[var(--sage-50)]/60 transition">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--green-50)] border border-[var(--green-200)] flex items-center justify-center text-[11px] font-bold text-[var(--green-700)]">{p.avatar}</div>
                <div>
                  <p className="text-[13px] font-semibold leading-none">{p.name}</p>
                  <p className="text-[11px] text-[var(--stone)]">{p.email}</p>
                </div>
              </div>
              <span className="text-[13px] font-semibold">{p.sessions}</span>
              <div className="text-[12px] leading-tight">
                <p className="flex items-center gap-1"><Clock size={12} className="text-[var(--stone)]" /> Last: {p.lastSession}</p>
                <p className="text-[var(--green-700)] font-medium">{p.nextSession ? `Next: ${p.nextSession}` : 'No upcoming session'}</p>
              </div>
              <span className="text-[12px] px-2.5 py-1 rounded-full bg-[var(--sage-50)] border border-[var(--hairline)] w-fit">{p.focus}</span>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border w-fit ${p.status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : p.status === 'lapsed' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>{p.status}</span>
              <span className="flex justify-end"><ChevronRight size={16} className="text-[var(--stone)]" /></span>
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden mt-4 space-y-3">
        {filtered.map(p => (
          <Link key={p.id} to={`/app/patients/${p.id}`} className="bg-white border border-[var(--hairline)] rounded-[16px] p-4 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--green-50)] border border-[var(--green-200)] flex items-center justify-center text-[11px] font-bold text-[var(--green-700)] shrink-0">{p.avatar}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold leading-none">{p.name} <span className="text-[11px] font-normal text-[var(--stone)]">• {p.sessions} sessions</span></p>
              <p className="text-[11px] text-[var(--stone)] mt-1">{p.focus}</p>
              <p className="text-[11px] text-[var(--slate)] mt-1">Last: {p.lastSession} {p.nextSession ? `• Next: ${p.nextSession}` : '• No upcoming'}</p>
            </div>
            <ChevronRight size={16} className="text-[var(--stone)] shrink-0 self-center" />
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-8 text-center py-12 bg-white border border-dashed border-[var(--hairline)] rounded-[16px]">
          <p className="font-serif text-[18px]">No patients found</p>
          <p className="text-[13px] text-[var(--stone)] mt-1">Your first patient will appear here after their first booking.</p>
        </div>
      )}
    </div>
  )
}
