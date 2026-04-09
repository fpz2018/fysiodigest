import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import ProfileForm from '../components/profile/ProfileForm'

export default function Settings() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(undefined)
  const [fout, setFout] = useState('')
  const [testmelding, setTestmelding] = useState('')
  const [testBezig, setTestBezig] = useState(false)

  const laad = async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
    if (error) { setFout(error.message); setProfile(null); return }
    setProfile(data || null)
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) { setProfile(null); return }
    laad()
  }, [user, authLoading])

  const updateEmailInstelling = async (patch) => {
    setProfile(p => ({ ...p, ...patch }))
    await supabase.from('profiles').update(patch).eq('user_id', user.id)
  }

  const stuurTestmail = async () => {
    setTestBezig(true); setTestmelding('Bezig met versturen...')
    try {
      const res = await fetch(`/.netlify/functions/verstuur-digest?user_id=${user.id}&test=true`)
      const data = await res.json()
      if (data.success && data.verstuurd > 0) setTestmelding('Testmail verstuurd! Check je inbox.')
      else if (data.success) setTestmelding('Geen items in huidige week — geen e-mail verstuurd.')
      else setTestmelding('Fout: ' + (data.error || 'onbekend'))
    } catch (e) {
      setTestmelding('Fout: ' + e.message)
    } finally { setTestBezig(false) }
  }

  if (authLoading || profile === undefined) return <div className="text-slate-500">Laden...</div>
  if (fout) return <div className="text-red-600 text-sm">Fout: {fout}</div>

  return (
    <div className="space-y-6">
      {profile && (
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-navy mb-4">E-mail digest</h2>
          <label className="flex items-center gap-3 mb-4">
            <input type="checkbox" checked={!!profile.email_digest}
              onChange={e => updateEmailInstelling({ email_digest: e.target.checked })} />
            <span className="text-sm">Wekelijkse digest ontvangen</span>
          </label>
          {profile.email_digest && (
            <div className="space-y-4 pl-7">
              <div>
                <label className="block text-sm font-medium mb-1">Verzenddag</label>
                <select value={profile.email_dag || 'maandag'}
                  onChange={e => updateEmailInstelling({ email_dag: e.target.value })}
                  className="border border-slate-300 rounded px-3 py-2 text-sm">
                  <option value="maandag">Maandag</option>
                  <option value="dinsdag">Dinsdag</option>
                  <option value="woensdag">Woensdag</option>
                </select>
              </div>
              <div>
                <button onClick={stuurTestmail} disabled={testBezig}
                  className="bg-primary text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  Stuur testmail
                </button>
                {testmelding && <p className="text-xs text-slate-600 mt-2">{testmelding}</p>}
              </div>
            </div>
          )}
        </section>
      )}

      <ProfileForm initial={profile} />
    </div>
  )
}
