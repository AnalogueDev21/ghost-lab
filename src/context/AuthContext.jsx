import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toAuthPassword } from '../lib/pin'

const AuthContext = createContext(null)

// Staff PIN-login pattern:
// Each staff member gets a real Supabase Auth user under the hood, with
// email = `${name_en.toLowerCase()}@ghostlab-staff.com` and password = their PIN.
// This lets Supabase Auth handle the hashing/session (no need to manage
// pin_hash ourselves) while the UI only ever shows a PIN pad, not an email form.
// See /supabase/seed.sql for how these auth users + matching `staff` rows are created.

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [staff, setStaff] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadStaff(data.session.user.id)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) loadStaff(newSession.user.id)
      else { setStaff(null); setLoading(false) }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadStaff(authUserId) {
    const { data, error } = await supabase
      .from('staff')
      .select('*, branches:primary_branch(*)')
      .eq('auth_user_id', authUserId)
      .single()
    if (error) console.error('[Ghost Lab] Failed to load staff row:', error)
    setStaff(data || null)
    setLoading(false)
  }

  async function loginWithPin(nameEn, pin) {
    const email = `${nameEn.toLowerCase()}@ghostlab-staff.com`
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: toAuthPassword(pin) })
    if (error) return { ok: false, message: 'PIN ไม่ถูกต้อง' }
    return { ok: true }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  const value = { session, staff, loading, loginWithPin, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
