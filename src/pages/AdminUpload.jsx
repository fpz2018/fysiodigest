import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  SPECIALISATIE_GROEPEN, VERZEKERAAR_GROEPEN, PRAKTIJKVORMEN,
} from '../components/profile/ProfileForm'

const PRIORITEITEN = [
  { value: 'rood', label: '🔴 Actie vereist' },
  { value: 'geel', label: '🟡 Relevant' },
  { value: 'grijs', label: '⚪ Goed om te weten' },
]

export default function AdminUpload() {
  const { user } = useAuth()
  const [type, setType] = useState('pdf')
  const [titel, setTitel] = useState('')
  const [prioriteit, setPrioriteit] = useState('geel')
  const [file, setFile] = useState(null)
  const [tekst, setTekst] = useState('')
  const [tagSpecs, setTagSpecs] = useState([])
  const [tagPrakt, setTagPrakt] = useState([])
  const [tagVerz, setTagVerz] = useState([])
  const [bezig, setBezig] = useState(false)
  const [melding, setMelding] = useState(null)

  const toggle = (arr, set, val) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])

  const allesGroep = (arr, set, allItems) => {
    if (allItems.every(x => arr.includes(x))) set(arr.filter(x => !allItems.includes(x)))
    else set([...new Set([...arr, ...allItems])])
  }

  const submit = async (e) => {
    e.preventDefault()
    setMelding(null)
    if (!titel.trim()) { setMelding({ type: 'fout', tekst: 'Titel is verplicht.' }); return }
    if (type === 'pdf' && !file) { setMelding({ type: 'fout', tekst: 'Kies een PDF-bestand.' }); return }
    if (type === 'tekst' && !tekst.trim()) { setMelding({ type: 'fout', tekst: 'Plak de tekst.' }); return }

    setBezig(true)
    try {
      let bestandsnaam = null
      let bestand_url = null

      if (type === 'pdf') {
        bestandsnaam = `${Date.now()}-${file.name}`
        const { error: upErr } = await supabase.storage
          .from('admin-documents').upload(bestandsnaam, file, { contentType: 'application/pdf' })
        if (upErr) throw upErr
        bestand_url = bestandsnaam
      }

      const { data: doc, error: insErr } = await supabase.from('admin_documents').insert({
        titel, type, prioriteit,
        bestandsnaam, bestand_url,
        tekst_inhoud: type === 'tekst' ? tekst : null,
        tags_specialisaties: tagSpecs,
        tags_praktijkvorm: tagPrakt,
        tags_verzekeraars: tagVerz,
        uploaded_by: user.id,
      }).select().single()
      if (insErr) throw insErr

      // Verwerken via Netlify function
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      const res = await fetch('/.netlify/functions/verwerk-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ document_id: doc.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verwerken mislukt')

      setMelding({ type: 'ok', tekst: `Verwerkt. ${data.bereikt} gebruiker(s) bereikt.` })
      setTitel(''); setFile(null); setTekst(''); setTagSpecs([]); setTagPrakt([]); setTagVerz([])
    } catch (e) {
      setMelding({ type: 'fout', tekst: e.message })
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-2xl font-semibold text-navy mb-6">Document uploaden</h1>

      {melding && (
        <div className={`p-3 rounded mb-4 text-sm ${melding.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {melding.tekst}
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Documenttype</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" checked={type === 'pdf'} onChange={() => setType('pdf')} /> PDF uploaden
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={type === 'tekst'} onChange={() => setType('tekst')} /> Tekst plakken
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Titel *</label>
          <input value={titel} onChange={e => setTitel(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2" />
        </div>

        {type === 'pdf' ? (
          <div>
            <label className="block text-sm font-medium mb-1">PDF-bestand</label>
            <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">Tekst</label>
            <textarea rows={10} value={tekst} onChange={e => setTekst(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2" />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Prioriteit</label>
          <select value={prioriteit} onChange={e => setPrioriteit(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2">
            {PRIORITEITEN.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <fieldset className="border border-slate-200 rounded p-4">
          <legend className="text-sm font-semibold px-2">Specialisaties</legend>
          <p className="text-xs text-slate-500 mb-3">Leeg laten = relevant voor iedereen op deze dimensie.</p>
          {SPECIALISATIE_GROEPEN.map(g => (
            <div key={g.titel} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-navy">{g.titel}</h4>
                <button type="button" className="text-xs text-primary"
                  onClick={() => allesGroep(tagSpecs, setTagSpecs, g.items)}>
                  Iedereen
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {g.items.map(s => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={tagSpecs.includes(s)}
                      onChange={() => toggle(tagSpecs, setTagSpecs, s)} />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>

        <fieldset className="border border-slate-200 rounded p-4">
          <legend className="text-sm font-semibold px-2">Praktijkvorm</legend>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">Leeg = iedereen</span>
            <button type="button" className="text-xs text-primary"
              onClick={() => allesGroep(tagPrakt, setTagPrakt, PRAKTIJKVORMEN.map(p => p.value))}>
              Iedereen
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1">
            {PRAKTIJKVORMEN.map(p => (
              <label key={p.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={tagPrakt.includes(p.value)}
                  onChange={() => toggle(tagPrakt, setTagPrakt, p.value)} />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="border border-slate-200 rounded p-4">
          <legend className="text-sm font-semibold px-2">Zorgverzekeraars</legend>
          <p className="text-xs text-slate-500 mb-3">Leeg = iedereen</p>
          {VERZEKERAAR_GROEPEN.map(g => (
            <div key={g.titel} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-navy">{g.titel}</h4>
                <button type="button" className="text-xs text-primary"
                  onClick={() => allesGroep(tagVerz, setTagVerz, g.items)}>
                  Iedereen
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {g.items.map(v => (
                  <label key={v} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={tagVerz.includes(v)}
                      onChange={() => toggle(tagVerz, setTagVerz, v)} />
                    {v}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>

        <button disabled={bezig}
          className="bg-primary text-white px-6 py-2.5 rounded font-medium hover:opacity-90 disabled:opacity-50">
          {bezig ? 'Bezig met verwerken...' : 'Uploaden & Verwerken'}
        </button>
      </form>
    </div>
  )
}
