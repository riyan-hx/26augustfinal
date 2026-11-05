import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Bell, ChevronRight, CalendarPlus } from '../lib/icons'
import { useRef, useState, type ComponentType } from 'react'
import { LumidLogo } from './LumidLogo'
import { Avatar } from './ui/Avatar'
import {
  NavOverview, NavCalendar, NavBookings, NavPatients, NavFollowUps, NavSessions,
  NavEarnings, NavYourPage, NavSettings, NavSignOut, NavSetup, NavMore,
} from './navIcons'
import { useProfile } from '../features/practice/hooks'
import { useAuth } from '../features/auth/AuthProvider'
import { demoRequested, exitDemo, isDemoMode } from '../lib/env'
import { useAwaitingPayments, useTodayBookings } from '../features/bookings/hooks'
import { useFollowUps } from '../features/care/hooks'
import { NewBookingButton, NewBookingDialog } from '../features/bookings/NewBookingDialog'
import { useDialogFocus } from './ui/useDialogFocus'
import { bookingUrl, bookingUrlLabel } from '../lib/links'
import { formatINR, sumPaise } from '../lib/money'
import { useNow } from '../lib/useNow'

type NavIcon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
type NavItem = { to: string; label: string; icon: NavIcon; end?: boolean; badge?: 'awaiting' | 'due' }

/** "Sunday, 1 November • 3 sessions • ₹4,500 paid" for today in IST. */
function TodaySummary() {
  const { data } = useTodayBookings()
  const day = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  const active = (data ?? []).filter((b) => b.status === 'confirmed' || b.status === 'completed' || b.status === 'pending_payment')
  const paid = sumPaise(active.filter((b) => b.paymentStatus === 'captured' || b.paymentStatus === 'partially_refunded').map((b) => b.pricePaise))
  return (
    <span className="text-[12px] text-[var(--color-ink-muted-48)] truncate">
      {day}{data ? ` · ${active.length} ${active.length === 1 ? 'session' : 'sessions'} · ${formatINR(paid)} paid` : ''}
    </span>
  )
}

// Ordered by how often a solo practitioner reaches for each screen:
// daily work first, then money, then the one-time setup screens.
const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Daily work',
    items: [
      { to: '/app', label: 'Overview', icon: NavOverview, end: true },
      { to: '/app/calendar', label: 'Calendar', icon: NavCalendar },
      { to: '/app/bookings', label: 'Bookings', icon: NavBookings, badge: 'awaiting' },
      { to: '/app/patients', label: 'Patients', icon: NavPatients },
      { to: '/app/follow-ups', label: 'Follow-ups', icon: NavFollowUps, badge: 'due' },
      { to: '/app/sessions', label: 'Sessions', icon: NavSessions },
    ],
  },
  {
    label: 'Money',
    items: [{ to: '/app/earnings', label: 'Earnings', icon: NavEarnings }],
  },
  {
    label: 'Setup',
    items: [
      { to: '/app/your-page', label: 'Your page', icon: NavYourPage },
      { to: '/app/settings', label: 'Settings', icon: NavSettings },
    ],
  },
]

const bottomNav: NavItem[] = [
  { to: '/app', label: 'Overview', icon: NavOverview, end: true },
  { to: '/app/calendar', label: 'Calendar', icon: NavCalendar },
  { to: '/app/bookings', label: 'Bookings', icon: NavBookings, badge: 'awaiting' },
  { to: '/app/patients', label: 'Patients', icon: NavPatients },
]

/** Live counts that earn a nav badge: payments to collect, follow-ups due. */
function useNavCounts() {
  const awaiting = useAwaitingPayments()
  const followUps = useFollowUps()
  const now = useNow()
  return {
    awaiting: awaiting.data?.length ?? 0,
    due: (followUps.data ?? []).filter((f) => f.status === 'scheduled' && f.dueAt.getTime() <= now).length,
  }
}

function CountPill({ n, label }: { n: number; label: string }) {
  if (!n) return null
  return (
    <span className="ml-auto min-w-[20px] h-[20px] px-1.5 rounded-full inline-flex items-center justify-center text-[11px] font-semibold tabular-nums bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)]">
      <span aria-hidden="true">{n}</span>
      <span className="sr-only">, {n} {label}</span>
    </span>
  )
}

const navItemClass = (isActive: boolean) =>
  `group relative flex items-center gap-3 h-10 px-3 rounded-[10px] text-[13px] font-semibold transition-colors duration-150 ${
    isActive
      ? 'bg-[var(--color-primary-soft)] text-[var(--color-forest)]'
      : 'text-[var(--color-ink-muted-80)] hover:bg-[var(--color-canvas-parchment)] hover:text-[var(--color-ink)]'
  }`

