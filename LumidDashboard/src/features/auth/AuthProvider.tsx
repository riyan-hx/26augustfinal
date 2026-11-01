import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isDemoMode } from '../../lib/env'
import { supabaseClient } from '../../lib/supabase'
import { queryClient } from '../../lib/query'

interface AuthState {
  status: 'loading' | 'signed-in' | 'signed-out'
  userId: string | null
  email: string | null
  isDemo: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

const DEMO_STATE: AuthState = {
  status: 'signed-in',
  userId: 'demo',
  email: 'demo@lumidai.in',
  isDemo: true,
  signOut: async () => {},
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!isDemoMode)

  useEffect(() => {
    if (!supabaseClient) return
    const client = supabaseClient
    client.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) queryClient.clear() // never show one account's cache to the next
    })
    const onExpired = () => { void client.auth.signOut() }
    window.addEventListener('lumid:signed-out', onExpired)
    return () => {
      sub.subscription.unsubscribe()
      window.removeEventListener('lumid:signed-out', onExpired)
    }
  }, [])

  const value = useMemo<AuthState>(() => {
    if (isDemoMode) return DEMO_STATE
    return {
      status: loading ? 'loading' : session ? 'signed-in' : 'signed-out',
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
      isDemo: false,
      signOut: async () => {
        await supabaseClient?.auth.signOut()
        queryClient.clear()
      },
    }
  }, [loading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
