import { Resend } from 'resend'
import { supabase } from './_utils/supabaseAdmin.js'
import { buildEmailHtml, buildEmailText } from './_utils/emailTemplate.js'

const resend = new Resend(process.env.RESEND_API_KEY)

export const handler = async (event) => {
  const userId = event?.queryStringParameters?.user_id || null
  const testMode = event?.queryStringParameters?.test === 'true'

  try {
    const verstuurd = await verstuurDigests(userId, testMode)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, verstuurd }),
    }
  } catch (err) {
    console.error('Digest versturen mislukt:', err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}

async function verstuurDigests(filterUserId, testMode) {
  let query = supabase.from('profiles').select('*').eq('email_digest', true)
  if (filterUserId) query = query.eq('user_id', filterUserId)
  const { data: profielen, error } = await query
  if (error) throw error

  let verstuurd = 0
  for (const profiel of profielen || []) {
    try {
      const ok = await verstuurVoorGebruiker(profiel, testMode)
      if (ok) verstuurd++
      await new Promise(r => setTimeout(r, 200))
    } catch (err) {
      console.error(`Digest mislukt voor ${profiel.user_id}:`, err.message)
    }
  }
  return verstuurd
}

async function verstuurVoorGebruiker(profiel, testMode) {
  const nu = new Date()
  const dag = nu.getDay()
  const maandagHuidig = new Date(nu)
  maandagHuidig.setDate(nu.getDate() - (dag === 0 ? 6 : dag - 1))
  maandagHuidig.setHours(0, 0, 0, 0)

  let start, eind
  if (testMode) {
    start = maandagHuidig
    eind = nu
  } else {
    start = new Date(maandagHuidig); start.setDate(start.getDate() - 7)
    eind = new Date(maandagHuidig); eind.setMilliseconds(-1)
  }

  const { data: items } = await supabase
    .from('digest_items')
    .select('*')
    .eq('user_id', profiel.user_id)
    .gte('verwerkt_op', start.toISOString())
    .lte('verwerkt_op', eind.toISOString())

  if (!items || items.length === 0) {
    console.log(`Geen items voor ${profiel.naam}, overgeslagen.`)
    return false
  }

  const volgorde = { rood: 0, geel: 1, grijs: 2 }
  items.sort((a, b) => (volgorde[a.prioriteit] ?? 2) - (volgorde[b.prioriteit] ?? 2))

  const weekNummer = getWeekNumber(start)
  const datumRange = formatDateRange(start, eind)

  const html = buildEmailHtml({
    naam: profiel.naam, weekNummer, datumRange, items,
    appUrl: process.env.APP_URL || '',
  })
  const text = buildEmailText({ naam: profiel.naam, weekNummer, items })

  const { data: userData } = await supabase.auth.admin.getUserById(profiel.user_id)
  const emailAdres = userData?.user?.email
  if (!emailAdres) return false

  const roodCount = items.filter(i => i.prioriteit === 'rood').length
  const subject = `FysioDigest Week ${weekNummer} — ${roodCount > 0 ? `🔴 ${roodCount} actie(s) vereist` : `${items.length} updates voor jou`}`

  await resend.emails.send({
    from: `FysioDigest <${process.env.DIGEST_FROM_EMAIL}>`,
    to: emailAdres,
    subject,
    html,
    text,
  })

  console.log(`Digest verstuurd naar ${emailAdres} (${items.length} items)`)
  return true
}

function getWeekNumber(datum) {
  const d = new Date(Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

function formatDateRange(start, eind) {
  const opts = { day: 'numeric', month: 'long' }
  return `${start.toLocaleDateString('nl-NL', opts)} t/m ${eind.toLocaleDateString('nl-NL', opts)}`
}
