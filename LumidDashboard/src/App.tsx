import { lazy, Suspense, useLayoutEffect, useRef, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query'
import { AuthProvider } from './features/auth/AuthProvider'
import { RequireAuth } from './features/auth/RequireAuth'
import { AppShell } from './components/AppShell'
import { Skeleton } from './components/ui/StateViews'

// Route-level code splitting: each screen loads on first visit.
const LiveOverview = lazy(() => import('./features/overview/LiveOverview'))
const SetupWizard = lazy(() => import('./features/onboarding/SetupWizard'))
const LiveCalendar = lazy(() => import('./features/calendar/LiveCalendar'))
const LiveSessions = lazy(() => import('./features/sessions/LiveSessions'))
const LiveYourPage = lazy(() => import('./features/practice/LiveYourPage'))
const LiveFollowUps = lazy(() => import('./features/care/FollowUps'))
const LiveInsights = lazy(() => import('./features/coming-soon').then((m) => ({ default: m.InsightsSoon })))
const BookingsPage = lazy(() => import('./pages/BookingsPage'))
const PatientsPage = lazy(() => import('./pages/PatientsPage'))
const PatientProfile = lazy(() => import('./pages/PatientProfile'))
const PracticeSettings = lazy(() => import('./features/practice/PracticeSettings'))
const PublicBooking = lazy(() => import('./features/public-booking/PublicBookingPage'))
const ManageBooking = lazy(() => import('./features/public-booking/ManageBookingPage'))
const LoginPage = lazy(() => import('./features/auth/LoginPage'))
const LiveEarnings = lazy(() => import('./features/earnings/LiveEarnings'))
const NotFound = lazy(() => import('./pages/NotFound'))

/**
 * New screens start at the top. Skipped for Back/Forward (the browser restores
 * the position), for links with a #hash (the page scrolls to its target), and
 * within the setup wizard, which manages its own scrolling between steps.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const navType = useNavigationType()
  const last = useRef(pathname)
  useLayoutEffect(() => {
    if (last.current === pathname) return
    last.current = pathname
    if (hash || navType === 'POP' || pathname.startsWith('/app/setup')) return
    window.scrollTo(0, 0)
  }, [pathname, hash, navType])
  return null
}

function PageFallback() {
  return (
    <div className="px-4 lg:px-6 py-6 space-y-4" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-[120px] rounded-[16px]" />
      <Skeleton className="h-[320px] rounded-[16px]" />
    </div>
  )
}

/** Protected dashboard screen inside the app shell. */
function App_({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>
        <Suspense fallback={<PageFallback />}>{children}</Suspense>
      </AppShell>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/book" element={<PublicBooking />} />
              <Route path="/p/:slug" element={<PublicBooking />} />
              <Route path="/m/:bookingId" element={<ManageBooking />} />
              <Route path="/app" element={<App_><LiveOverview /></App_>} />
              <Route path="/app/setup" element={<RequireAuth><Suspense fallback={<PageFallback />}><SetupWizard /></Suspense></RequireAuth>} />
              <Route path="/app/calendar" element={<App_><LiveCalendar /></App_>} />
              <Route path="/app/bookings" element={<App_><BookingsPage /></App_>} />
              <Route path="/app/patients" element={<App_><PatientsPage /></App_>} />
              <Route path="/app/patients/:id" element={<App_><PatientProfile /></App_>} />
              <Route path="/app/sessions" element={<App_><LiveSessions /></App_>} />
              <Route path="/app/follow-ups" element={<App_><LiveFollowUps /></App_>} />
              <Route path="/app/earnings" element={<App_><LiveEarnings /></App_>} />
              <Route path="/app/payments" element={<Navigate to="/app/earnings" replace />} />
              <Route path="/app/your-page" element={<App_><LiveYourPage /></App_>} />
              <Route path="/app/insights" element={<App_><LiveInsights /></App_>} />
              <Route path="/app/settings" element={<App_><PracticeSettings /></App_>} />
              <Route path="/app/*" element={<App_><NotFound /></App_>} />
              <Route path="*" element={<NotFound standalone />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
