import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, ClipboardList, Wallet, Globe, Users, Video, Repeat2, Settings, Download, Menu, X, Bell, Search } from '../lib/icons'
import { useState } from 'react'

// v1 nav: only routes with real content behind them. Ranked by the validated
// wedge — booking + payment enforcement and calendar first, care second.
// No "Intelligence" group: that layer has no real data behind it yet, so it
// doesn't get a permanent place in the nav (see the Overview teaser instead).
const navGroups = [
  {
    label: 'PRACTICE',
    items: [
      { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
      { to: '/app/bookings', label: 'Bookings', icon: ClipboardList },
      { to: '/app/earnings', label: 'Earnings', icon: Wallet },
      { to: '/app/your-page', label: 'Your Page', icon: Globe },
    ]
  },
  {
    label: 'CARE',
    items: [
      { to: '/app/patients', label: 'Patients', icon: Users },
      { to: '/app/sessions', label: 'Sessions', icon: Video },
      { to: '/app/follow-ups', label: 'Follow-ups', icon: Repeat2 },
    ]
  },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const isApp = location.pathname.startsWith('/app')
  if (!isApp) return <>{children}</>

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] flex">
      {/* Fixed left sidebar — 220-240px, Lumid */}
      <aside className="hidden lg:flex w-[232px] shrink-0 bg-white border-r border-[var(--lumid-border)] flex-col sticky top-0 h-screen">
        <div className="h-[64px] flex items-center px-5 border-b border-[var(--lumid-border)]">
          <span className="font-extrabold text-[20px] tracking-tight" style={{ color: 'var(--color-primary)' }}>LUMID AI</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navGroups.map(g => (
            <div key={g.label}>
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.12em] text-[var(--color-ink-muted-48)]">{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map(item => (
                  <NavLink key={item.to} to={item.to} end={item.end as boolean | undefined}
                    className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-medium transition ${isActive ? '[&_svg]:text-[var(--color-primary)]' : 'text-[var(--color-ink-muted-48)] hover:bg-[var(--color-canvas-parchment)] hover:text-[var(--color-ink)]'}`}
                    style={({ isActive }) => isActive ? { background: 'var(--color-primary-soft)', color: 'var(--color-primary)' } : undefined}>
                    <item.icon size={16} strokeWidth={1.75} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-[var(--lumid-border)] space-y-3">
          <div className="flex items-center gap-3 px-2">
            <img src="https://i.pravatar.cc/100?img=5" alt="Dr Anitha" className="w-8 h-8 rounded-full object-cover border border-[var(--color-hairline)]" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold leading-none truncate text-[var(--color-ink)]">Dr. Anitha Raghavan</p>
              <p className="text-[11px] text-[var(--color-ink-muted-48)]">Bengaluru</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-[var(--badge-green-fg)] shrink-0 ring-2 ring-[var(--badge-green-bg)]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NavLink to="/app/settings" className="flex items-center justify-center gap-1.5 py-2 rounded-full border border-[var(--color-hairline)] text-[12px] font-medium text-[var(--color-ink-muted-48)] hover:bg-[var(--color-canvas-parchment)]">
              <Settings size={13} /> Settings
            </NavLink>
            <button className="flex items-center justify-center gap-1.5 py-2 rounded-full bg-[var(--color-ink)] text-white text-[12px] font-medium hover:opacity-90">
              <Download size={13} /> Export
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Minimal top bar — premium Lumid */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-[12px] border-b border-[var(--color-hairline)] h-[52px] flex items-center gap-3 px-4 lg:px-6">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 -ml-2 text-[var(--color-ink-muted-48)]">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="hidden lg:flex items-center flex-1 max-w-[520px]">
            <div className="flex items-center gap-2.5 w-full bg-[var(--color-canvas-parchment)] border border-[var(--color-hairline)] rounded-full px-3.5 py-2 focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary-soft)] transition">
              <Search size={14} className="text-[var(--color-ink-muted-48)] shrink-0" />
              <input placeholder="Search patients, sessions, bookings..." className="bg-transparent outline-none text-[13px] w-full placeholder:text-[var(--color-ink-muted-48)] text-[var(--color-ink)]" />
              <span className="hidden xl:inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded bg-white border border-[var(--color-hairline)] text-[var(--color-ink-muted-48)]">⌘K</span>
            </div>
          </div>
          <div className="lg:hidden font-semibold text-[15px] flex-1 text-[var(--color-ink)]">Lumid</div>

          <div className="ml-auto flex items-center gap-1.5">
            <button className="relative w-8 h-8 rounded-full hover:bg-[var(--color-canvas-parchment)] flex items-center justify-center text-[var(--color-ink-muted-48)]">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-primary)] rounded-full border-2 border-white" />
            </button>
            <img src="https://i.pravatar.cc/100?img=5" alt="" className="w-8 h-8 rounded-full object-cover border border-[var(--color-hairline)] hidden sm:block" />
          </div>
        </header>

        {mobileOpen && (
          <div className="lg:hidden bg-white border-b border-[var(--hairline)] p-4 space-y-4">
            {navGroups.map(g => (
              <div key={g.label}>
                <p className="text-[10px] font-semibold tracking-[0.12em] text-[var(--stone)] mb-2">{g.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {g.items.map(item => (
                    <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                      className={({ isActive }) => `flex items-center gap-2 px-3 py-2.5 rounded-[10px] border text-[13px] font-medium ${isActive ? 'bg-[var(--color-primary)] text-white border-transparent' : 'bg-[var(--color-canvas-parchment)] border-[var(--color-hairline)] text-[var(--color-ink-muted-48)]'}`}>
                      <item.icon size={14} /> {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 bg-[var(--surface-warm)] border border-[var(--hairline)] rounded-full px-3 py-2">
              <Search size={14} className="text-[var(--stone)]" />
              <input placeholder="Search patients, sessions..." className="bg-transparent outline-none text-[13px] w-full" />
            </div>
          </div>
        )}

        {/* Frosted sub-nav — Lumid */}
        <div className="hidden lg:flex h-[36px] items-center gap-4 px-6 bg-[var(--color-canvas-parchment)]/80 backdrop-blur border-b border-[var(--color-hairline)] sticky top-[52px] z-20">
          <span className="text-[12px] font-semibold text-[var(--color-ink)]">Today</span>
          <span className="text-[11px] text-[var(--color-ink-muted-48)]">Tuesday, 26 August • 3 sessions • ₹5,000</span>
          <a href="/book" className="ml-auto text-[11px] font-medium text-[var(--color-primary)] hover:underline">anitha.lumidai.in →</a>
        </div>

        <main className="flex-1 min-w-0">
          <div className="max-w-[1160px] mx-auto w-full">
            {children}
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[var(--color-hairline)] flex items-center justify-around py-2 pb-[max(8px,env(safe-area-inset-bottom))] z-30">
          {[
            { to: '/app', label: 'Overview', icon: LayoutDashboard },
            { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
            { to: '/app/patients', label: 'Patients', icon: Users },
            { to: '/app/bookings', label: 'Bookings', icon: ClipboardList },
            { to: '/app/settings', label: 'More', icon: Settings },
          ].map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/app'} className={({ isActive }) => `flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-muted-48)]'}`}>
              <item.icon size={18} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
