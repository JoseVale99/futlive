/**
 * Vercel Serverless Function — Proxy de streams de lacancha.tv
 * Se despliega automáticamente en /api/streams?matchId={id}
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

async function fetchMatchPageRSC(matchId) {
  const res = await fetch(`https://lacancha.tv/es/partido/${matchId}?_rsc=${RSC_VALUE}`, {
    headers: {
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
      'Referer': `https://lacancha.tv/es/partido/${matchId}`,
      'RSC': '1',
      'Next-Url': `/es/partido/${matchId}`,
    }
  });
  return res.text();
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

    return embedUrls.slice(0, 20); // Max 20 canales
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

    // Default: fetch streams from match page RSC (has all channels including DSports+ NO ADS)
    let rscText = '';
    let streams = [];
    try {
      rscText = await fetchMatchPageRSC(matchId);
      streams = parseStreams(rscText, matchId);
    } catch (e) {
      // ignore, will fallback below
    }

    // Fallback to en-vivo page if match page failed or returned no streams
    if (streams.length === 0) {
      try {
        rscText = await fetchRSC();
        streams = parseStreams(rscText, matchId);
      } catch (e) {
        // both sources failed, streams stays empty
      }
    }

    return res.status(200).json({
      streams,
      matchId,
      count: streams.length
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch', detail: err.message });
  }
};
