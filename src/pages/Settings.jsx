import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import ProfileForm from '../components/profile/ProfileForm'

export default function Settings() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(undefined)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [user])

  if (profile === undefined) return <div className="text-slate-500">Laden...</div>
  return <ProfileForm initial={profile} />
}
