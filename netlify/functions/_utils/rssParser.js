import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'FysioDigest/1.0' },
})

export async function fetchRssFeed(url) {
  try {
    const feed = await parser.parseURL(url)
    return feed.items.map(item => ({
      titel: item.title || '',
      bron_url: item.link || item.guid || '',
      inhoud: item.contentSnippet || item.content || item.summary || '',
      gepubliceerd_op: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      guid: item.guid || item.link || item.title,
    }))
  } catch (err) {
    console.error(`RSS fetch mislukt voor ${url}:`, err.message)
    return []
  }
}
