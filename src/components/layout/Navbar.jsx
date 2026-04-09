import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Navbar() {
  const navigate = useNavigate()
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
          <button onClick={logout} className="bg-primary px-3 py-1.5 rounded hover:opacity-90">Uitloggen</button>
        </nav>
      </div>
    </header>
  )
}
