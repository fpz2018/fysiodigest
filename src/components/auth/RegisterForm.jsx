import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function RegisterForm() {
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState('')
  const [bezig, setBezig] = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setFout('')
    if (!email || wachtwoord.length < 6) {
      setFout('Vul een geldig e-mailadres en wachtwoord (min. 6 tekens) in.')
      return
    }
    setBezig(true)
    const { error } = await supabase.auth.signUp({ email, password: wachtwoord })
    setBezig(false)
    if (error) { setFout('Registratie mislukt: ' + error.message); return }
    navigate('/onboarding')
  }

  return (
    <form onSubmit={submit} className="bg-white p-8 rounded-lg shadow-sm w-full max-w-md space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Account aanmaken</h1>
      {fout && <div className="bg-red-50 text-red-700 text-sm p-3 rounded">{fout}</div>}
      <div>
        <label className="block text-sm font-medium mb-1">E-mail</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Wachtwoord</label>
        <input type="password" value={wachtwoord} onChange={e => setWachtwoord(e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
        <p className="text-xs text-slate-500 mt-1">Minimaal 6 tekens.</p>
      </div>
      <button disabled={bezig} className="w-full bg-primary text-white py-2.5 rounded font-medium hover:opacity-90 disabled:opacity-50">
        {bezig ? 'Bezig...' : 'Registreren'}
      </button>
      <p className="text-sm text-slate-600 text-center">
        Al een account? <Link to="/login" className="text-primary hover:underline">Inloggen</Link>
      </p>
    </form>
  )
}