function SideNavLink({ item, counts, onNavigate }: { item: NavItem; counts: ReturnType<typeof useNavCounts>; onNavigate?: () => void }) {
  const n = item.badge ? counts[item.badge] : 0
  return (
    <NavLink to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => navItemClass(isActive)}>
      {({ isActive }) => (
        <>
          {isActive && <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[var(--color-primary)]" />}
          <item.icon size={18} strokeWidth={1.8} className={isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-muted-48)] group-hover:text-[var(--color-ink)]'} />
          <span className="truncate">{item.label}</span>
          <CountPill n={n} label={item.badge === 'awaiting' ? 'awaiting payment' : 'due'} />
        </>
      )}
    </NavLink>
  )
}

/** Shown until the booking page is published — the one thing blocking real bookings. */
function FinishSetupCard({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link to="/app/setup" onClick={onNavigate}
      className="block rounded-[14px] border border-[color-mix(in_oklch,var(--color-primary)_22%,var(--color-hairline))] bg-[var(--color-primary-tint)] p-3.5 hover:bg-[var(--color-primary-soft)] transition-colors">
      <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-forest)]">
        <span className="icon-tile !w-7 !h-7 !rounded-[8px] bg-white"><NavSetup size={15} /></span>
        Finish setup
        <ChevronRight size={14} className="ml-auto text-[var(--color-primary)]" />
      </span>
      <span className="block text-[12px] leading-snug text-[var(--color-ink-muted-80)] mt-2">Your booking page isn’t live yet, so patients can’t book you.</span>
    </Link>
  )
}

function SignOutButton({ compact = false }: { compact?: boolean }) {
  const { isDemo, signOut } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  if (isDemo && !demoRequested) return null
  const onClick = async () => {
    if (demoRequested) { exitDemo(); return }
    setBusy(true)
    try { await signOut() } finally { navigate('/login', { replace: true }) }
  }
  return compact ? (
    <button type="button" onClick={() => void onClick()} disabled={busy} aria-label={demoRequested ? 'Exit demo' : 'Sign out'} title={demoRequested ? 'Exit demo' : 'Sign out'}
      className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-ink-muted-48)] hover:bg-[var(--color-canvas-parchment)] hover:text-[var(--color-ink)] disabled:opacity-50">
      <NavSignOut size={16} />
    </button>
  ) : (
    <button type="button" onClick={() => void onClick()} disabled={busy} className="btn-secondary w-full">
      <NavSignOut size={15} /> {demoRequested ? 'Exit demo' : busy ? 'Signing out…' : 'Sign out'}
    </button>
  )
}

