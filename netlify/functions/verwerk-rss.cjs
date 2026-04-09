const { supabase } = require('./_utils/supabaseAdmin.cjs');
const { fetchRssFeed } = require('./_utils/rssParser.cjs');
const { verwerkItem } = require('./_utils/claudeVerwerker.cjs');

exports.handler = async (event) => {
  const userId = event?.queryStringParameters?.user_id || null;

  try {
    const stats = await verwerkAlleGebruikers(userId);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, ...stats }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};

async function verwerkAlleGebruikers(filterUserId = null) {
  let query = supabase.from('profiles').select('*');
  if (filterUserId) query = query.eq('user_id', filterUserId);
  const { data: profielen, error } = await query;
  if (error) throw error;

  let totaalNieuw = 0;
  for (const profiel of profielen || []) {
    totaalNieuw += await verwerkGebruiker(profiel);
  }
  return { gebruikers: (profielen || []).length, nieuwe_items: totaalNieuw };
}

async function verwerkGebruiker(profiel) {
  const { data: bronnen } = await supabase
    .from('rss_sources')
    .select('*')
    .eq('user_id', profiel.user_id)
    .eq('actief', true);

  if (!bronnen || bronnen.length === 0) return 0;

  const { data: bestaandeItems } = await supabase
    .from('digest_items')
    .select('bron_url')
    .eq('user_id', profiel.user_id);

  const bestaandeUrls = new Set((bestaandeItems || []).map(i => i.bron_url));
  let nieuw = 0;

  for (const bron of bronnen) {
    const items = await fetchRssFeed(bron.url);

    for (const item of items) {
      if (!item.bron_url) continue;
      if (bestaandeUrls.has(item.bron_url)) continue;

      const verwerkt = await verwerkItem(item, profiel);
      if (!verwerkt.relevant) {
        bestaandeUrls.add(item.bron_url);
        continue;
      }

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
      });
      if (!insErr) {
        nieuw++;
        bestaandeUrls.add(item.bron_url);
      }

      await new Promise(r => setTimeout(r, 300));
    }
  }
  return nieuw;
}
