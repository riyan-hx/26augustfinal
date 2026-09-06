import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, ClipboardList, Wallet, Globe, Users, Video, Repeat2, Lightbulb, Settings, HelpCircle, LogOut, Menu, X, Bell, Search } from 'lucide-react'
import { useState } from 'react'

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
  {
    label: 'INTELLIGENCE',
    items: [
      { to: '/app/insights', label: 'Insights', icon: Lightbulb },
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
        <div className="h-[56px] flex items-center gap-2.5 px-5 border-b border-[var(--lumid-border)]">
          <div className="w-7 h-7 rounded-[8px] bg-[#242E21] flex items-center justify-center text-white text-[12px] font-bold tracking-widest">L</div>
          <span className="font-semibold text-[15px] tracking-tight text-[#242E21]">Lumid</span>
          <span className="text-[10px] tracking-[0.1em] text-[#8A9487] font-medium ml-0.5">PSYCHOLOGISTS</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navGroups.map(g => (
            <div key={g.label}>
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.12em] text-[#8A9487]">{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map(item => (
                  <NavLink key={item.to} to={item.to} end={item.end as boolean | undefined}
                    className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition ${isActive ? 'bg-[#EFF8EB] text-[#242E21] [&_svg]:text-[#4E8F39]' : 'text-[#687366] hover:bg-[#F8FAF7] hover:text-[#242E21]'}`}>
                    <item.icon size={15} strokeWidth={1.75} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-[var(--lumid-border)] space-y-3">
          <div className="flex items-center gap-3 px-2">
            <img src="https://i.pravatar.cc/100?img=5" alt="Dr Anitha" className="w-8 h-8 rounded-full object-cover border border-[#E5EAE2]" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold leading-none truncate text-[#242E21]">Dr. Anitha Raghavan</p>
              <p className="text-[11px] text-[#8A9487]">Bengaluru</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#88D95F] shrink-0 ring-2 ring-[#EFF8EB]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NavLink to="/app/settings" className="flex items-center justify-center gap-1.5 py-2 rounded-full border border-[#E5EAE2] text-[12px] font-medium text-[#687366] hover:bg-[#F8FAF7]">
              <Settings size={13} /> Settings
            </NavLink>
            <button className="flex items-center justify-center gap-1.5 py-2 rounded-full bg-[#242E21] text-white text-[12px] font-medium hover:bg-[#2E3D2A]">
              <HelpCircle size={13} /> Help
            </button>
          </div>
          <button className="w-full flex items-center justify-center gap-1.5 text-[11px] text-[#8A9487] hover:text-[#242E21] py-1">
            <LogOut size={13} /> Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Minimal top bar — premium Lumid */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-[12px] border-b border-[#E5EAE2] h-[52px] flex items-center gap-3 px-4 lg:px-6">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 -ml-2 text-[#687366]">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="hidden lg:flex items-center flex-1 max-w-[520px]">
            <div className="flex items-center gap-2.5 w-full bg-[#F8FAF7] border border-[#E5EAE2] rounded-full px-3.5 py-2 focus-within:border-[#88D95F] focus-within:ring-2 focus-within:ring-[#88D95F]/20 transition">
              <Search size={14} className="text-[#8A9487] shrink-0" />
              <input placeholder="Search patients, sessions, bookings..." className="bg-transparent outline-none text-[13px] w-full placeholder:text-[#8A9487] text-[#242E21]" />
              <span className="hidden xl:inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded bg-white border border-[#E5EAE2] text-[#8A9487]">⌘K</span>
            </div>
          </div>
          <div className="lg:hidden font-semibold text-[15px] flex-1 text-[#242E21]">Lumid</div>

          <div className="ml-auto flex items-center gap-1.5">
            <button className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E5EAE2] text-[12px] font-medium text-[#687366] hover:bg-[#F8FAF7]">
              <HelpCircle size={14} /> Help
            </button>
            <button className="relative w-8 h-8 rounded-full hover:bg-[#F8FAF7] flex items-center justify-center text-[#687366]">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#88D95F] rounded-full border-2 border-white" />
            </button>
            <img src="https://i.pravatar.cc/100?img=5" alt="" className="w-8 h-8 rounded-full object-cover border border-[#E5EAE2] hidden sm:block" />
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
                      className={({ isActive }) => `flex items-center gap-2 px-3 py-2.5 rounded-[10px] border text-[13px] font-medium ${isActive ? 'bg-[var(--green-700)] text-white border-transparent' : 'bg-[var(--surface-warm)] border-[var(--hairline)] text-[var(--slate)]'}`}>
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
        <div className="hidden lg:flex h-[36px] items-center gap-4 px-6 bg-[#F8FAF7]/80 backdrop-blur border-b border-[#E5EAE2] sticky top-[52px] z-20">
          <span className="text-[12px] font-semibold text-[#242E21]">Today</span>
          <span className="text-[11px] text-[#8A9487]">Tuesday, 26 August • 4 sessions • ₹6,000</span>
          <a href="/book" className="ml-auto text-[11px] font-medium text-[#4E8F39] hover:underline">anitha.lumidai.in →</a>
        </div>

        <main className="flex-1 min-w-0">
          <div className="max-w-[1160px] mx-auto w-full">
            {children}
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#E5EAE2] flex items-center justify-around py-2 pb-[max(8px,env(safe-area-inset-bottom))] z-30">
          {[
            { to: '/app', label: 'Overview', icon: LayoutDashboard },
            { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
            { to: '/app/patients', label: 'Patients', icon: Users },
            { to: '/app/bookings', label: 'Bookings', icon: ClipboardList },
            { to: '/app/settings', label: 'More', icon: Settings },
          ].map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/app'} className={({ isActive }) => `flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${isActive ? 'text-[#242E21]' : 'text-[#8A9487]'}`}>
              <item.icon size={18} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
