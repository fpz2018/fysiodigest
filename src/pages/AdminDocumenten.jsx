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
    setRssBezig(true); setRssMelding('Bezig...')
    let totaal = 0
    let offset = 0
    let batch = 0
    const maxBatches = 30
    try {
      while (batch < maxBatches) {
        batch++
        const res = await fetch(`/.netlify/functions/verwerk-rss?max=3&bron_offset=${offset}`)
        const tekst = await res.text()
        let data = {}
        try { data = JSON.parse(tekst) } catch { /* leeg */ }
        if (!res.ok || !data.success) {
          setRssMelding(`Fout (${res.status}) in batch ${batch} (offset ${offset}): ${data.error || tekst.slice(0, 200) || 'geen response'}. Totaal: ${totaal}. Opnieuw proberen met hogere offset...`)
          offset += 1
          if (offset > 50) return
          continue
        }
        totaal += data.nieuwe_items || 0
        setRssMelding(`Batch ${batch}: +${data.nieuwe_items} items (totaal ${totaal}, bron ${offset}/${data.totaal_bronnen})...`)
        if (data.volgende_bron_offset === null || data.volgende_bron_offset === undefined) break
        offset = data.volgende_bron_offset
      }
      setRssMelding(`Klaar. ${totaal} nieuwe items verwerkt in ${batch} batches.`)
    } catch (e) {
      setRssMelding(`Fout: ${e.message}. Totaal: ${totaal}`)
    } finally { setRssBezig(false) }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-navy">Documentenoverzicht</h1>
        <div className="flex gap-2">
          <button onClick={async () => {
            if (!confirm('Alle bestaande items opnieuw verwerken met huidige output_formaat?')) return
            setRssMelding('Herverwerken...')
            let offset = 0, totaal = 0, batch = 0
            try {
              while (batch < 30) {
                batch++
                const res = await fetch(`/.netlify/functions/herverwerk-items?max=5&offset=${offset}`)
                const data = await res.json()
                if (!data.success) { setRssMelding('Fout: ' + (data.error || 'onbekend')); return }
                totaal += data.bijgewerkt || 0
                setRssMelding(`Batch ${batch}: ${totaal} items bijgewerkt (van ${data.totaal})...`)
                if (data.volgende_offset === null || data.volgende_offset === undefined) break
                offset = data.volgende_offset
              }
              setRssMelding(`Klaar. ${totaal} items herverwerkt.`)
            } catch (e) { setRssMelding('Fout: ' + e.message) }
          }}
            className="bg-slate-600 text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90">
            Herverwerk items
          </button>
          <button onClick={triggerRss} disabled={rssBezig}
            className="bg-navy text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {rssBezig ? 'Bezig...' : 'RSS nu verwerken'}
          </button>
          <button onClick={async () => {
            setRssMelding('Digest versturen...')
            try {
              const res = await fetch('/.netlify/functions/verstuur-digest')
              const data = await res.json()
              if (data.success) setRssMelding(`Digest verstuurd naar ${data.verstuurd} gebruiker(s).`)
              else setRssMelding('Fout: ' + (data.error || 'onbekend'))
            } catch (e) { setRssMelding('Fout: ' + e.message) }
          }}
            className="bg-navy text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90">
            Digest nu versturen
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
