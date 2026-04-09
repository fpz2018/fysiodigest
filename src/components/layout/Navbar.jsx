import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function Navbar() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [adminOpen, setAdminOpen] = useState(false)
  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }
  return (
    <header className="bg-navy text-white">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg">FysioDigest</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="hover:underline">Dashboard</Link>
          <Link to="/instellingen" className="hover:underline">Instellingen</Link>
          {isAdmin && (
            <div className="relative">
              <button onClick={() => setAdminOpen(o => !o)} className="hover:underline">Admin ▾</button>
              {adminOpen && (
                <div className="absolute right-0 mt-2 bg-white text-navy rounded shadow-lg py-1 w-56 z-10">
                  <Link to="/admin/uploaden" onClick={() => setAdminOpen(false)}
                    className="block px-4 py-2 hover:bg-slate-100">Document uploaden</Link>
                  <Link to="/admin/documenten" onClick={() => setAdminOpen(false)}
                    className="block px-4 py-2 hover:bg-slate-100">Documentenoverzicht</Link>
                </div>
              )}
            </div>
          )}
          <button onClick={logout} className="bg-primary px-3 py-1.5 rounded hover:opacity-90">Uitloggen</button>
        </nav>
      </div>
    </header>
  )
}
