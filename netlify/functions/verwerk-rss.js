import { supabase } from './_utils/supabaseAdmin.js'
import { fetchRssFeed } from './_utils/rssParser.js'
import { verwerkItem } from './_utils/claudeVerwerker.js'

export const handler = async (event) => {
  const userId = event?.queryStringParameters?.user_id || null
  const maxItems = parseInt(event?.queryStringParameters?.max || '15', 10)

  try {
    const stats = await verwerkAlleGebruikers(userId, maxItems)
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

async function verwerkAlleGebruikers(filterUserId, maxItems) {
  let query = supabase.from('profiles').select('*')
  if (filterUserId) query = query.eq('user_id', filterUserId)
  const { data: profielen, error } = await query
  if (error) throw error

  let totaal = 0
  for (const profiel of profielen || []) {
    totaal += await verwerkGebruiker(profiel, maxItems)
  }
  return { gebruikers: (profielen || []).length, nieuwe_items: totaal }
}

async function verwerkGebruiker(profiel, maxItems) {
  const { data: bronnen } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('user_id', profiel.user_id)
    .eq('actief', true)

  if (!bronnen || bronnen.length === 0) return 0

  const { data: bestaandeItems } = await supabase
    .from('digest_items')
    .select('bron_url')
    .eq('user_id', profiel.user_id)

  const bestaandeUrls = new Set((bestaandeItems || []).map(i => i.bron_url))
  let nieuw = 0

  for (const bron of bronnen) {
    if (nieuw >= maxItems) break
    const items = await fetchRssFeed(bron.url)

    for (const item of items) {
      if (nieuw >= maxItems) break
      if (!item.bron_url) continue
      if (bestaandeUrls.has(item.bron_url)) continue

      const verwerkt = await verwerkItem(item, profiel)
      bestaandeUrls.add(item.bron_url)
      if (!verwerkt.relevant) continue

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
      await new Promise(r => setTimeout(r, 300))
    }
  }
  return nieuw
}
