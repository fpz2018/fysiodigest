import { supabase } from './_utils/supabaseAdmin.js'
import { fetchRssFeed } from './_utils/rssParser.js'
import { verwerkItem } from './_utils/claudeVerwerker.js'

function isItemZichtbaar(item, categorieVoorkeuren) {
  const voorkeur = categorieVoorkeuren?.[item.categorie]
  if (!voorkeur) return true
  const vol = { rood: 0, geel: 1, grijs: 2 }
  return (vol[item.prioriteit] ?? 2) <= (vol[voorkeur.drempel] ?? 2)
}

export const handler = async (event) => {
  const userId = event?.queryStringParameters?.user_id || null
  const maxItems = parseInt(event?.queryStringParameters?.max || '15', 10)
  const bronOffset = parseInt(event?.queryStringParameters?.bron_offset || '0', 10)
  const deadline = Date.now() + 8000

  try {
    const stats = await verwerkAlleGebruikers(userId, maxItems, bronOffset, deadline)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, ...stats }),
    }
  } catch (err) {
    console.error(err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}

async function verwerkAlleGebruikers(filterUserId, maxItems, bronOffset, deadline) {
  let query = supabase.from('profiles').select('*')
  if (filterUserId) query = query.eq('user_id', filterUserId)
  const { data: profielen, error } = await query
  if (error) throw error

  let totaal = 0
  let volgendeOffset = null
  let totaalBronnen = 0
  for (const profiel of profielen || []) {
    const r = await verwerkGebruiker(profiel, maxItems - totaal, bronOffset, deadline)
    totaal += r.nieuw
    totaalBronnen = r.totaalBronnen
    if (r.volgendeOffset !== null) volgendeOffset = r.volgendeOffset
    if (Date.now() > deadline) break
  }
  return {
    gebruikers: (profielen || []).length,
    nieuwe_items: totaal,
    volgende_bron_offset: volgendeOffset,
    totaal_bronnen: totaalBronnen,
  }
}

async function verwerkGebruiker(profiel, maxItems, bronOffset, deadline) {
  const { data: bronnen } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('user_id', profiel.user_id)
    .eq('actief', true)
    .order('id')

  if (!bronnen || bronnen.length === 0) return { nieuw: 0, volgendeOffset: null, totaalBronnen: 0 }

  const { data: bestaandeItems } = await supabase
    .from('digest_items')
    .select('bron_url')
    .eq('user_id', profiel.user_id)

  const bestaandeUrls = new Set((bestaandeItems || []).map(i => i.bron_url))
  let nieuw = 0
  let i = bronOffset

  for (; i < bronnen.length; i++) {
    if (nieuw >= maxItems) break
    if (Date.now() > deadline) break
    const bron = bronnen[i]
    const items = await fetchRssFeed(bron.url)

    for (const item of items) {
      if (nieuw >= maxItems) break
      if (Date.now() > deadline) break
      if (!item.bron_url) continue
      if (bestaandeUrls.has(item.bron_url)) continue

      const verwerkt = await verwerkItem(item, profiel)
      bestaandeUrls.add(item.bron_url)
      if (!verwerkt.relevant) continue
      if (!isItemZichtbaar(verwerkt, profiel.categorie_voorkeuren)) continue

      const { error: insErr } = await supabase.from('digest_items').insert({
        source_id: bron.id,
        user_id: profiel.user_id,
        titel: item.titel,
        headline: verwerkt.headline,
        praktijkimpact: verwerkt.praktijkimpact,
        bron_url: item.bron_url,
        prioriteit: verwerkt.prioriteit,
        categorie: verwerkt.categorie,
        gepubliceerd_op: item.gepubliceerd_op,
        gelezen: false,
        opgeslagen: false,
      })
      if (!insErr) nieuw++
      await new Promise(r => setTimeout(r, 200))
    }
  }
  const volgendeOffset = i >= bronnen.length ? null : i
  return { nieuw, volgendeOffset, totaalBronnen: bronnen.length }
}
