import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { LumidLogo } from '../../components/LumidLogo'

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)]" role="status" aria-label="Loading">
        <LumidLogo className="h-[20px] opacity-60 animate-pulse" />
      </div>
    )
  }
  if (auth.status === 'signed-out') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return <>{children}</>
}
