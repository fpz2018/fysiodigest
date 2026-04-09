import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function verwerkItem(item, gebruikersProfiel) {
  const profielContext = `
Naam: ${gebruikersProfiel.naam}
Specialisaties: ${(gebruikersProfiel.specialisaties || []).join(', ')}
Praktijkvorm: ${gebruikersProfiel.praktijkvorm || 'onbekend'}
Zorgverzekeraars: ${(gebruikersProfiel.zorgverzekeraars || []).join(', ')}
Interessegebieden: ${gebruikersProfiel.interessegebieden || ''}
Gewenste outputformaat: ${gebruikersProfiel.output_formaat || 'bullet'}
  `.trim()

  const formaat = gebruikersProfiel.output_formaat || 'bullet'
  const formaatInstructie = {
    bullet: 'praktijkimpact: 3 tot 5 korte bullet points, elke regel begint met "• ", gescheiden door \\n. Elke bullet is concreet en actiegericht.',
    proza:  'praktijkimpact: één vloeiende alinea van 2 tot 3 zinnen in normaal Nederlands, zonder opsommingstekens.',
    soap:   'praktijkimpact: vier regels in SOAP-format, precies in deze vorm:\\nS: ...\\nO: ...\\nA: ...\\nP: ...\\nGebruik \\n als scheidingsteken. Elk onderdeel past bij de context van het artikel; indien niet van toepassing, schrijf "n.v.t.".',
    tabel:  'praktijkimpact: een compacte tabel met precies twee kolommen "Aspect" en "Impact", gescheiden door " | ", met 3 tot 4 rijen. Eerste regel is de header "Aspect | Impact", daarna een scheidingsregel "--- | ---", daarna de rijen. Gebruik \\n tussen regels.',
  }[formaat] || 'praktijkimpact: 2 zinnen in normaal Nederlands.'

  const systemPrompt = `Je bent een assistent die nieuws en onderzoek verwerkt voor fysiotherapeuten in Nederland.
Je taak: analyseer een item en maak een gepersonaliseerde digest-entry op basis van het gebruikersprofiel.

Regels:
- headline: maximaal 10 woorden, Nederlands, direct en informatief
- ${formaatInstructie}
- prioriteit: "rood" (directe actie vereist), "geel" (relevant maar niet urgent), "grijs" (goed om te weten)
- categorie: kies uit: richtlijnen / regelgeving / wetenschap / vakbladen / verzekeraars / opleidingen / ondernemen / subsidies / overig
- relevant: true als het item relevant is voor dit profiel, false als het volledig irrelevant is

Antwoord uitsluitend in JSON met exact deze keys: headline, praktijkimpact, prioriteit, categorie, relevant.
Gebruik \\n voor nieuwe regels binnen het praktijkimpact veld. Geen markdown, geen uitleg, geen backticks.`

  const userPrompt = `Gebruikersprofiel:
${profielContext}

Item om te verwerken:
Titel: ${item.titel}
Inhoud: ${(item.inhoud || '').substring(0, 1500)}
Bron: ${item.bron_url}

Verwerk dit naar een digest-item voor deze gebruiker.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const tekst = response.content[0].text.trim().replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(tekst)

    return {
      headline: parsed.headline || item.titel,
      praktijkimpact: parsed.praktijkimpact || '',
      prioriteit: parsed.prioriteit || 'grijs',
      categorie: parsed.categorie || 'overig',
      relevant: parsed.relevant !== false,
    }
  } catch (err) {
    console.error('Claude verwerking mislukt:', err.message)
    return {
      headline: (item.titel || '').substring(0, 80),
      praktijkimpact: 'Verwerking mislukt. Bekijk het originele artikel via de bronlink.',
      prioriteit: 'grijs',
      categorie: 'overig',
      relevant: true,
    }
  }
}
