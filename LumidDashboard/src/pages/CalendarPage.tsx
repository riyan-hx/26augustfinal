import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Video, Copy, Check, X, Plus, Calendar, Globe, CheckCircle2, Trash2, Edit3, ExternalLink } from '../lib/icons'
import { Button, Card, Chip } from '@heroui/react'
import { patients } from '../lib/data'
import { SlidingTabs } from '../lib/animated'

type View = 'Week' | 'Day' | 'Month'
type SessionStatus = 'paid' | 'awaiting' | 'cancelled' | 'blocked' | 'free'
type CalEvent = {
  id: string
  patient: string
  initials: string
  type: string
  day: number // 0=Sun 6=Sat
  start: number // hour float 9-19
  duration: number // hours
  status: SessionStatus
  fee?: string
  meeting?: string
}

// Mock week: Sun 24 - Sat 30 Aug 2026, Tue 26 is today
const weekDays = [
  { label: 'SUN', date: 24 },
  { label: 'MON', date: 25 },
  { label: 'TUE', date: 26 },
  { label: 'WED', date: 27 },
  { label: 'THU', date: 28 },
  { label: 'FRI', date: 29 },
  { label: 'SAT', date: 30 },
]
const hours = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM']
const HOUR_PX = 64
const GRID_PX = HOUR_PX * (hours.length - 1)

function formatHour(h: number) {
  const period = h >= 12 ? 'PM' : 'AM'
  let hour12 = Math.floor(h) % 12
  if (hour12 === 0) hour12 = 12
  const mins = h % 1 === 0.5 ? ':30' : ''
  return `${hour12}${mins} ${period}`
}

const initialEvents: CalEvent[] = [
  { id: '1', patient: 'Divya Prasad', initials: 'DP', type: 'Individual Session', day: 2, start: 17, duration: 1, status: 'paid', fee: '₹1,500', meeting: 'meet.google.com/abc-defg' },
  { id: '2', patient: 'Vikram Shetty', initials: 'VS', type: 'First Consultation', day: 2, start: 18.5, duration: 1, status: 'paid', fee: '₹2,000' },
  { id: '3', patient: 'Arjun Nair', initials: 'AN', type: 'Follow-up', day: 2, start: 20, duration: 1, status: 'awaiting', fee: '₹1,200' },
  { id: '4', patient: 'Lakshmi Iyer', initials: 'LI', type: 'Individual Session', day: 1, start: 10, duration: 1, status: 'paid', fee: '₹1,500' },
  { id: '5', patient: 'Sneha Kulkarni', initials: 'SK', type: 'Individual Session', day: 5, start: 11, duration: 1, status: 'awaiting', fee: '₹1,500' },
  { id: '6', patient: 'Blocked', initials: '—', type: 'Personal', day: 3, start: 10, duration: 2, status: 'blocked' },
  { id: '7', patient: 'Free time', initials: '', type: 'Available', day: 3, start: 14, duration: 2, status: 'free' },
  { id: '8', patient: 'Ritu Bansal', initials: 'RB', type: 'Individual Session', day: 4, start: 15, duration: 1, status: 'paid', fee: '₹1,500' },
]

function MiniCalendar({ selected, onSelect }: { selected: number; onSelect: (d: number) => void }) {
  // August 2026 — 1st is Sat, 31 days
  const daysInMonth = 31
  const startOffset = 6 // Sat
  const totalCells = 42
  const cells: (number | null)[] = Array(startOffset).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1)).concat(Array(totalCells - startOffset - daysInMonth).fill(null))
  return (
    <Card className="p-4 gap-0">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">August, 2026</p>
        <div className="flex gap-1">
          <Button isIconOnly aria-label="Previous month" variant="ghost" size="sm"><ChevronLeft /></Button>
          <Button isIconOnly aria-label="Next month" variant="ghost" size="sm"><ChevronRight /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-[10px] font-medium text-muted mt-3 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1 mt-1">
        {cells.slice(0, 35).map((d, i) => {
          if (!d) return <span key={i} />
          const isToday = d === 26
          const isSelected = d === selected
          return (
            <button key={i} onClick={() => onSelect(d)} className={`w-7 h-7 mx-auto rounded-full text-xs flex items-center justify-center transition ${isToday ? 'bg-[var(--color-neutral-strong)] text-white font-semibold' : isSelected ? 'bg-[var(--color-neutral-strong)]/15 text-[var(--color-neutral-strong)] border border-[var(--color-neutral-strong)]/30' : 'hover:bg-surface-secondary text-muted'}`}>{d}</button>
          )
        })}
      </div>
    </Card>
  )
}

