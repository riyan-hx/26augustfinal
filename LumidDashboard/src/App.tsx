import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import Overview from './pages/Overview'
import CalendarPage from './pages/CalendarPage'
import BookingsPage from './pages/BookingsPage'
import PatientsPage from './pages/PatientsPage'
import PatientProfile from './pages/PatientProfile'
import { SessionsPage, FollowUpsPage, EarningsPage, InsightsPage, YourPage, SettingsPage } from './pages/OtherPages'
import PublicBooking from './pages/PublicBooking'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* No marketing landing page — the dashboard is the product. */}
        <Route path="/" element={<Navigate to="/app" replace />} />
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
