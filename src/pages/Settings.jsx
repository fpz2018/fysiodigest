import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import ProfileForm from '../components/profile/ProfileForm'

export default function Settings() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(undefined)
  const [fout, setFout] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) { setProfile(null); return }
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) { setFout(error.message); setProfile(null); return }
        setProfile(data || null)
      })
  }, [user, authLoading])

  if (authLoading || profile === undefined) {
    return <div className="text-slate-500">Laden...</div>
  }
  if (fout) return <div className="text-red-600 text-sm">Fout: {fout}</div>
  return <ProfileForm initial={profile} />
}
