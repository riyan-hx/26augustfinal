import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { initials } from '../../lib/format'
import { useProfile } from '../practice/hooks'
import { NewBookingDialog } from '../bookings/NewBookingDialog'
import logo from '../../assets/v3/lumid-logo.svg'
import iSearch from '../../assets/v3/icon-search.svg'
import iBell from '../../assets/v3/icon-bell.svg'
import iBellDot from '../../assets/v3/bell-dot.svg'
import iHelp from '../../assets/v3/icon-help.svg'
import rPlus from '../../assets/v3/rail-plus.svg'
import rVideo from '../../assets/v3/rail-video.svg'
import rFollowUps from '../../assets/v3/rail-followups.svg'
import rYourPage from '../../assets/v3/rail-yourpage.svg'
import rSettings from '../../assets/v3/rail-settings.svg'
import rPrivacy from '../../assets/v3/rail-privacy.svg'
import rHelp from '../../assets/v3/rail-help.svg'
import './v3.css'

const NAV = [
  { to: '/app', label: 'Overview' },
  { to: '/app/calendar', label: 'Calendar' },
  { to: '/app/bookings', label: 'Bookings' },
  { to: '/app/patients', label: 'Patients' },
  { to: '/app/earnings', label: 'Earnings' },
]
const RAIL = [
  { to: '/app/sessions', label: 'Sessions', icon: rVideo },
  { to: '/app/follow-ups', label: 'Follow-ups', icon: rFollowUps },
  { to: '/app/your-page', label: 'Your page', icon: rYourPage },
  { to: '/app/settings', label: 'Settings', icon: rSettings },
]
const HELP_URL = 'https://lumidai.in'

/** v3 frame: floating top bar and icon rail around the page content. */
export function V3Shell({ alerts, children }: { alerts: boolean; children: ReactNode }) {
  const { data: profile } = useProfile()
  const [booking, setBooking] = useState(false)
  const name = profile?.displayName || 'Your practice'
  const role = [profile?.title, profile?.city].filter(Boolean).join(' · ')

  return (
    <div className="v3">
      <div className="mx-auto max-w-[2048px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6 2xl:px-10">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <Link to="/app" className="bg-white rounded-full px-6 py-[18px]" aria-label="Lumid home"><img src={logo} alt="Lumid AI" width={105} height={16} /></Link>
          <nav aria-label="Main" className="bg-white rounded-full p-[5px] flex gap-1 overflow-x-auto max-w-full order-3 xl:order-none">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} end className="v3-nav">{n.label}</NavLink>)}
          </nav>
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-full p-1 flex gap-[2px]">
              <Link to="/app/patients" className="v3-icon-btn" aria-label="Find a patient"><img src={iSearch} alt="" width={20} height={20} /></Link>
              <a href="#attention-h" className="v3-icon-btn" aria-label={alerts ? 'Things need your attention' : 'Notifications'}>
                <img src={iBell} alt="" width={20} height={20} />
                {alerts && <img src={iBellDot} alt="" width={8} height={8} className="absolute left-[25px] top-[11px]" />}
              </a>
              <a href={HELP_URL} target="_blank" rel="noreferrer" className="v3-icon-btn" aria-label="Help"><img src={iHelp} alt="" width={20} height={20} /></a>
            </div>
            <Link to="/app/settings#profile" className="bg-white rounded-full pl-1 pr-[22px] py-1 hidden sm:flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-[var(--v3-forest)] text-white text-[13px] font-medium flex items-center justify-center">{initials(name)}</span>
              <span className="flex flex-col gap-px whitespace-nowrap">
                <span className="text-[15px] font-medium leading-[1.3]">{name}</span>
                {role && <span className="text-[12px] leading-[1.4] text-[var(--v3-ink-3)]">{role}</span>}
              </span>
            </Link>
          </div>
        </header>

        <div className="mt-5 flex gap-5">
          <aside aria-label="Workspace" className="hidden md:flex flex-col justify-between w-14 shrink-0">
            <div className="flex flex-col gap-4 items-center">
              <div className="bg-white rounded-full p-[6px]">
                <button type="button" onClick={() => setBooking(true)} aria-label="New booking"
                  className="w-11 h-11 rounded-full bg-[var(--v3-lime)] flex items-center justify-center hover:brightness-95"><img src={rPlus} alt="" width={20} height={20} /></button>
              </div>
              <div className="bg-white rounded-full px-[6px] py-2 flex flex-col gap-[10px]">
                {RAIL.map((r) => <NavLink key={r.to} to={r.to} className="v3-icon-btn" aria-label={r.label} title={r.label}><img src={r.icon} alt="" width={20} height={20} /></NavLink>)}
              </div>
            </div>
            <div className="bg-white rounded-full px-[6px] py-2 flex flex-col gap-[10px]">
              <Link to="/app/settings" className="v3-icon-btn" aria-label="Privacy" title="Privacy"><img src={rPrivacy} alt="" width={20} height={20} /></Link>
              <a href={HELP_URL} target="_blank" rel="noreferrer" className="v3-icon-btn" aria-label="Help" title="Help"><img src={rHelp} alt="" width={20} height={20} /></a>
            </div>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>

      {booking && <NewBookingDialog onClose={() => setBooking(false)} />}
    </div>
  )
}
