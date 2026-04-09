import { supabase } from './_utils/supabaseAdmin.js'
import { verwerkItem } from './_utils/claudeVerwerker.js'

export const handler = async (event) => {
  const userId = event?.queryStringParameters?.user_id || null
  const maxItems = parseInt(event?.queryStringParameters?.max || '10', 10)
  const offset = parseInt(event?.queryStringParameters?.offset || '0', 10)
  const deadline = Date.now() + 8000

  try {
    let query = supabase.from('profiles').select('*')
    if (userId) query = query.eq('user_id', userId)
    const { data: profielen, error } = await query
    if (error) throw error

    let bijgewerkt = 0
    let volgendeOffset = null
    let totaal = 0

    for (const profiel of profielen || []) {
      const { data: items, count } = await supabase
        .from('digest_items')
        .select('*', { count: 'exact' })
        .eq('user_id', profiel.user_id)
        .order('id')
        .range(offset, offset + maxItems - 1)

      totaal = count || 0
      if (!items || items.length === 0) continue

      let i = 0
      for (; i < items.length; i++) {
        if (Date.now() > deadline) break
        const item = items[i]
        const verwerkt = await verwerkItem(
          { titel: item.titel, inhoud: item.praktijkimpact, bron_url: item.bron_url },
          profiel,
        )
        await supabase.from('digest_items').update({
          headline: verwerkt.headline,
          praktijkimpact: verwerkt.praktijkimpact,
          prioriteit: verwerkt.prioriteit,
          categorie: verwerkt.categorie,
        }).eq('id', item.id)
        bijgewerkt++
        await new Promise(r => setTimeout(r, 200))
      }
      volgendeOffset = offset + i
      if (volgendeOffset >= totaal) volgendeOffset = null
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, bijgewerkt, volgende_offset: volgendeOffset, totaal }),
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
