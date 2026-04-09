import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import pdfParse from 'pdf-parse'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { document_id } = body
    if (!document_id) return json(400, { error: 'document_id ontbreekt' })

    // Verifieer caller is admin
    const authHeader = event.headers.authorization || event.headers.Authorization
    if (!authHeader) return json(401, { error: 'Niet geautoriseerd' })
    const token = authHeader.replace('Bearer ', '')

    const userClient = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr || !userData?.user) return json(401, { error: 'Ongeldige sessie' })

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: profile } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (!profile?.is_admin) return json(403, { error: 'Geen admin' })

    // Haal document op
    const { data: doc, error: dErr } = await admin
      .from('admin_documents')
      .select('*')
      .eq('id', document_id)
      .single()
    if (dErr || !doc) return json(404, { error: 'Document niet gevonden' })

    // 1. Tekst extraheren
    let tekst = doc.tekst_inhoud || ''
    if (doc.type === 'pdf' && doc.bestandsnaam) {
      try {
        const { data: file, error: dlErr } = await admin
          .storage.from('admin-documents').download(doc.bestandsnaam)
        if (dlErr) throw dlErr
        const buf = Buffer.from(await file.arrayBuffer())
        const parsed = await pdfParse(buf)
        tekst = parsed.text || ''
        if (!tekst.trim()) return json(422, { error: 'PDF bevat geen leesbare tekst' })
        await admin.from('admin_documents').update({ tekst_inhoud: tekst }).eq('id', doc.id)
      } catch (e) {
        return json(422, { error: 'PDF kon niet worden gelezen: ' + e.message })
      }
    }

    // 2. Claude aanroepen
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: 'Je bent een assistent die documenten verwerkt voor fysiotherapeuten in Nederland.\nVerwerk het aangeleverde document naar een digest-item met:\n- headline: maximaal 10 woorden, prikkelend en direct\n- praktijkimpact: precies 2 zinnen — wat betekent dit concreet voor de fysiotherapeut?\n- categorie: kies uit: richtlijnen / regelgeving / wetenschap / vakbladen / verzekeraars / opleidingen / overig\nAntwoord uitsluitend in JSON, geen markdown, geen toelichting.',
      messages: [{
        role: 'user',
        content: `Verwerk dit document naar een digest-item:\n\nTitel: ${doc.titel}\nInhoud: ${tekst.slice(0, 3000)}`,
      }],
    })
    const raw = msg.content[0]?.text || '{}'
    let parsed
    try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) }
    catch { return json(500, { error: 'Claude antwoord niet parseerbaar', raw }) }

    const { headline, praktijkimpact, categorie } = parsed

    // 3. Matchende gebruikers ophalen
    const { data: profielen } = await admin
      .from('profiles')
      .select('user_id, specialisaties, praktijkvorm, zorgverzekeraars')
    const matches = (profielen || []).filter(p => {
      const specMatch = doc.tags_specialisaties.length === 0
        || (p.specialisaties || []).some(s => doc.tags_specialisaties.includes(s))
      const praktMatch = doc.tags_praktijkvorm.length === 0
        || doc.tags_praktijkvorm.includes(p.praktijkvorm)
      const verzMatch = doc.tags_verzekeraars.length === 0
        || (p.zorgverzekeraars || []).some(v => doc.tags_verzekeraars.includes(v))
      return specMatch || praktMatch || verzMatch
    })

    // 4. Signed URL voor PDF
    let bron_url = null
    if (doc.type === 'pdf' && doc.bestandsnaam) {
      const { data: signed } = await admin
        .storage.from('admin-documents')
        .createSignedUrl(doc.bestandsnaam, 60 * 60 * 24 * 30)
      bron_url = signed?.signedUrl || null
    }

    // 5. Eerdere items voor dit document weghalen (bij heruitvoeren)
    await admin.from('digest_items').delete().eq('titel', doc.titel).is('source_id', null)

    // 6. Items aanmaken
    const items = matches.map(m => ({
      user_id: m.user_id,
      titel: doc.titel,
      headline,
      praktijkimpact,
      categorie,
      prioriteit: doc.prioriteit,
      bron_url,
    }))
    if (items.length) {
      const { error: iErr } = await admin.from('digest_items').insert(items)
      if (iErr) return json(500, { error: 'Items aanmaken mislukt: ' + iErr.message })
    }

    await admin.from('admin_documents').update({
      verwerkt: true, verwerkt_op: new Date().toISOString(),
    }).eq('id', doc.id)

    return json(200, { ok: true, bereikt: items.length })
  } catch (e) {
    return json(500, { error: e.message })
  }
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
