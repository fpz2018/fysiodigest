import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { user } = useAuth()
  const [naam, setNaam] = useState('')

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('naam').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setNaam(data?.naam || ''))
  }, [user])

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-2xl font-semibold text-navy mb-2">Welkom{naam ? `, ${naam}` : ''}</h1>
      <p className="text-slate-600 mb-6">Je eerste digest wordt volgende maandag verstuurd.</p>
      <Link to="/instellingen" className="inline-block bg-primary text-white px-5 py-2 rounded font-medium hover:opacity-90">
        Profiel bewerken
      </Link>
    </div>
  )
}