/** Mobile "More" menu: a modal sheet with the full navigation. */
function MoreSheet({ onClose, onNewBooking, needsSetup, name, counts, returnTo }: {
  onClose: () => void; onNewBooking: () => void; needsSetup: boolean; name: string
  counts: ReturnType<typeof useNavCounts>; returnTo: HTMLElement | null
}) {
  const panel = useRef<HTMLDivElement>(null)
  useDialogFocus(panel, onClose, { returnTo })
  return (
    <div className="lg:hidden fixed inset-x-0 top-[56px] bottom-0 z-40 bg-[var(--color-forest)]/20" onClick={onClose}>
      <div ref={panel} id="more-sheet" role="dialog" aria-modal="true" aria-label="Menu" tabIndex={-1}
        className="bg-white border-b border-[var(--hairline)] p-4 space-y-4 max-h-full overflow-y-auto shadow-[var(--shadow-pop)] outline-none" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="btn-primary w-full !min-h-[42px]" onClick={onNewBooking}><CalendarPlus size={14} />New booking</button>
        {needsSetup && <FinishSetupCard onNavigate={onClose} />}
        {navGroups.map((g) => (
          <div key={g.label}>
            <p className="px-1 mb-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase text-[var(--color-ink-muted-48)]">{g.label}</p>
            <div className="grid grid-cols-2 gap-1">
              {g.items.map((item) => <SideNavLink key={item.to} item={item} counts={counts} onNavigate={onClose} />)}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2.5 pt-3 border-t border-[var(--hairline)]">
          <Avatar name={name} size={32} />
          <p className="flex-1 min-w-0 text-[13px] font-semibold truncate">{name}</p>
          <div className="w-[120px]"><SignOutButton /></div>
        </div>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [booking, setBooking] = useState(false)
  // The control that opened the sheet, so focus can return to it.
  const [sheetOpener, setSheetOpener] = useState<HTMLElement | null>(null)
  const location = useLocation()
  const { data: profile } = useProfile()
  const counts = useNavCounts()
  const name = profile?.displayName || 'Your practice'
  const needsSetup = !!profile && !profile.published

  // Any navigation (including Back) closes the sheet.
  const [sheetPath, setSheetPath] = useState(location.pathname)
  if (sheetPath !== location.pathname) { setSheetPath(location.pathname); setMobileOpen(false) }

  const close = () => setMobileOpen(false)
  const toggle = (e: React.MouseEvent<HTMLElement>) => { setSheetOpener(e.currentTarget); setMobileOpen((o) => !o) }
  const openBookingFromSheet = () => { setMobileOpen(false); setBooking(true) }
  const moreActive = !bottomNav.some((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)))

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] flex">
      {/* Left sidebar */}
      <aside className="hidden lg:flex w-[248px] shrink-0 bg-white border-r border-[var(--hairline)] flex-col sticky top-0 h-screen">
        <div className="h-[64px] flex items-center px-5">
          <Link to="/app" aria-label="Lumid home"><LumidLogo className="h-[20px]" /></Link>
        </div>

        <div className="px-4 pb-2">
          <NewBookingButton className="btn-primary w-full !min-h-[40px]" />
        </div>

        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {navGroups.map((g) => (
            <div key={g.label}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase text-[var(--color-ink-muted-48)]">{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map((item) => <SideNavLink key={item.to} item={item} counts={counts} />)}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 space-y-3 border-t border-[var(--hairline)]">
          {needsSetup && <FinishSetupCard />}
          <div className="flex items-center gap-2.5 px-1.5">
            <Avatar name={name} size={34} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold leading-tight truncate text-[var(--color-ink)]">{name}</p>
              <p className="text-[11px] text-[var(--color-ink-muted-48)] truncate flex items-center gap-1.5 mt-0.5">
                <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 ${profile?.published ? 'bg-[var(--color-lime)]' : 'bg-[var(--badge-amber-fg)]'}`} />
                {profile?.published ? 'Booking page live' : 'Not published yet'}
              </p>
            </div>
            <SignOutButton compact />
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-[12px] border-b border-[var(--hairline)] h-[56px] flex items-center gap-3 px-4 lg:px-6">
          <button type="button" onClick={toggle} aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen} aria-controls={mobileOpen ? 'more-sheet' : undefined} className="lg:hidden w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-[var(--color-ink-muted-80)] hover:bg-[var(--color-canvas-parchment)]">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <Link to="/app" className="lg:hidden flex-1" aria-label="Lumid home"><LumidLogo className="h-[17px]" /></Link>

          <div className="ml-auto flex items-center gap-2">
            {isDemoMode && <span className="hidden sm:inline-flex badge badge--amber">Demo data</span>}
            <Link to="/app/follow-ups" aria-label={counts.due ? `Follow-ups, ${counts.due} due` : 'Follow-ups'} title="Follow-ups"
              className="relative w-9 h-9 rounded-full hover:bg-[var(--color-canvas-parchment)] flex items-center justify-center text-[var(--color-ink-muted-80)]">
              <Bell size={17} />
              {counts.due > 0 && <span aria-hidden="true" className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--badge-amber-fg)] rounded-full border-2 border-white" />}
            </Link>
            <Link to="/app/settings" aria-label="Practice settings" className="hidden sm:block rounded-full"><Avatar name={name} size={32} /></Link>
          </div>
        </header>

        {mobileOpen && (
          <MoreSheet onClose={close} onNewBooking={openBookingFromSheet} needsSetup={needsSetup} name={name} counts={counts} returnTo={sheetOpener} />
        )}
        {booking && <NewBookingDialog onClose={() => setBooking(false)} returnFocusTo={sheetOpener} />}

        {/* Today strip */}
        <div className="hidden lg:flex h-[38px] items-center gap-3 px-6 bg-[var(--color-canvas-parchment)]/85 backdrop-blur border-b border-[var(--hairline)] sticky top-[56px] z-20">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-forest)]">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[var(--color-lime)]" />Today
          </span>
          <TodaySummary />
          {profile?.slug && profile.published && (
            <a href={isDemoMode ? '/book' : bookingUrl(profile.slug)} target={isDemoMode ? undefined : '_blank'} rel="noreferrer" className="ml-auto text-[12px] font-semibold text-[var(--color-primary)] hover:underline underline-offset-2 truncate">
              {bookingUrlLabel(profile.slug)} →
            </a>
          )}
        </div>

        <main className="flex-1 min-w-0">
          <div className="max-w-[1480px] mx-auto w-full">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav aria-label="Main" className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-[var(--hairline)] grid grid-cols-5 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))] z-30">
          {bottomNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={close}
              className={({ isActive }) => `relative flex flex-col items-center gap-0.5 py-1 ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-muted-48)]'}`}>
              {({ isActive }) => (
                <>
                  <span className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-[var(--color-primary-soft)]' : ''}`}><item.icon size={19} strokeWidth={1.8} /></span>
                  <span className="text-[10.5px] font-semibold">{item.label}</span>
                  {item.badge && counts[item.badge] > 0 && <span className="absolute top-0.5 right-[calc(50%-20px)] w-2 h-2 rounded-full bg-[var(--badge-amber-fg)] border-2 border-white" />}
                </>
              )}
            </NavLink>
          ))}
          <button type="button" onClick={toggle} aria-expanded={mobileOpen} aria-haspopup="dialog" aria-controls={mobileOpen ? 'more-sheet' : undefined}
            className={`flex flex-col items-center gap-0.5 py-1 ${moreActive || mobileOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-muted-48)]'}`}>
            <span className={`w-12 h-7 rounded-full flex items-center justify-center ${moreActive || mobileOpen ? 'bg-[var(--color-primary-soft)]' : ''}`}><NavMore size={19} strokeWidth={1.8} /></span>
            <span className="text-[10.5px] font-semibold">More</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
