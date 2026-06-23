/**
 * Proxy de streams — Parsea el RSC de lacancha.tv y devuelve streams embebibles.
 *
 * Uso local: node proxy/streams-proxy.js
 * Escucha en http://localhost:3001/api/streams?matchId={id}
 *
 * Deploy: Cloudflare Worker, Vercel Edge Function, o cualquier serverless.
 */

const http = require('http');
const https = require('https');
const url = require('url');

const LACANCHA_URL = 'https://lacancha.tv/es/en-vivo';
const RSC_PARAM = '_rsc';
const RSC_VALUE = 'Jo6jRgXoLltzsDtw';
const PORT = 3001;

function fetchRSC() {
  return new Promise((resolve, reject) => {
    const reqUrl = `${LACANCHA_URL}?${RSC_PARAM}=${RSC_VALUE}`;
    https.get(reqUrl, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Referer': 'https://lacancha.tv/es/en-vivo',
        'RSC': '1',
        'Next-Router-State-Tree': '%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22es%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22(shell)%22%2C%7B%22children%22%3A%5B%22en-vivo%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%5D%7D%5D%7D%5D',
        'Next-Url': '/es/en-vivo',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Fetch RSC from the specific match page on lacancha.tv
 * This page has streams specific to that match (including DSports+ NO ADS)
 */
function fetchMatchPageRSC(matchId) {
  return new Promise((resolve, reject) => {
    const reqUrl = `https://lacancha.tv/es/partido/${matchId}?_rsc=${RSC_VALUE}`;
    https.get(reqUrl, {
      headers: {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Referer': `https://lacancha.tv/es/partido/${matchId}`,
        'RSC': '1',
        'Next-Url': `/es/partido/${matchId}`,
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function fetchLiveData(matchId) {
  return new Promise((resolve, reject) => {
    const reqUrl = `https://lacancha.tv/api/match/${matchId}/live`;
    https.get(reqUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Referer': `https://lacancha.tv/es/partido/${matchId}`,
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    }).on('error', reject);
  });
}

function parseStreams(rscText, matchId) {
  try {
    // Buscar el array de streams en el RSC text
    const streamsRegex = /"streams":\[(\{[^]*?\})\]/;
    const match = rscText.match(/"streams":\[([\s\S]*?)\],"featuredMatch"/);

    if (!match) {
      // Intento alternativo: buscar embed_url patterns
      const embedUrls = [];
      const embedRegex = /"embed_url":"(https?:\/\/[^"]+)"/g;
      const nameRegex = /"embed_name":"([^"]+)"/g;
      const idRegex = /"id":"([^"]+)"/g;

      let embedMatch;
      const urls = [];
      while ((embedMatch = embedRegex.exec(rscText)) !== null) {
        urls.push(embedMatch[1]);
      }

      const names = [];
      let nameMatch;
      while ((nameMatch = nameRegex.exec(rscText)) !== null) {
        names.push(nameMatch[1]);
      }

      // Emparejar URLs con nombres
      for (let i = 0; i < Math.min(urls.length, names.length); i++) {
        embedUrls.push({
          id: `stream-${i}`,
          embed_name: names[i],
          embed_url: urls[i],
          source: 'lacancha-proxy'
        });
      }

      return embedUrls;
    }

    // Parsear JSON de streams
    const streamsStr = `[${match[1]}]`;
    const streams = JSON.parse(streamsStr);

    return streams
      .filter(s => s.embed_url && s.embed_name)
      .map(s => ({
        id: s.id || `proxy-${Math.random().toString(36).slice(2)}`,
        match_id: matchId,
        channel_id: null,
        embed_name: s.embed_name,
        embed_url: s.embed_url,
        source: 'lacancha-proxy',
        stream_param: null,
        created_at: new Date().toISOString()
      }));
  } catch (err) {
    console.error('Error parsing RSC:', err.message);
    return [];
  }
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = url.parse(req.url, true);

  if (parsed.pathname === '/api/streams') {
    const matchId = parsed.query.matchId;

    if (!matchId) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'matchId parameter required' }));
      return;
    }

    try {
      console.log(`[${new Date().toISOString()}] Fetching streams for match: ${matchId}`);

      // Primero: intentar la página específica del partido (tiene DSports+ NO ADS y más canales)
      let rscText = '';
      try {
        rscText = await fetchMatchPageRSC(matchId);
        console.log(`[${new Date().toISOString()}] Got match page RSC (${rscText.length} bytes)`);
      } catch (e) {
        // Fallback: usar la página de en-vivo
        console.log(`[${new Date().toISOString()}] Match page failed, falling back to en-vivo`);
        rscText = await fetchRSC();
      }

      const streams = parseStreams(rscText, matchId);

      console.log(`[${new Date().toISOString()}] Found ${streams.length} streams`);
      res.writeHead(200);
      res.end(JSON.stringify({ streams, matchId, count: streams.length }));
    } catch (err) {
      console.error('Proxy error:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to fetch streams', detail: err.message }));
    }
  } else if (parsed.pathname === '/api/live') {
    const matchId = parsed.query.matchId;

    if (!matchId) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'matchId parameter required' }));
      return;
    }

    try {
      console.log(`[${new Date().toISOString()}] Fetching live data for match: ${matchId}`);
      const liveData = await fetchLiveData(matchId);
      res.writeHead(200);
      res.end(JSON.stringify(liveData));
    } catch (err) {
      console.error('Live data error:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to fetch live data', detail: err.message }));
    }
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found. Use /api/streams?matchId={id} or /api/live?matchId={id}' }));
  }
});

server.listen(PORT, () => {
  console.log(`🎬 Streams proxy running on http://localhost:${PORT}`);
  console.log(`   Usage: GET /api/streams?matchId={match-uuid}`);
});
