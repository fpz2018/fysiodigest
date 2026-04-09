import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const PRIO_LABEL = { rood: '🔴', geel: '🟡', grijs: '⚪' }

export default function AdminDocumenten() {
  const { user } = useAuth()
  const [docs, setDocs] = useState([])
  const [bereik, setBereik] = useState({})
  const [bezig, setBezig] = useState(null)
  const [rssBezig, setRssBezig] = useState(false)
  const [rssMelding, setRssMelding] = useState('')

  const laad = async () => {
    const { data } = await supabase.from('admin_documents').select('*').order('created_at', { ascending: false })
    setDocs(data || [])
    // Bereik per document tellen
    const counts = {}
    for (const d of data || []) {
      const { count } = await supabase.from('digest_items')
        .select('id', { count: 'exact', head: true })
        .eq('titel', d.titel).is('source_id', null)
      counts[d.id] = count || 0
    }
    setBereik(counts)
  }

  useEffect(() => { laad() }, [])

  const opnieuw = async (id) => {
    setBezig(id)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/verwerk-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.session?.access_token}` },
        body: JSON.stringify({ document_id: id }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await laad()
    } catch (e) {
      alert('Mislukt: ' + e.message)
    } finally { setBezig(null) }
  }

  const triggerRss = async () => {
    setRssBezig(true); setRssMelding('')
    try {
      const res = await fetch('/.netlify/functions/verwerk-rss')
      const data = await res.json()
      if (data.success) setRssMelding(`Klaar. ${data.nieuwe_items} nieuwe items voor ${data.gebruikers} gebruiker(s).`)
      else setRssMelding('Fout: ' + (data.error || 'onbekend'))
    } catch (e) {
      setRssMelding('Fout: ' + e.message)
    } finally { setRssBezig(false) }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-navy">Documentenoverzicht</h1>
        <div className="flex gap-2">
          <button onClick={triggerRss} disabled={rssBezig}
            className="bg-navy text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {rssBezig ? 'Bezig...' : 'RSS nu verwerken'}
          </button>
          <Link to="/admin/uploaden" className="bg-primary text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90">
            + Nieuw document
          </Link>
        </div>
      </div>
      {rssMelding && <div className="mb-4 p-3 rounded bg-slate-50 text-sm text-slate-700">{rssMelding}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-2">Titel</th>
              <th className="p-2">Type</th>
              <th className="p-2">Prio</th>
              <th className="p-2">Tags</th>
              <th className="p-2">Verwerkt</th>
              <th className="p-2">Bereik</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {docs.map(d => {
              const tagCount = (d.tags_specialisaties?.length || 0) + (d.tags_praktijkvorm?.length || 0) + (d.tags_verzekeraars?.length || 0)
              return (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="p-2 font-medium">{d.titel}</td>
                  <td className="p-2">{d.type}</td>
                  <td className="p-2">{PRIO_LABEL[d.prioriteit]}</td>
                  <td className="p-2 text-xs text-slate-500">{tagCount} tags</td>
                  <td className="p-2 text-xs">
                    {d.verwerkt ? `✓ ${new Date(d.verwerkt_op).toLocaleDateString('nl-NL')}` : '—'}
                  </td>
                  <td className="p-2">{bereik[d.id] ?? '…'}</td>
                  <td className="p-2">
                    <button onClick={() => opnieuw(d.id)} disabled={bezig === d.id}
                      className="text-xs text-primary hover:underline disabled:opacity-50">
                      {bezig === d.id ? 'Bezig...' : 'Opnieuw verwerken'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {docs.length === 0 && (
              <tr><td colSpan="7" className="p-4 text-center text-slate-500">Nog geen documenten</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
