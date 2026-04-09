import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useDigestItems } from '../hooks/useDigestItems'
import ItemKaart from '../components/dashboard/ItemKaart'
import { supabase } from '../lib/supabase'

const CATEGORIEEN = [
  'alle', 'richtlijnen', 'regelgeving', 'wetenschap', 'vakbladen',
  'verzekeraars', 'opleidingen', 'ondernemen', 'subsidies', 'overig',
]

const CAT_LABEL = {
  alle: 'Alle categorieën',
  richtlijnen: 'Richtlijnen', regelgeving: 'Regelgeving', wetenschap: 'Wetenschap',
  vakbladen: 'Vakbladen', verzekeraars: 'Verzekeraars', opleidingen: 'Opleidingen',
  ondernemen: 'Ondernemen', subsidies: 'Subsidies', overig: 'Overig',
}

export default function Dashboard() {
  const { user } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const {
    alleItems, items, statistieken, weekRange, loading, filters, setFilters, herlaad, updateItem,
  } = useDigestItems(user?.id, weekOffset)

  const [rssBezig, setRssBezig] = useState(false)
  const [outputFormaat, setOutputFormaat] = useState('proza')

  useEffect(() => {
    if (!user?.id) return
    supabase.from('profiles').select('output_formaat').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setOutputFormaat(data?.output_formaat || 'proza'))
  }, [user?.id])

  const triggerRss = async () => {
    setRssBezig(true)
    try {
      await fetch(`/.netlify/functions/verwerk-rss?user_id=${user.id}&max=10`)
      await herlaad()
    } finally { setRssBezig(false) }
  }

  const weekLabel = `Week ${weekRange.weekNummer} — ${weekRange.start.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} t/m ${weekRange.eind.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`

  const stat = (key, label, icon, colorClass) => (
    <button
      onClick={() => setFilters(f => ({ ...f, prioriteit: f.prioriteit === key ? 'alle' : key }))}
      className={`flex-1 min-w-[140px] p-3 rounded-lg border text-left transition ${filters.prioriteit === key ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
      <div className={`text-2xl font-semibold ${colorClass}`}>{icon} {statistieken[key] ?? statistieken.ongelezen}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </button>
  )

  return (
    <div className="space-y-6">
      {/* Statistiekbalk */}
      <div className="flex flex-wrap gap-3">
        {stat('rood', 'Actie vereist', '🔴', 'text-red-600')}
        {stat('geel', 'Relevant', '🟡', 'text-yellow-600')}
        {stat('grijs', 'Ter info', '⚪', 'text-slate-600')}
        <button
          onClick={() => setFilters(f => ({ ...f, status: f.status === 'ongelezen' ? 'alle' : 'ongelezen' }))}
          className={`flex-1 min-w-[140px] p-3 rounded-lg border text-left transition ${filters.status === 'ongelezen' ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
          <div className="text-2xl font-semibold text-primary">● {statistieken.ongelezen}</div>
          <div className="text-xs text-slate-500 mt-0.5">Ongelezen</div>
        </button>
      </div>

      {/* Weeknavigatie */}
      <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200">
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="px-3 py-1 text-sm hover:bg-slate-100 rounded">← Vorige week</button>
        <div className="text-sm font-medium text-navy">{weekLabel}</div>
        <button onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0}
          className="px-3 py-1 text-sm hover:bg-slate-100 rounded disabled:opacity-30">Volgende week →</button>
      </div>

      {/* Filterbar */}
      <div className="sticky top-0 z-10 bg-slate-50 py-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {['alle', 'rood', 'geel', 'grijs'].map(p => (
            <button key={p} onClick={() => setFilters(f => ({ ...f, prioriteit: p }))}
              className={`px-3 py-1.5 rounded text-xs font-medium border ${filters.prioriteit === p ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
              {p === 'alle' ? 'Alle' : p === 'rood' ? '🔴 Actie vereist' : p === 'geel' ? '🟡 Relevant' : '⚪ Ter info'}
            </button>
          ))}
          {['alle', 'ongelezen', 'opgeslagen'].map(s => (
            <button key={s} onClick={() => setFilters(f => ({ ...f, status: s }))}
              className={`px-3 py-1.5 rounded text-xs font-medium border ${filters.status === s ? 'bg-navy text-white border-navy' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
              {s === 'alle' ? 'Alle status' : s === 'ongelezen' ? 'Ongelezen' : 'Opgeslagen'}
            </button>
          ))}
          <select value={filters.categorie} onChange={e => setFilters(f => ({ ...f, categorie: e.target.value }))}
            className="px-3 py-1.5 rounded text-xs border border-slate-200 bg-white">
            {CATEGORIEEN.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
          </select>
          <input value={filters.zoekterm} onChange={e => setFilters(f => ({ ...f, zoekterm: e.target.value }))}
            placeholder="Zoeken..."
            className="flex-1 min-w-[180px] px-3 py-1.5 rounded text-xs border border-slate-200 bg-white" />
        </div>
      </div>

      {/* Items */}
      {loading ? (
        <div className="text-slate-500 text-sm">Laden...</div>
      ) : alleItems.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-slate-600 mb-4">
            Je eerste digest wordt aangemaakt zodra je bronnen zijn verwerkt.
          </p>
          <button onClick={triggerRss} disabled={rssBezig}
            className="bg-primary text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {rssBezig ? 'Bezig...' : 'RSS nu verwerken'}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center text-slate-600">
          Geen items gevonden voor deze filters.<br />
          Pas je filters aan of wacht op de volgende wekelijkse verwerking.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(item => (
            <ItemKaart key={item.id} item={item} userId={user.id} onUpdate={updateItem} outputFormaat={outputFormaat} />
          ))}
        </div>
      )}
    </div>
  )
}
