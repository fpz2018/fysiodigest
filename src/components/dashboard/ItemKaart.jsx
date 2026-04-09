import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { relatieveDatum } from '../../hooks/useDigestItems'

const PRIO_STYLE = {
  rood:  { border: 'border-red-500',   bg: 'bg-red-50',    icon: '🔴' },
  geel:  { border: 'border-yellow-400', bg: 'bg-yellow-50', icon: '🟡' },
  grijs: { border: 'border-gray-300',  bg: 'bg-white',     icon: '⚪' },
}

export default function ItemKaart({ item, userId, onUpdate }) {
  const s = PRIO_STYLE[item.prioriteit] || PRIO_STYLE.grijs
  const [notitieOpen, setNotitieOpen] = useState(false)
  const [notitie, setNotitie] = useState('')
  const [notitieMeta, setNotitieMeta] = useState(null)
  const [notitieLaden, setNotitieLaden] = useState(false)

  const markeerGelezen = async () => {
    if (item.gelezen) return
    await supabase.from('digest_items').update({ gelezen: true })
      .eq('id', item.id).eq('user_id', userId)
    onUpdate(item.id, { gelezen: true })
  }

  const leesArtikel = () => {
    if (item.bron_url) window.open(item.bron_url, '_blank', 'noopener')
    markeerGelezen()
  }

  const toggleOpslaan = async () => {
    const nieuw = !item.opgeslagen
    await supabase.from('digest_items').update({ opgeslagen: nieuw })
      .eq('id', item.id).eq('user_id', userId)
    onUpdate(item.id, { opgeslagen: nieuw })
  }

  const openNotitie = async () => {
    setNotitieOpen(o => !o)
    markeerGelezen()
    if (notitieMeta !== null) return
    setNotitieLaden(true)
    const { data } = await supabase.from('actions_log')
      .select('notitie, created_at')
      .eq('user_id', userId).eq('item_id', item.id).eq('actie', 'notitie')
      .maybeSingle()
    if (data) { setNotitie(data.notitie || ''); setNotitieMeta(data.created_at) }
    else setNotitieMeta('')
    setNotitieLaden(false)
  }

  const slaNotitieOp = async () => {
    const { data } = await supabase.from('actions_log').upsert({
      user_id: userId, item_id: item.id, actie: 'notitie', notitie,
    }, { onConflict: 'user_id,item_id,actie' }).select().single()
    setNotitieMeta(data?.created_at || new Date().toISOString())
  }

  return (
    <div className={`rounded-xl shadow-sm border-l-4 ${s.border} ${s.bg} p-5`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{s.icon}</span>
          {item.categorie && (
            <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {item.categorie}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{relatieveDatum(item.gepubliceerd_op || item.verwerkt_op)}</span>
          {!item.gelezen && <span className="w-2 h-2 rounded-full bg-primary" title="Ongelezen" />}
        </div>
      </div>

      <h3 className="text-base font-semibold text-gray-900 mb-2">{item.headline || item.titel}</h3>
      {item.praktijkimpact && (
        <p className="text-sm text-gray-600 mb-4 whitespace-pre-line font-mono-safe">{item.praktijkimpact}</p>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {item.bron_url && (
          <button onClick={leesArtikel}
            className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50">
            🔗 Lees artikel
          </button>
        )}
        <button onClick={toggleOpslaan}
          className={`px-3 py-1.5 rounded border ${item.opgeslagen ? 'bg-primary text-white border-primary' : 'border-slate-200 hover:bg-slate-50'}`}>
          💾 {item.opgeslagen ? 'Opgeslagen' : 'Opslaan'}
        </button>
        <button onClick={openNotitie}
          className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50">
          📝 Notitie
        </button>
        {!item.gelezen && (
          <button onClick={markeerGelezen}
            className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50">
            ✓ Markeer gelezen
          </button>
        )}
      </div>

      {notitieOpen && (
        <div className="mt-4 border-t border-slate-200 pt-3">
          {notitieLaden ? (
            <p className="text-xs text-slate-500">Laden...</p>
          ) : (
            <>
              <textarea value={notitie} onChange={e => setNotitie(e.target.value)}
                rows={3} placeholder="Schrijf een notitie..."
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
              <div className="flex items-center justify-between mt-2">
                <button onClick={slaNotitieOp}
                  className="bg-primary text-white px-3 py-1.5 rounded text-xs font-medium hover:opacity-90">
                  Opslaan
                </button>
                {notitieMeta && (
                  <span className="text-xs text-slate-400">
                    Laatst bewerkt: {new Date(notitieMeta).toLocaleString('nl-NL')}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
