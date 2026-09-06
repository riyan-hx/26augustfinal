import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import Overview from './pages/Overview'
import CalendarPage from './pages/CalendarPage'
import BookingsPage from './pages/BookingsPage'
import PatientsPage from './pages/PatientsPage'
import PatientProfile from './pages/PatientProfile'
import { SessionsPage, FollowUpsPage, EarningsPage, InsightsPage, YourPage, SettingsPage } from './pages/OtherPages'
import PublicBooking from './pages/PublicBooking'

function Landing() {
  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <header className="sticky top-0 z-40 bg-[var(--green-900)] text-white h-11 flex items-center px-4 lg:px-6">
        <div className="max-w-[1280px] mx-auto w-full flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-white text-[var(--green-900)] flex items-center justify-center text-[11px] font-bold">L</div>
          <span className="font-semibold text-[14px]">Lumid</span>
          <span className="hidden sm:inline text-[11px] tracking-[0.12em] opacity-70">FOR PSYCHOLOGISTS</span>
          <div className="ml-auto flex items-center gap-2">
            <a href="/book" className="hidden sm:inline-flex px-4 py-1.5 rounded-full bg-white text-[var(--green-900)] text-[12px] font-semibold">View demo booking →</a>
            <a href="/app" className="px-4 py-1.5 rounded-full border border-white/20 text-[12px] font-medium hover:bg-white/10">Open dashboard</a>
          </div>
        </div>
      </header>

      <section className="bg-white border-b border-[var(--hairline)]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-8 py-12 lg:py-16 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--green-50)] border border-[var(--green-200)] text-[11px] font-semibold text-[var(--green-700)] tracking-[0.08em]">NEVER LOSE INCOME TO A NO-SHOW</p>
            <h1 className="font-serif text-[32px] lg:text-[44px] font-semibold tracking-[-0.03em] leading-[0.95] mt-4">The operating system for independent psychologists.</h1>
            <p className="text-[15px] leading-relaxed text-[var(--slate)] mt-4 max-w-[560px]">Practice gets you in. Care keeps you. Intelligence makes you irreplaceable. Lumid handles booking, payment-enforced confirmation, calendar, follow-ups, and consented intelligence — so you never chase on WhatsApp again.</p>
            <div className="flex flex-wrap gap-3 mt-6">
              <a href="/app" className="px-6 py-3 rounded-full bg-[var(--green-700)] text-white text-[14px] font-medium hover:bg-[var(--green-800)]">Open psychologist dashboard</a>
              <a href="/book" className="px-6 py-3 rounded-full border border-[var(--hairline)] bg-white text-[14px] font-medium hover:bg-[var(--canvas)]">See patient booking page</a>
            </div>
            <div className="flex flex-wrap gap-2 mt-6 text-[11px] text-[var(--stone)]">
              <span className="px-3 py-1.5 rounded-full bg-[var(--canvas)] border border-[var(--hairline)]">✓ Payment before confirmation</span>
              <span className="px-3 py-1.5 rounded-full bg-[var(--canvas)] border border-[var(--hairline)]">✓ Automated re-engagement</span>
              <span className="px-3 py-1.5 rounded-full bg-[var(--canvas)] border border-[var(--hairline)]">✓ Consent is revocable</span>
            </div>
          </div>
          <div className="bg-[var(--green-900)] rounded-[20px] p-6 lg:p-8 text-white">
            <p className="text-[11px] font-semibold tracking-[0.12em] opacity-60">LIVE PREVIEW — OVERVIEW</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-xl p-4"><p className="text-[11px] opacity-70">Sessions today</p><p className="text-[24px] font-semibold">4</p></div>
              <div className="bg-white/10 rounded-xl p-4"><p className="text-[11px] opacity-70">Follow-ups</p><p className="text-[24px] font-semibold">2</p></div>
              <div className="bg-white/10 rounded-xl p-4"><p className="text-[11px] opacity-70">Today’s earnings</p><p className="text-[18px] font-semibold">₹4,000</p></div>
              <div className="bg-white text-[var(--green-900)] rounded-xl p-4"><p className="text-[11px] opacity-70">New booking</p><p className="text-[18px] font-semibold">1 • Paid</p></div>
            </div>
            <div className="mt-4 rounded-xl bg-white text-[var(--ink)] p-4">
              <p className="text-[12px] font-semibold">10:00 AM • Rahul Sharma • Individual Session • Paid</p>
              <p className="text-[11px] text-[var(--stone)] mt-1">“What needs my attention today?” — one screen answers it.</p>
            </div>
            <a href="/app" className="mt-4 inline-flex w-full justify-center py-2.5 rounded-full bg-white text-[var(--green-900)] text-[13px] font-semibold">Enter dashboard →</a>
          </div>
        </div>
      </section>

      <section className="bg-[var(--canvas)]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-8 py-10 grid md:grid-cols-3 gap-6">
          {[
            { k: 'PRACTICE', t: 'Booking + payment enforcement', d: 'One link • Razorpay • Calendar sync • Reminders. No awkward asks.' },
            { k: 'CARE', t: 'Continuity between sessions', d: 'Lightweight notes • Timeline • Follow-ups • Patient-shared progress.' },
            { k: 'INTELLIGENCE', t: 'Explainable, consented insights', d: 'Observation → Evidence → Confidence → Alternative → Human decision.' },
          ].map(card => (
            <div key={card.k} className="bg-white border border-[var(--hairline)] rounded-[16px] p-6">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--green-700)]">{card.k}</p>
              <p className="text-[16px] font-semibold mt-1">{card.t}</p>
              <p className="text-[13px] text-[var(--stone)] leading-relaxed mt-2">{card.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-[var(--green-900)] text-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-8 py-8 flex flex-col lg:flex-row gap-4 text-[11px] opacity-70">
          <span>© 2026 Lumid AI • anitha.lumidai.in • Crafted for independent psychologists</span>
          <span className="lg:ml-auto">Design system: warm off-white • forest green • sage • Plus Jakarta Sans + Cormorant Garamond • 12px cards • pill CTAs</span>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/book" element={<PublicBooking />} />
        <Route path="/app" element={<AppShell><Overview /></AppShell>} />
        <Route path="/app/calendar" element={<AppShell><CalendarPage /></AppShell>} />
        <Route path="/app/bookings" element={<AppShell><BookingsPage /></AppShell>} />
        <Route path="/app/patients" element={<AppShell><PatientsPage /></AppShell>} />
        <Route path="/app/patients/:id" element={<AppShell><PatientProfile /></AppShell>} />
        <Route path="/app/sessions" element={<AppShell><SessionsPage /></AppShell>} />
        <Route path="/app/follow-ups" element={<AppShell><FollowUpsPage /></AppShell>} />
        <Route path="/app/earnings" element={<AppShell><EarningsPage /></AppShell>} />
        <Route path="/app/payments" element={<Navigate to="/app/earnings" replace />} />
        <Route path="/app/your-page" element={<AppShell><YourPage /></AppShell>} />
        <Route path="/app/insights" element={<AppShell><InsightsPage /></AppShell>} />
        <Route path="/app/settings" element={<AppShell><SettingsPage /></AppShell>} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
