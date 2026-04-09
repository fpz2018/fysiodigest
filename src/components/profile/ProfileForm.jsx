import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const SPECIALISATIES = [
  'Artrose', 'Sportfysiotherapie', 'Bekkenbodem', 'Manuele therapie',
  'Oncologie', 'Neurologie', 'Orthomoleculaire therapie', 'Geriatrie',
]
const VERZEKERAARS = ['Menzis', 'CZ', 'VGZ', 'Zilveren Kruis', 'ENO', 'ONVZ']

const STANDAARD_BRONNEN = [
  { naam: 'KNGF Nieuws', url: 'https://www.kngf.nl/rss', categorie: 'richtlijnen' },
  { naam: 'NZa Nieuws', url: 'https://www.nza.nl/rss', categorie: 'regelgeving' },
  { naam: 'PubMed Fysiotherapie', url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=physiotherapy', categorie: 'wetenschap' },
  { naam: 'FysioPraxis', url: 'https://www.fysiopraxis.nl/rss', categorie: 'vakbladen' },
]

export default function ProfileForm({ initial = null }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stap, setStap] = useState(1)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  const [naam, setNaam] = useState(initial?.naam || '')
  const [praktijk, setPraktijk] = useState(initial?.praktijk || '')
  const [praktijkvorm, setPraktijkvorm] = useState(initial?.praktijkvorm || 'zzp')
  const [specialisaties, setSpecialisaties] = useState(initial?.specialisaties || [])
  const [overigSpec, setOverigSpec] = useState('')
  const [verzekeraars, setVerzekeraars] = useState(initial?.zorgverzekeraars || [])
  const [overigVerz, setOverigVerz] = useState('')
  const [interesse, setInteresse] = useState(initial?.interessegebieden || '')
  const [output, setOutput] = useState(initial?.output_formaat || 'bullet')
  const [bronnen, setBronnen] = useState(STANDAARD_BRONNEN.map(b => ({ ...b, actief: true })))
  const [extraNaam, setExtraNaam] = useState('')
  const [extraUrl, setExtraUrl] = useState('')

  const toggle = (arr, set, val) => set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])

  const valideerStap = () => {
    if (stap === 1 && !naam.trim()) return 'Vul je naam in.'
    return ''
  }

  const volgende = () => {
    const v = valideerStap()
    if (v) { setFout(v); return }
    setFout(''); setStap(stap + 1)
  }
  const vorige = () => { setFout(''); setStap(stap - 1) }

  const opslaan = async () => {
    setFout(''); setBezig(true)
    const finalSpecs = [...specialisaties, ...(overigSpec.trim() ? [overigSpec.trim()] : [])]
    const finalVerz = [...verzekeraars, ...(overigVerz.trim() ? [overigVerz.trim()] : [])]

    const { error: pErr } = await supabase.from('profiles').upsert({
      user_id: user.id,
      naam, praktijk, praktijkvorm,
      specialisaties: finalSpecs,
      zorgverzekeraars: finalVerz,
      interessegebieden: interesse,
      output_formaat: output,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (pErr) { setFout('Opslaan profiel mislukt: ' + pErr.message); setBezig(false); return }

    const actieveBronnen = bronnen.filter(b => b.actief).map(b => ({
      user_id: user.id, naam: b.naam, url: b.url, categorie: b.categorie, actief: true,
    }))
    if (extraNaam.trim() && extraUrl.trim()) {
      actieveBronnen.push({ user_id: user.id, naam: extraNaam.trim(), url: extraUrl.trim(), categorie: 'overig', actief: true })
    }
    if (actieveBronnen.length) {
      const { error: bErr } = await supabase.from('rss_sources').insert(actieveBronnen)
      if (bErr) { setFout('Opslaan bronnen mislukt: ' + bErr.message); setBezig(false); return }
    }
    setBezig(false)
    navigate('/')
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 w-full max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-navy">Profiel instellen</h1>
        <span className="text-sm text-slate-500">Stap {stap} van 5</span>
      </div>
      <div className="h-1 bg-slate-100 rounded mb-6">
        <div className="h-1 bg-primary rounded transition-all" style={{ width: `${(stap/5)*100}%` }} />
      </div>

      {fout && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{fout}</div>}

      {stap === 1 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Basisgegevens</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Naam *</label>
            <input value={naam} onChange={e => setNaam(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Praktijknaam</label>
            <input value={praktijk} onChange={e => setPraktijk(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Praktijkvorm</label>
            <select value={praktijkvorm} onChange={e => setPraktijkvorm(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2">
              <option value="zzp">ZZP</option>
              <option value="groepspraktijk">Groepspraktijk</option>
              <option value="msb">MSB</option>
              <option value="loondienst">Loondienst</option>
            </select>
          </div>
        </div>
      )}

      {stap === 2 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Specialisaties</h2>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALISATIES.map(s => (
              <label key={s} className="flex items-center gap-2 p-2 border border-slate-200 rounded hover:bg-slate-50">
                <input type="checkbox" checked={specialisaties.includes(s)}
                  onChange={() => toggle(specialisaties, setSpecialisaties, s)} />
                <span className="text-sm">{s}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Overig</label>
            <input value={overigSpec} onChange={e => setOverigSpec(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2" placeholder="Eigen specialisatie" />
          </div>
        </div>
      )}

      {stap === 3 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Zorgverzekeraars</h2>
          <div className="grid grid-cols-2 gap-2">
            {VERZEKERAARS.map(v => (
              <label key={v} className="flex items-center gap-2 p-2 border border-slate-200 rounded hover:bg-slate-50">
                <input type="checkbox" checked={verzekeraars.includes(v)}
                  onChange={() => toggle(verzekeraars, setVerzekeraars, v)} />
                <span className="text-sm">{v}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Overig</label>
            <input value={overigVerz} onChange={e => setOverigVerz(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2" placeholder="Andere verzekeraar" />
          </div>
        </div>
      )}

      {stap === 4 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Voorkeuren</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Interessegebieden</label>
            <textarea value={interesse} onChange={e => setInteresse(e.target.value)} rows={3}
              placeholder="bijv. artrose, voeding, bewegen"
              className="w-full border border-slate-300 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Gewenste outputformaat</label>
            <div className="space-y-2">
              {[
                ['bullet', 'Bullet points'],
                ['proza', 'Proza'],
                ['soap', 'SOAP'],
                ['tabel', 'Tabel'],
              ].map(([val, label]) => (
                <label key={val} className="flex items-center gap-2">
                  <input type="radio" name="output" value={val} checked={output === val}
                    onChange={e => setOutput(e.target.value)} />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {stap === 5 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Bronnen</h2>
          <p className="text-sm text-slate-600">Selecteer welke bronnen FysioDigest voor je moet monitoren.</p>
          <div className="space-y-2">
            {bronnen.map((b, i) => (
              <label key={b.url} className="flex items-center gap-3 p-3 border border-slate-200 rounded">
                <input type="checkbox" checked={b.actief}
                  onChange={() => setBronnen(bronnen.map((x, j) => j === i ? { ...x, actief: !x.actief } : x))} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{b.naam}</div>
                  <div className="text-xs text-slate-500">{b.url}</div>
                </div>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded">{b.categorie}</span>
              </label>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm font-medium mb-2">Eigen bron toevoegen (optioneel)</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={extraNaam} onChange={e => setExtraNaam(e.target.value)}
                placeholder="Naam" className="border border-slate-300 rounded px-3 py-2" />
              <input value={extraUrl} onChange={e => setExtraUrl(e.target.value)}
                placeholder="RSS URL" className="border border-slate-300 rounded px-3 py-2" />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button onClick={vorige} disabled={stap === 1}
          className="px-4 py-2 text-slate-600 disabled:opacity-30">Vorige</button>
        {stap < 5 ? (
          <button onClick={volgende} className="bg-primary text-white px-6 py-2 rounded font-medium hover:opacity-90">
            Volgende
          </button>
        ) : (
          <button onClick={opslaan} disabled={bezig}
            className="bg-primary text-white px-6 py-2 rounded font-medium hover:opacity-90 disabled:opacity-50">
            {bezig ? 'Opslaan...' : 'Voltooien'}
          </button>
        )}
      </div>
    </div>
  )
}
