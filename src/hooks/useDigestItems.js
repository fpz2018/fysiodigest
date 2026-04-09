import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function getWeekRange(offset = 0) {
  const now = new Date()
  const dag = now.getDay()
  const maandag = new Date(now)
  maandag.setDate(now.getDate() - (dag === 0 ? 6 : dag - 1) + offset * 7)
  maandag.setHours(0, 0, 0, 0)
  const zondag = new Date(maandag)
  zondag.setDate(maandag.getDate() + 6)
  zondag.setHours(23, 59, 59, 999)
  return { start: maandag, eind: zondag, weekNummer: getWeekNumber(maandag) }
}

function getWeekNumber(datum) {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

const prioVolgorde = { rood: 0, geel: 1, grijs: 2 }

function sorteerItems(items) {
  return [...items].sort((a, b) => {
    if (a.gelezen !== b.gelezen) return a.gelezen ? 1 : -1
    const p = (prioVolgorde[a.prioriteit] ?? 2) - (prioVolgorde[b.prioriteit] ?? 2)
    if (p !== 0) return p
    return new Date(b.gepubliceerd_op || 0) - new Date(a.gepubliceerd_op || 0)
  })
}

export function useDigestItems(userId, weekOffset = 0) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    prioriteit: 'alle', categorie: 'alle', status: 'alle', zoekterm: '',
  })
  const [debouncedTerm, setDebouncedTerm] = useState('')

  const weekRange = useMemo(() => getWeekRange(weekOffset), [weekOffset])

  const laadItems = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('digest_items')
      .select('*')
      .eq('user_id', userId)
      .gte('verwerkt_op', weekRange.start.toISOString())
      .lte('verwerkt_op', weekRange.eind.toISOString())
    setItems(sorteerItems(data || []))
    setLoading(false)
  }, [userId, weekRange.start, weekRange.eind])

  useEffect(() => { laadItems() }, [laadItems])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(filters.zoekterm), 300)
    return () => clearTimeout(t)
  }, [filters.zoekterm])

  const gefilterdeItems = useMemo(() => {
    return items.filter(item => {
      if (filters.prioriteit !== 'alle' && item.prioriteit !== filters.prioriteit) return false
      if (filters.categorie !== 'alle' && item.categorie !== filters.categorie) return false
      if (filters.status === 'ongelezen' && item.gelezen) return false
      if (filters.status === 'opgeslagen' && !item.opgeslagen) return false
      if (debouncedTerm) {
        const term = debouncedTerm.toLowerCase()
        const match = [item.headline, item.titel, item.praktijkimpact]
          .filter(Boolean).some(t => t.toLowerCase().includes(term))
        if (!match) return false
      }
      return true
    })
  }, [items, filters, debouncedTerm])

  const statistieken = useMemo(() => ({
    rood: items.filter(i => i.prioriteit === 'rood').length,
    geel: items.filter(i => i.prioriteit === 'geel').length,
    grijs: items.filter(i => i.prioriteit === 'grijs').length,
    ongelezen: items.filter(i => !i.gelezen).length,
  }), [items])

  const updateItem = (id, patch) => {
    setItems(prev => sorteerItems(prev.map(i => i.id === id ? { ...i, ...patch } : i)))
  }

  return {
    alleItems: items, items: gefilterdeItems, statistieken,
    weekRange, loading, filters, setFilters, herlaad: laadItems, updateItem,
  }
}

export function relatieveDatum(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const nu = new Date()
  const diff = Math.floor((nu - d) / 86400000)
  if (diff === 0) return 'vandaag'
  if (diff === 1) return 'gisteren'
  if (diff < 7) return `${diff} dagen geleden`
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}
