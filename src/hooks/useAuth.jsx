import { useEffect, useState, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({ user: null, loading: true, isAdmin: false })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const laadAdmin = async (u) => {
    if (!u) { setIsAdmin(false); return }
    const { data } = await supabase.from('profiles').select('is_admin').eq('user_id', u.id).maybeSingle()
    setIsAdmin(!!data?.is_admin)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      await laadAdmin(u)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      await laadAdmin(u)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
