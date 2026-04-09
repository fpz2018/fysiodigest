export function buildEmailHtml({ naam, weekNummer, datumRange, items, appUrl }) {
  const roodItems = items.filter(i => i.prioriteit === 'rood')
  const geelItems = items.filter(i => i.prioriteit === 'geel')
  const grijsItems = items.filter(i => i.prioriteit === 'grijs')

  const itemRij = (item) => {
    const kleur = { rood: '#DC2626', geel: '#D97706', grijs: '#6B7280' }[item.prioriteit] || '#6B7280'
    const label = { rood: '🔴 Actie vereist', geel: '🟡 Relevant', grijs: '⚪ Ter info' }[item.prioriteit] || ''
    return `
      <tr><td style="padding: 16px; border-left: 4px solid ${kleur}; background: #f9fafb;">
        <div style="font-size: 11px; color: ${kleur}; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">
          ${label} &nbsp;·&nbsp; ${item.categorie || ''}
        </div>
        <div style="font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 8px; line-height: 1.4;">
          ${escapeHtml(item.headline || item.titel || '')}
        </div>
        <div style="font-size: 14px; color: #374151; line-height: 1.6; margin-bottom: 10px;">
          ${escapeHtml(item.praktijkimpact || '')}
        </div>
        ${item.bron_url ? `<a href="${item.bron_url}" style="font-size: 13px; color: #2563EB; text-decoration: none; font-weight: 500;">→ Lees volledig artikel</a>` : ''}
      </td></tr>
      <tr><td style="height: 12px;"></td></tr>
    `
  }

  const sectie = (titel, kleur, rows) => rows.length ? `
    <tr><td style="padding: 8px 0;">
      <div style="font-size: 13px; font-weight: 700; color: ${kleur}; text-transform: uppercase; letter-spacing: 0.05em; padding: 12px 0 8px;">
        ${titel}
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">${rows.join('')}</table>
    </td></tr>` : ''

  const grijsRows = grijsItems.slice(0, 5).map(item => `
    <tr><td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">
      <span style="font-size: 14px; color: #374151;">${escapeHtml(item.headline || item.titel || '')}</span>
      ${item.bron_url ? `&nbsp;<a href="${item.bron_url}" style="font-size: 13px; color: #2563EB; text-decoration: none;">→</a>` : ''}
    </td></tr>
  `)

  return `<!DOCTYPE html>
<html lang="nl"><head><meta charset="UTF-8"><title>FysioDigest — Week ${weekNummer}</title></head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
      <tr><td style="background: #1E3A5F; padding: 28px 32px; border-radius: 12px 12px 0 0;">
        <div style="font-size: 22px; font-weight: 800; color: #ffffff;">FysioDigest</div>
        <div style="font-size: 13px; color: #93c5fd; margin-top: 4px;">Week ${weekNummer} · ${datumRange}</div>
      </td></tr>
      <tr><td style="background: #ffffff; padding: 24px 32px 8px;">
        <div style="font-size: 16px; color: #111827; font-weight: 600;">Goedemorgen ${escapeHtml(naam || '')},</div>
        <div style="font-size: 14px; color: #6B7280; margin-top: 6px;">
          Dit zijn jouw ${items.length} relevante updates van afgelopen week.
          ${roodItems.length > 0 ? `<strong style="color: #DC2626;">${roodItems.length} item${roodItems.length > 1 ? 's' : ''} vereist actie.</strong>` : ''}
        </div>
      </td></tr>
      <tr><td style="background: #ffffff; padding: 16px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${sectie(`🔴 Actie vereist (${roodItems.length})`, '#DC2626', roodItems.map(itemRij))}
          ${sectie(`🟡 Relevant voor jouw praktijk (${geelItems.length})`, '#D97706', geelItems.slice(0, 5).map(itemRij))}
          ${sectie(`⚪ Goed om te weten (${grijsItems.length})`, '#6B7280', grijsRows)}
        </table>
      </td></tr>
      <tr><td style="background: #ffffff; padding: 24px 32px; text-align: center; border-top: 1px solid #f3f4f6;">
        <a href="${appUrl}/" style="display: inline-block; background: #2563EB; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
          Bekijk volledig dashboard →
        </a>
      </td></tr>
      <tr><td style="background: #f9fafb; padding: 16px 32px; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
        <div style="font-size: 12px; color: #9CA3AF; text-align: center; line-height: 1.6;">
          Je ontvangt deze e-mail omdat je bent aangemeld bij FysioDigest.<br>
          <a href="${appUrl}/instellingen" style="color: #6B7280;">Pas je e-mailvoorkeuren aan</a>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

export function buildEmailText({ naam, weekNummer, items }) {
  const regels = [`FysioDigest — Week ${weekNummer}`, `Goedemorgen ${naam},`, '', `${items.length} updates deze week.`, '']
  items.forEach(item => {
    regels.push(`[${(item.prioriteit || '').toUpperCase()}] ${item.headline || item.titel}`)
    if (item.praktijkimpact) regels.push(item.praktijkimpact)
    if (item.bron_url) regels.push(`Lees meer: ${item.bron_url}`)
    regels.push('')
  })
  return regels.join('\n')
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
