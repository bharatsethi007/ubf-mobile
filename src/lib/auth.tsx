import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

type AuthState = {
  session: Session | null
  staff: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

async function isStaffUser(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('staff_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return false
  return !!data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [staff, setStaff] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function apply(next: Session | null) {
      if (!next) {
        if (active) {
          setSession(null)
          setStaff(false)
        }
        return
      }
      const ok = await isStaffUser(next.user.id)
      if (!active) return
      if (ok) {
        setSession(next)
        setStaff(true)
      } else {
        setSession(null)
        setStaff(false)
        await supabase.auth.signOut()
      }
    }

    supabase.auth.getSession().then(async ({ data }) => {
      await apply(data.session)
      if (active) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      void apply(next)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw error
    const ok = data.user ? await isStaffUser(data.user.id) : false
    if (!ok) {
      await supabase.auth.signOut()
      throw new Error('This account is not a UBF staff account.')
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, staff, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
