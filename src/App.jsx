import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Register from './pages/Register'
import ProfileSetup from './pages/ProfileSetup'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Layout from './components/layout/Layout'

function ProtectedRoute({ children, requireProfile = true }) {
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState(undefined)
  const location = useLocation()

  useEffect(() => {
    if (!user) { setProfile(null); return }
    supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [user])

  if (loading || (user && profile === undefined)) {
    return <div className="p-8 text-slate-500">Laden...</div>
  }
  if (!user) return <Navigate to="/login" replace />
  if (requireProfile && !profile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={
          <ProtectedRoute requireProfile={false}><ProfileSetup /></ProtectedRoute>
        } />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/instellingen" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
