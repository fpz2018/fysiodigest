import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CATEGORIEEN, DEFAULT_VOORKEUREN, BELANG_OPTIES, DREMPEL_OPTIES } from '../../lib/categorieVoorkeuren'

export default function CategorieVoorkeuren({ userId, initial }) {
  const mergeDefaults = (v) => {
    const out = {}
    for (const c of CATEGORIEEN) out[c.key] = { ...DEFAULT_VOORKEUREN[c.key], ...(v?.[c.key] || {}) }
    return out
  }
  const [voorkeuren, setVoorkeuren] = useState(mergeDefaults(initial))
  const [bezig, setBezig] = useState(false)
  const [melding, setMelding] = useState('')

  const setVeld = (cat, veld, val) =>
    setVoorkeuren(v => ({ ...v, [cat]: { ...v[cat], [veld]: val } }))

  const opslaan = async () => {
    setBezig(true); setMelding('')
    const { error } = await supabase.from('profiles')
      .update({ categorie_voorkeuren: voorkeuren }).eq('user_id', userId)
    setBezig(false)
    setMelding(error ? 'Fout: ' + error.message : 'Opgeslagen.')
  }

  const reset = () => {
    setVoorkeuren({ ...DEFAULT_VOORKEUREN })
    setMelding('Standaardwaarden hersteld — klik Opslaan om te bewaren.')
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-navy mb-1">Mijn prioriteiten</h2>
      <p className="text-sm text-slate-500 mb-4">
        Bepaal per categorie hoe belangrijk het voor je is en vanaf welke prioriteit je items wil zien.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-4">Categorie</th>
              <th className="py-2 pr-4">Belang</th>
              <th className="py-2">Toon mij...</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIEEN.map(c => {
              const v = voorkeuren[c.key]
              return (
                <tr key={c.key} className="border-t border-slate-100">
                  <td className="py-2 pr-4 font-medium">{c.label}</td>
                  <td className="py-2 pr-4">
                    <div className="inline-flex rounded border border-slate-200 overflow-hidden">
                      {BELANG_OPTIES.map(b => (
                        <button key={b.value} type="button"
                          onClick={() => setVeld(c.key, 'belang', b.value)}
                          className={`px-3 py-1 text-xs ${v.belang === b.value ? 'bg-primary text-white' : 'bg-white hover:bg-slate-50'}`}>
                          <span className="font-mono mr-1">{b.dots}</span>{b.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="py-2">
                    <select value={v.drempel} onChange={e => setVeld(c.key, 'drempel', e.target.value)}
                      className="border border-slate-300 rounded px-2 py-1 text-sm">
                      {DREMPEL_OPTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button onClick={opslaan} disabled={bezig}
          className="bg-primary text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {bezig ? 'Opslaan...' : 'Opslaan'}
        </button>
        <button onClick={reset}
          className="px-4 py-2 rounded text-sm font-medium border border-slate-200 hover:bg-slate-50">
          Reset naar standaard
        </button>
        {melding && <span className="text-xs text-slate-600">{melding}</span>}
      </div>
    </section>
  )
}