export default function CalendarPage() {
  const [view, setView] = useState<View>('Week')
  const [selectedId, setSelectedId] = useState<string>('1')
  const [panelOpen, setPanelOpen] = useState(true)
  function selectEvent(id: string) { setSelectedId(id); setPanelOpen(true) }
  const [selectedDate, setSelectedDate] = useState(26)
  const [showCreate, setShowCreate] = useState(false)
  const [showAvailability, setShowAvailability] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [filters, setFilters] = useState({ sessions: true, availability: true, blocked: true, personal: true })
  const [dragId, setDragId] = useState<string | null>(null)
  const [events, setEvents] = useState(initialEvents)

  const selected = useMemo(() => events.find(e => e.id === selectedId) || events[0], [selectedId, events])
  const selectedDayInfo = selected ? weekDays[selected.day] : undefined
  const selectedPatientRecord = selected ? patients.find(p => p.name === selected.patient) : undefined
  const isRealSession = selected ? !['blocked', 'free'].includes(selected.status) : false

  const filteredEvents = events.filter(e => {
    if (e.status === 'blocked' && !filters.blocked) return false
    if (e.status === 'free' && !filters.availability) return false
    if (e.status === 'paid' || e.status === 'awaiting' || e.status === 'cancelled') return filters.sessions
    return true
  })

  function handleDragEnd(targetDay: number) {
    if (!dragId) return
    setEvents(prev => prev.map(ev => ev.id === dragId ? { ...ev, day: targetDay } : ev))
    setToast('Session rescheduled.')
    setDragId(null)
    setTimeout(() => setToast(null), 2000)
  }

  function copyLink(text: string) {
    const t = text || 'lumid.in/dr-anitha'
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(t).then(() => {
          setToast('Link copied'); setTimeout(() => setToast(null), 1500)
        }).catch(() => {
          setToast('Link copied'); setTimeout(() => setToast(null), 1500)
        })
      } else {
        setToast('Link copied'); setTimeout(() => setToast(null), 1500)
      }
    } catch {
      setToast('Link copied'); setTimeout(() => setToast(null), 1500)
    }
  }

  function handleToday() {
    setSelectedDate(26)
    setSelectedId('1')
    setView('Week')
  }

  return (
    <div className="px-4 lg:px-6 py-5 pb-24 lg:pb-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="type-display-md text-[var(--ink)]">Calendar</h1>
          <p className="type-body text-[var(--stone)] mt-1">Manage your sessions, availability, and appointments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-surface border border-border rounded-full p-1">
            <Button size="sm" variant="secondary" className="rounded-full" onPress={handleToday}>Today</Button>
            <Button isIconOnly aria-label="Previous week" variant="ghost" size="sm" onPress={() => setSelectedDate(d => Math.max(24, d - 1))}><ChevronLeft /></Button>
            <Button isIconOnly aria-label="Next week" variant="ghost" size="sm" onPress={() => setSelectedDate(d => Math.min(30, d + 1))}><ChevronRight /></Button>
            <span className="text-sm font-medium px-2 hidden sm:inline">August 2026</span>
          </div>
          <SlidingTabs options={['Day', 'Week', 'Month'] as const} active={view} onChange={setView} size="sm" />
          <Button size="sm" onPress={() => setShowCreate(true)}><Plus /> New Session</Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[232px_1fr] gap-4 items-start">
        {/* LEFT SIDEBAR */}
        <div className="hidden lg:block space-y-4 sticky top-[88px]">
          <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} />

          <Card className="p-4 gap-0">
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" onPress={() => setShowCreate(true)}><Plus /> Session</Button>
              <Button size="sm" variant={showAvailability ? 'secondary' : 'outline'} onPress={() => setShowAvailability(v => !v)}><Calendar /> Availability</Button>
            </div>

            <div className="mt-4 pt-4 border-t border-border space-y-2.5">
              {[
                { k: 'sessions', label: 'Sessions', color: 'bg-[var(--color-neutral-strong)]' },
                { k: 'availability', label: 'Availability', color: 'bg-warning' },
                { k: 'blocked', label: 'Blocked time', color: 'bg-muted' },
                { k: 'personal', label: 'Personal', color: 'bg-[var(--badge-violet-fg)]' },
              ].map(f => (
                <label key={f.k} className="flex items-center gap-2.5 text-xs cursor-pointer">
                  <input type="checkbox" checked={(filters as any)[f.k]} onChange={e => setFilters(prev => ({ ...prev, [f.k]: e.target.checked }))} className="w-3.5 h-3.5 rounded border-border accent-[var(--color-neutral-strong)]" />
                  <span className={`w-2 h-2 rounded-full ${f.color}`} /> {f.label}
                </label>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted">Sessions this week</span><span className="font-semibold">8</span></div>
              <div className="flex justify-between"><span className="text-muted">Available hours</span><span className="font-semibold">22h</span></div>
              <div className="flex justify-between"><span className="text-muted">Paid sessions</span><span className="font-semibold text-success">6</span></div>
            </div>
          </Card>

          <Card className="p-4 gap-0">
            <p className="text-xs font-medium text-muted">Your booking page</p>
            <p className="text-sm font-medium text-[var(--color-neutral-strong)] mt-1 flex items-center gap-1"><Globe size={12} /> lumid.in/dr-anitha</p>
            <p className="text-xs text-muted mt-1">Patients view your availability and book.</p>
            <div className="flex gap-2 mt-2.5">
              <Link to="/book" className="flex-1">
                <Button size="sm" variant="secondary" fullWidth><ExternalLink /> Open</Button>
              </Link>
              <Button size="sm" variant="secondary" className="flex-1" onPress={() => copyLink('lumid.in/dr-anitha')}>Copy link</Button>
            </div>
          </Card>
        </div>

        {/* MAIN CALENDAR + detail panel — a real grid column, not an overlay, so it reflows the calendar instead of ever covering it */}
        <div className={`grid grid-cols-1 gap-4 items-start min-w-0 ${selected && panelOpen ? 'xl:grid-cols-[1fr_300px]' : ''}`}>
        <div className="bg-white border border-[var(--hairline)] rounded-[16px] overflow-hidden min-w-0">
          {/* Mobile day picker */}
          <div className="lg:hidden flex items-center gap-2 p-3 border-b border-[var(--hairline)] overflow-x-auto">
            {weekDays.map(d => (
              <button key={d.date} onClick={() => setSelectedDate(d.date)} className={`shrink-0 w-11 py-2 rounded-[10px] border text-center ${d.date === 26 ? 'bg-[var(--green-700)] text-white border-transparent' : d.date === selectedDate ? 'bg-[var(--green-50)] border-[var(--green-700)]/20 text-[var(--green-700)]' : 'bg-white border-[var(--hairline)]'}`}>
                <p className="text-[10px] font-medium opacity-70">{d.label}</p>
                <p className="text-[14px] font-semibold leading-none">{d.date}</p>
              </button>
            ))}
          </div>

          {/* Week header — only for Week view; Day and Month render their own header */}
          {view === 'Week' && (
            <div className="hidden lg:grid grid-cols-[64px_1fr] border-b border-[var(--hairline)] bg-[var(--surface-warm)]/50">
              <div className="border-r border-[var(--hairline)]" />
              <div className="grid grid-cols-7">
                {weekDays.map(d => {
                  const isToday = d.date === 26
                  return (
                    <div key={d.date} className={`h-[48px] flex flex-col items-center justify-center border-r last:border-r-0 border-[var(--hairline)] ${isToday ? 'bg-[var(--green-50)]' : ''}`}>
                      <span className="text-[10px] font-semibold tracking-[0.08em] text-[var(--stone)]">{d.label}</span>
                      <span className={`text-[13px] font-semibold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[var(--green-700)] text-white' : 'text-[var(--ink)]'}`}>{d.date}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Grid — switch by view */}
          {view === 'Month' ? (
            <div className="p-3">
              <div className="grid grid-cols-7 text-[10px] font-semibold tracking-[0.06em] text-[var(--stone)] text-center py-2">
                {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => <span key={d}>{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-px bg-[var(--hairline)] rounded-[10px] overflow-hidden border border-[var(--hairline)]">
                {Array.from({ length: 42 }).map((_, i) => {
                  const date = i - 5 // offset for Aug 1 Sat
                  const inMonth = date >= 1 && date <= 31
                  const isToday = date === 26
                  // fallback map date to day index via weekDays
                  const colDay = weekDays.findIndex(w => w.date === date)
                  const evs = colDay >= 0 ? filteredEvents.filter(ev => ev.day === colDay) : []
                  return (
                    <div key={i} className={`min-h-[92px] bg-white p-1.5 ${!inMonth ? 'bg-[var(--surface-warm)]/40 text-[var(--stone)]' : ''} ${isToday ? 'bg-[var(--green-50)]' : ''}`}>
                      <span className={`text-[11px] w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[var(--green-700)] text-white font-semibold' : 'font-medium'}`}>{inMonth ? date : ''}</span>
                      <div className="mt-1 space-y-1">
                        {evs.slice(0,2).map(ev => (
                          <div key={ev.id} onClick={() => selectEvent(ev.id)} className={`text-[10px] leading-none px-1.5 py-1 rounded-full border truncate cursor-pointer ${ev.status === 'paid' ? 'bg-white border-[var(--hairline)] text-[var(--ink)]' : ev.status === 'awaiting' ? 'bg-[var(--badge-amber-bg)] border-[var(--badge-amber-fg)] text-[var(--badge-amber-fg)]' : 'bg-[var(--color-canvas-parchment)] border-dashed border-[var(--color-hairline)]'}`}>{ev.patient}</div>
                        ))}
                        {evs.length > 2 && <p className="text-[10px] text-[var(--stone)]">+{evs.length-2} more</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : view === 'Day' ? (
            <div className="relative">
              <div className="hidden lg:grid grid-cols-[64px_1fr] border-b border-[var(--hairline)] bg-[var(--surface-warm)]/50">
                <div className="border-r border-[var(--hairline)]" />
                <div className="h-[48px] flex items-center justify-center">
                  <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--stone)]">{weekDays.find(w=>w.date===selectedDate)?.label || 'TUE'} {selectedDate} AUG</span>
                  <span className="ml-2 w-6 h-6 rounded-full bg-[var(--green-700)] text-white text-[11px] font-semibold flex items-center justify-center">{selectedDate}</span>
                </div>
              </div>
              <div className="grid grid-cols-[56px_1fr] lg:grid-cols-[64px_1fr] max-h-[560px] overflow-auto">
                <div className="border-r border-[var(--hairline)] bg-[var(--color-canvas-parchment)]">
                  {hours.map(h => <div key={h} style={{ height: HOUR_PX }} className="border-b border-[var(--hairline)] flex items-start justify-end pr-2 pt-1"><span className="text-[11px] text-[var(--stone)]">{h}</span></div>)}
                </div>
                <div className="relative bg-[var(--green-50)]/20" style={{ height: GRID_PX }}>
                  <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateRows: `repeat(${hours.length - 1}, ${HOUR_PX}px)` }}>{Array.from({ length: hours.length - 1 }).map((__, i) => <div key={i} className="border-b border-[var(--hairline)]/60" />)}</div>
                  {filteredEvents.filter(ev => ev.day === weekDays.findIndex(w=>w.date===selectedDate)).map(ev => (
                    <button key={ev.id} onClick={() => selectEvent(ev.id)} className={`absolute left-2 right-2 rounded-[10px] px-3 py-2.5 text-left border bg-white border-[var(--hairline)] ${selectedId===ev.id?'ring-2 ring-[var(--green-700)]/20 border-[var(--green-700)]':''}`} style={{ top: `${(ev.start - 9) * HOUR_PX + 6}px`, height: `${ev.duration * HOUR_PX - 8}px`}}>
                      <div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-[var(--sage-50)] border flex items-center justify-center text-[10px] font-semibold text-[var(--green-700)]">{ev.initials}</span><p className="text-[13px] font-semibold truncate">{ev.patient}</p>{!['blocked','free'].includes(ev.status) && <span className={`ml-auto shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${ev.status==='paid'?'bg-[var(--badge-green-bg)] border-transparent text-[var(--badge-green-fg)]':'bg-[var(--badge-amber-bg)] border-[var(--badge-amber-fg)] text-[var(--badge-amber-fg)]'}`}>{ev.status==='paid' && <Check size={10} />}{ev.status==='paid'?'Paid':'Awaiting'}</span>}</div>
                      <p className="text-[11px] text-[var(--stone)] mt-1 truncate">{formatHour(ev.start)} – {formatHour(ev.start + ev.duration)} · {ev.type}</p>
                    </button>
                  ))}
                  {filteredEvents.filter(ev => ev.day === weekDays.findIndex(w=>w.date===selectedDate)).length===0 && <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6"><Calendar size={18} className="text-[var(--stone)]"/><p className="text-[13px] font-medium mt-2">No sessions</p><p className="text-[11px] text-[var(--stone)]">Your schedule is clear for this day.</p></div>}
                </div>
              </div>
            </div>
          ) : (
          <div className="relative">
            {/* Now indicator — 5:30 PM today */}
            <div className="hidden lg:block absolute left-[64px] right-0 h-px bg-[var(--badge-rose-fg)] z-10" style={{ top: `${(17.5 - 9) * HOUR_PX + 48}px` }}>
              <span className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-[var(--badge-rose-fg)]" />
              <span className="absolute -top-2 right-2 text-[10px] font-medium bg-[var(--badge-rose-fg)] text-white px-1.5 py-0.5 rounded-full">Now 5:30 PM</span>
            </div>

            <div className="grid grid-cols-[56px_1fr] lg:grid-cols-[64px_1fr] max-h-[560px] overflow-auto">
              {/* Time column */}
              <div className="border-r border-[var(--hairline)] bg-[var(--color-canvas-parchment)]">
                {hours.map(h => (
                  <div key={h} style={{ height: HOUR_PX }} className="border-b border-[var(--hairline)] flex items-start justify-end pr-2 pt-1">
                    <span className="text-[11px] text-[var(--stone)]">{h}</span>
                  </div>
                ))}
              </div>

              {/* Desktop week grid */}
              <div className="hidden lg:block">
                <div className="grid grid-cols-7 relative">
                  {weekDays.map((_, colIdx) => (
                    <div key={colIdx} onDragOver={e => e.preventDefault()} onDrop={() => handleDragEnd(colIdx)} className={`relative border-r last:border-r-0 border-[var(--hairline)] ${colIdx === 2 ? 'bg-[var(--green-50)]/35' : ''}`} style={{ height: GRID_PX }}>
                      <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateRows: `repeat(${hours.length - 1}, ${HOUR_PX}px)` }}>
                        {Array.from({ length: hours.length - 1 }).map((__, i) => <div key={i} className="border-b border-[var(--hairline)]/60" />)}
                      </div>
                      {/* unavailable diagonal */}
                      {colIdx === 5 && (
                        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, var(--color-ink-muted-48) 0 1px, transparent 1px 8px)' }} />
                      )}
                      {filteredEvents.filter(ev => ev.day === colIdx).map(ev => (
                        <button
                          key={ev.id}
                          draggable
                          onDragStart={() => setDragId(ev.id)}
                          onDragEnd={() => setDragId(null)}
                          onClick={() => selectEvent(ev.id)}
                          title={`${ev.patient} · ${formatHour(ev.start)}–${formatHour(ev.start + ev.duration)} · ${ev.type}`}
                          className={`absolute left-1 right-1 overflow-hidden rounded-[8px] pl-2.5 pr-1.5 py-1.5 text-left border transition group ${ev.status === 'blocked' ? 'bg-[var(--color-canvas-parchment)] border-dashed border-[var(--hairline-strong)]' : ev.status === 'free' ? 'bg-[var(--badge-amber-bg)] border-dashed border-[var(--badge-amber-fg)]/40' : ev.status === 'awaiting' ? 'bg-[var(--badge-amber-bg)] border-[var(--badge-amber-fg)] hover:border-[var(--badge-amber-fg)]' : ev.status === 'cancelled' ? 'bg-white border-[var(--hairline)] opacity-60 line-through' : 'bg-white border-[var(--hairline)] hover:border-[var(--green-700)]/30'} ${selectedId === ev.id ? 'ring-2 ring-[var(--green-700)]/20 border-[var(--green-700)]' : ''} ${dragId === ev.id ? 'opacity-50' : ''}`}
                          style={{ top: `${(ev.start - 9) * HOUR_PX + 6}px`, height: `${ev.duration * HOUR_PX - 8}px`, minHeight: '40px' }}
                        >
                          {!['blocked', 'free'].includes(ev.status) && <span className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full ${ev.status === 'awaiting' ? 'bg-[var(--badge-amber-fg)]' : 'bg-[var(--green-700)]'}`} />}
                          <p className={`text-[12px] font-semibold leading-tight truncate ${ev.status === 'blocked' ? 'text-[var(--stone)]' : 'text-[var(--ink)]'}`}>{ev.patient}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-[10px] text-[var(--stone)] truncate">{formatHour(ev.start)}</p>
                            {ev.status === 'paid' && <CheckCircle2 size={10} className="text-[var(--badge-green-fg)] shrink-0" />}
                            {ev.status === 'awaiting' && <span className="w-1.5 h-1.5 rounded-full bg-[var(--badge-amber-fg)] shrink-0" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile agenda list */}
              <div className="lg:hidden">
                <div className="p-3 space-y-2">
                  {filteredEvents.filter(ev => ev.day === weekDays.findIndex(d => d.date === selectedDate)).length === 0 ? (
                    <div className="py-12 text-center">
                      <Calendar size={20} className="mx-auto text-[var(--stone)]" />
                      <p className="text-[13px] font-medium mt-2">No sessions today</p>
                      <p className="text-[11px] text-[var(--stone)]">Your schedule is clear.</p>
                    </div>
                  ) : (
                    filteredEvents.filter(ev => ev.day === weekDays.findIndex(d => d.date === selectedDate)).map(ev => (
                      <button key={ev.id} onClick={() => selectEvent(ev.id)} className={`w-full text-left rounded-[12px] p-3 border flex gap-3 ${selectedId === ev.id ? 'bg-[var(--green-50)] border-[var(--green-700)]/30' : 'bg-white border-[var(--hairline)]'}`}>
                        <div className="w-8 h-8 rounded-full bg-[var(--green-50)] flex items-center justify-center text-[11px] font-semibold text-[var(--green-700)] shrink-0">{ev.initials}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold">{ev.patient} <span className="text-[11px] font-normal text-[var(--stone)]">{formatHour(ev.start)}</span></p>
                          <p className="text-[11px] text-[var(--stone)]">{ev.type} • {ev.fee || ''} {ev.status === 'paid' ? '• Paid' : ev.status === 'awaiting' ? '• Awaiting' : ''}</p>
                        </div>
                        <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${ev.status === 'paid' ? 'bg-[var(--badge-green-fg)]' : ev.status === 'awaiting' ? 'bg-[var(--badge-amber-fg)]' : 'bg-[var(--stone)]'}`} />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Availability panel */}
          {showAvailability && (
            <div className="border-t border-[var(--hairline)] bg-[var(--surface-warm)]/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold">Weekly availability</p>
                <button onClick={() => setShowAvailability(false)} className="w-6 h-6 rounded-full hover:bg-white border border-transparent hover:border-[var(--hairline)] flex items-center justify-center"><X size={12} /></button>
              </div>
              <div className="mt-3 grid sm:grid-cols-2 gap-2 text-[12px]">
                {[
                  ['Monday', '9:00 AM — 5:00 PM'],
                  ['Tuesday', '9:00 AM — 5:00 PM'],
                  ['Wednesday', 'Unavailable'],
                  ['Thursday', '10:00 AM — 7:00 PM'],
                  ['Friday', '9:00 AM — 4:00 PM'],
                  ['Saturday', 'Optional'],
                ].map(([d, t]) => (
                  <div key={d} className="flex justify-between py-2 px-3 rounded-[8px] bg-white border border-[var(--hairline)]">
                    <span className="font-medium">{d}</span><span className="text-[var(--stone)]">{t}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--stone)]">
                <span className="px-2.5 py-1 rounded-full bg-white border border-[var(--hairline)]">Buffer 15 min</span>
                <span className="px-2.5 py-1 rounded-full bg-white border border-[var(--hairline)]">Notice 12 hours</span>
                <span className="px-2.5 py-1 rounded-full bg-white border border-[var(--hairline)]">Advance 30 days</span>
                <Button size="sm" variant="secondary" className="ml-auto">+ Add availability</Button>
              </div>
              <p className="text-[11px] text-[var(--stone)] mt-2">Powers your public page <span className="font-medium text-[var(--green-700)]">lumid.in/dr-anitha</span></p>
            </div>
          )}
        </div>

        {/* Detail panel — a grid column that only exists when open, so it reflows the calendar next to it instead of ever covering it */}
        {selected && panelOpen && (
        <Card className="hidden xl:block sticky top-[96px] max-h-[calc(100vh-116px)] overflow-y-auto p-0 gap-0">
          <div className="p-4 border-b border-border flex items-start justify-between gap-3 sticky top-0 bg-surface">
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--color-neutral-strong)]/10 border border-border flex items-center justify-center text-xs font-semibold text-[var(--color-neutral-strong)]">{selected.initials}</div>
              <div>
                <p className="text-sm font-semibold leading-none">{selected.patient}</p>
                <p className="text-xs text-muted mt-1">{selected.type}</p>
              </div>
            </div>
            <Button isIconOnly aria-label="Close" variant="ghost" size="sm" onPress={() => setPanelOpen(false)}><X /></Button>
          </div>
          <div className="p-4 space-y-3 text-xs">
            <div className="flex justify-between"><span className="text-muted">Date</span><span className="font-medium">{selectedDayInfo ? `${selectedDayInfo.label[0]}${selectedDayInfo.label.slice(1).toLowerCase()}, ${selectedDayInfo.date} Aug 2026` : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted">Time</span><span className="font-medium">{formatHour(selected.start)} – {formatHour(selected.start + selected.duration)} • {selected.duration * 60} min</span></div>
            {isRealSession ? (
              <>
                <div className="flex justify-between items-center"><span className="text-muted">Payment</span><Chip color={selected.status === 'paid' ? 'success' : 'warning'} variant="soft" size="sm">{selected.fee || '₹1,500'} {selected.status === 'paid' ? '· Paid' : '· Awaiting'}</Chip></div>
                <div className="rounded-lg bg-surface-secondary border border-border p-3">
                  <p className="text-[11px] font-semibold tracking-wide text-muted">MEETING</p>
                  <p className="text-xs font-medium mt-1 flex items-center gap-1.5"><Video size={12} className="text-[var(--color-neutral-strong)]" /> Google Meet</p>
                  <p className="text-xs text-muted truncate mt-1">{selected.meeting || 'meet.google.com/xxx-yyyy-zzz'}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="secondary" className="flex-1">Open meeting</Button>
                    <Button size="sm" variant="secondary" onPress={() => copyLink(selected.meeting || 'meet.google.com/xxx-yyyy-zzz')}><Copy /> Copy</Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="secondary" fullWidth><Edit3 /> Edit</Button>
                  <Button size="sm" variant="danger" fullWidth><Trash2 /> Cancel</Button>
                </div>
                <p className="text-[11px] text-muted">Drag a session on the grid to reschedule it.</p>
              </>
            ) : (
              <p className="text-xs text-muted">{selected.status === 'blocked' ? 'This time is blocked off — no bookings can be made.' : 'This time is open for patients to book.'}</p>
            )}
            {selectedPatientRecord && (
              <div className="rounded-lg border border-border p-3 bg-surface-secondary">
                <p className="text-[11px] font-semibold tracking-wide text-muted">PATIENT CONTEXT</p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted">Last session</span><span>{selectedPatientRecord.lastSession}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Sessions</span><span>{selectedPatientRecord.sessions} total</span></div>
                </div>
                <Link to={`/app/patients/${selectedPatientRecord.id}`} className="mt-2 inline-flex text-xs font-medium text-[var(--color-neutral-strong)]">View patient →</Link>
                <p className="text-[11px] text-muted mt-2">Private notes never shown here.</p>
              </div>
            )}
          </div>
        </Card>
        )}
        </div>
      </div>

      {/* Mobile detail bottom sheet */}
      {selected && (
        <Card className="xl:hidden mt-4 p-4 gap-0">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-neutral-strong)]/10 flex items-center justify-center text-xs font-semibold text-[var(--color-neutral-strong)]">{selected.initials}</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{selected.patient} • {selected.type}</p>
              <p className="text-xs text-muted inline-flex items-center gap-1">Tue 26 Aug • {formatHour(selected.start)} • {selected.fee} • {selected.status === 'paid' && <Check size={11} className="text-[var(--badge-green-fg)]" />}{selected.status === 'paid' ? 'Paid' : 'Awaiting'}</p>
            </div>
            <Button size="sm" variant="secondary">Open</Button>
          </div>
        </Card>
      )}

      {/* FAB mobile */}
      <Button isIconOnly aria-label="New session" className="lg:hidden fixed bottom-20 right-4 size-12 rounded-full" onPress={() => setShowCreate(true)}><Plus size={20} /></Button>

      {/* Create Session Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white w-full sm:max-w-[520px] max-h-[90vh] sm:rounded-[16px] rounded-t-[16px] overflow-hidden animate-[fadeIn_200ms]">
            <div className="px-5 py-4 border-b border-[var(--hairline)] flex items-center justify-between">
              <h3 className="text-[14px] font-semibold">New Session</h3>
              <button onClick={() => setShowCreate(false)} className="w-7 h-7 rounded-full hover:bg-[var(--surface-warm)] flex items-center justify-center"><X size={14} /></button>
            </div>
            <div className="p-5 space-y-4 overflow-auto max-h-[65vh]">
              <label className="block text-[11px] font-semibold text-[var(--stone)]">Patient
                <select className="mt-1 w-full rounded-[10px] border border-[var(--hairline)] px-3 py-2.5 text-[13px] bg-white focus:border-[var(--green-700)] outline-none">
                  <option>Divya Prasad</option><option>Vikram Shetty</option><option>Arjun Nair</option><option>Sneha Kulkarni</option>
                </select>
              </label>
              <label className="block text-[11px] font-semibold text-[var(--stone)]">Session type
                <select className="mt-1 w-full rounded-[10px] border border-[var(--hairline)] px-3 py-2.5 text-[13px] bg-white">
                  <option>Individual Session — 60 min — ₹1,500</option><option>First Consultation — 60 min — ₹2,000</option><option>Follow-up — 30 min — ₹1,200</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[11px] font-semibold text-[var(--stone)]">Date<input type="date" defaultValue="2026-08-27" className="mt-1 w-full rounded-[10px] border border-[var(--hairline)] px-3 py-2.5 text-[13px]" /></label>
                <label className="block text-[11px] font-semibold text-[var(--stone)]">Time
                  <div className="mt-1 flex gap-2">
                    <select className="flex-1 rounded-[10px] border border-[var(--hairline)] px-2 py-2.5 text-[13px]"><option>5:00 PM</option><option>6:00 PM</option></select>
                    <select className="flex-1 rounded-[10px] border border-[var(--hairline)] px-2 py-2.5 text-[13px]"><option>6:00 PM</option><option>7:00 PM</option></select>
                  </div>
                </label>
              </div>
              <label className="block text-[11px] font-semibold text-[var(--stone)]">Fee<input placeholder="₹1,500" defaultValue="₹1,500" className="mt-1 w-full rounded-[10px] border border-[var(--hairline)] px-3 py-2.5 text-[13px]" /></label>
              <div>
                <p className="text-[11px] font-semibold text-[var(--stone)]">Meeting method</p>
                <div className="mt-1 flex gap-2">
                  {['Google Meet', 'Zoom', 'In-person'].map(m => (
                    <label key={m} className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-full border border-[var(--hairline)] text-[12px] has-[:checked]:bg-[var(--green-50)] has-[:checked]:border-[var(--green-700)]/30 has-[:checked]:text-[var(--green-700)] cursor-pointer">
                      <input type="radio" name="meet" defaultChecked={m === 'Google Meet'} className="accent-[var(--green-700)]" /> {m}
                    </label>
                  ))}
                </div>
                <input placeholder="Auto-generate / paste link" defaultValue="meet.google.com/new" className="mt-2 w-full rounded-[10px] border border-[var(--hairline)] px-3 py-2.5 text-[12px] bg-[var(--surface-warm)]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[var(--stone)]">Payment</p>
                <div className="mt-1 flex gap-2">
                  {['Require payment', 'Mark as paid', 'Pay later'].map(p => (
                    <label key={p} className="flex-1 text-center px-2 py-2 rounded-full border border-[var(--hairline)] text-[11px] font-medium has-[:checked]:bg-[var(--green-700)] has-[:checked]:text-white cursor-pointer">
                      <input type="radio" name="pay" defaultChecked={p === 'Require payment'} className="sr-only" /> {p}
                    </label>
                  ))}
                </div>
              </div>
              <label className="block text-[11px] font-semibold text-[var(--stone)]">Notes <span className="font-normal text-[var(--stone)]">Optional</span>
                <textarea rows={2} placeholder="Add private notes..." className="mt-1 w-full rounded-[10px] border border-[var(--hairline)] px-3 py-2.5 text-[13px] resize-none" />
              </label>
            </div>
            <div className="p-4 border-t border-[var(--hairline)] flex gap-2 bg-[var(--surface-warm)]/40">
              <Button variant="secondary" fullWidth onPress={() => setShowCreate(false)}>Cancel</Button>
              <Button fullWidth onPress={() => { setShowCreate(false); setToast('Session created — payment link sent'); setTimeout(() => setToast(null), 2000) }}>Create Session</Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--ink)] text-white text-[13px] font-medium px-4 py-2 rounded-full flex items-center gap-2 z-50">
          <Check size={14} className="text-white/70" /> {toast}
        </div>
      )}
    </div>
  )
}
