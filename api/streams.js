/**
 * Vercel Serverless Function — Proxy de streams de lacancha.tv
 * Se despliega automáticamente en /api/streams?matchId={id}
 *
 * Strategy:
 * 1. Fetch match page HTML → extract channel names from buttons → build embed URLs
 * 2. Fallback: Fetch en-vivo RSC → extract streams from featured match data
 */

const LACANCHA_URL = 'https://lacancha.tv/es/en-vivo';
const RSC_VALUE = 'Jo6jRgXoLltzsDtw';

async function fetchRSC() {
  const res = await fetch(`${LACANCHA_URL}?_rsc=${RSC_VALUE}`, {
    headers: {
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
      'Referer': 'https://lacancha.tv/es/en-vivo',
      'RSC': '1',
      'Next-Router-State-Tree': '%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22es%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22(shell)%22%2C%7B%22children%22%3A%5B%22en-vivo%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%5D%7D%5D%7D%5D',
      'Next-Url': '/es/en-vivo',
    }
  });
  return res.text();
}

/**
 * Fetch the match page HTML from lacancha.tv.
 * The HTML contains channel buttons and match metadata in hydration data.
 */
async function fetchMatchPageHTML(matchId) {
  const res = await fetch(`https://lacancha.tv/es/partido/${matchId}`, {
    headers: {
      'Accept': 'text/html',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
      'Referer': 'https://lacancha.tv/es/en-vivo',
    }
  });
  return res.text();
}

/**
 * Parse match page HTML to extract streams from Next.js hydration data.
 */
function parseMatchPageStreams(html, matchId) {
  const streams = [];
  const seen = new Set();

  const embedNameRegex = /\\?"embed_name\\?":\\?"([^"\\]+)\\?"/g;
  const embedUrlRegex = /\\?"embed_url\\?":\\?"(https?:\/\/[^"\\]+)\\?"/g;
  const sourceRegex = /\\?"source\\?":\\?"([^"\\]+)\\?"/g;

  const names = [];
  const urls = [];
  const sources = [];
  let m;

  while ((m = embedNameRegex.exec(html)) !== null) names.push({ val: m[1], idx: m.index });
  while ((m = embedUrlRegex.exec(html)) !== null) urls.push({ val: m[1], idx: m.index });
  while ((m = sourceRegex.exec(html)) !== null) sources.push({ val: m[1], idx: m.index });

  for (let i = 0; i < Math.min(names.length, urls.length); i++) {
    const name = names[i].val;
    const url = urls[i].val;

    if (seen.has(name)) continue;
    seen.add(name);

    let source = 'lacancha-proxy';
    const nameIdx = names[i].idx;
    for (const s of sources) {
      if (Math.abs(s.idx - nameIdx) < 500) {
        source = s.val;
        break;
      }
    }

    let embedUrl = url;

    streams.push({
      id: `match-${streams.length}`,
      match_id: matchId,
      channel_id: null,
      embed_name: name,
      embed_url: embedUrl,
      source: source,
      stream_param: null,
      created_at: new Date().toISOString()
    });
  }

  const channelUrlMap = {
    'DSports': 'https://sudamericaplay2.com/canal_8112/cza_dsports.html',
    'DSports+': 'https://latamplay1.click/channel/dsportsplus.html',
  };

  const channelRegex = /<span class="chlabel"><span>([^<]+)<\/span><\/span>/g;
  while ((m = channelRegex.exec(html)) !== null) {
    const name = m[1];
    if (!seen.has(name) && channelUrlMap[name]) {
      seen.add(name);
      streams.push({
        id: `match-${streams.length}`,
        match_id: matchId,
        channel_id: null,
        embed_name: name,
        embed_url: channelUrlMap[name],
        source: 'lacancha-proxy',
        stream_param: null,
        created_at: new Date().toISOString()
      });
    }
  }

  return streams.slice(0, 30);
}

function parseStreams(rscText, matchId) {
  try {
    const embedUrls = [];
    const embedRegex = /"embed_url":"(https?:\/\/[^"]+)"/g;
    const nameRegex = /"embed_name":"([^"]+)"/g;

    const urls = [];
    let m;
    while ((m = embedRegex.exec(rscText)) !== null) urls.push(m[1]);

    const names = [];
    while ((m = nameRegex.exec(rscText)) !== null) names.push(m[1]);

    // Deduplicate by name (keep first occurrence)
    const seen = new Set();
    for (let i = 0; i < Math.min(urls.length, names.length); i++) {
      const key = names[i];
      if (!seen.has(key)) {
        seen.add(key);
        embedUrls.push({
          id: `proxy-${i}`,
          match_id: matchId,
          channel_id: null,
          embed_name: names[i],
          embed_url: urls[i],
          source: 'lacancha-proxy',
          stream_param: null,
          created_at: new Date().toISOString()
        });
      }
    }

    return embedUrls.slice(0, 20);
  } catch (err) {
    return [];
  }
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { matchId, type } = req.query;

  if (!matchId) {
    return res.status(400).json({ error: 'matchId query parameter required' });
  }

  try {
    // If type=live, proxy the live data API
    if (type === 'live') {
      const liveRes = await fetch(`https://lacancha.tv/api/match/${matchId}/live`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          'Referer': `https://lacancha.tv/es/partido/${matchId}`,
        }
      });
      const liveData = await liveRes.json();
      return res.status(200).json(liveData);
    }

    // Strategy 1: Fetch match page HTML and extract channels (DSports, DSports+ from sudamericaplay2)
    let streams = [];
    try {
      const html = await fetchMatchPageHTML(matchId);
      streams = parseMatchPageStreams(html, matchId);
    } catch (e) {
      // ignore, will try RSC below
    }

    // Strategy 2: Also fetch en-vivo RSC for additional channels (FOX, DAZN, Telemundo, etc.)
    try {
      const rscText = await fetchRSC();
      const rscStreams = parseStreams(rscText, matchId);

      // Merge: add RSC streams that aren't already present
      const existingNames = new Set(streams.map(s => s.embed_name));
      for (const rscStream of rscStreams) {
        if (!existingNames.has(rscStream.embed_name)) {
          rscStream.id = `rsc-${streams.length}`;
          streams.push(rscStream);
          existingNames.add(rscStream.embed_name);
        }
      }
    } catch (e) {
      // both sources may have failed partially, use what we have
    }

    // Limit to 20
    streams = streams.slice(0, 20);

    return res.status(200).json({
      streams,
      matchId,
      count: streams.length
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch', detail: err.message });
  }
};
