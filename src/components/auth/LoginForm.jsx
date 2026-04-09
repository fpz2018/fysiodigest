import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState('')
  const [bezig, setBezig] = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setFout('')
    if (!email || !wachtwoord) { setFout('Vul e-mail en wachtwoord in.'); return }
    setBezig(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord })
    setBezig(false)
    if (error) { setFout('Inloggen mislukt: ' + error.message); return }
    navigate('/')
  }

  return (
    <form onSubmit={submit} className="bg-white p-8 rounded-lg shadow-sm w-full max-w-md space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Inloggen</h1>
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
      </div>
      <button disabled={bezig} className="w-full bg-primary text-white py-2.5 rounded font-medium hover:opacity-90 disabled:opacity-50">
        {bezig ? 'Bezig...' : 'Inloggen'}
      </button>
      <p className="text-sm text-slate-600 text-center">
        Nog geen account? <Link to="/register" className="text-primary hover:underline">Registreer</Link>
      </p>
    </form>
  )
}
