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
 * Fetch the match page HTML from lacancha.tv and extract channel names + build embed URLs.
 * The match page has channel buttons in HTML but embed URLs are resolved client-side.
 * We extract channel names and construct embedindia.st URLs using the pattern:
 * https://embedindia.st/embed/wc/{date}/{team1}-{team2}/{channel-slug}
 */
function fetchMatchPageHTML(matchId) {
  return new Promise((resolve, reject) => {
    const reqUrl = `https://lacancha.tv/es/partido/${matchId}`;
    https.get(reqUrl, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Referer': 'https://lacancha.tv/es/en-vivo',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Parse match page HTML to extract channel names and construct embed URLs.
 * Channels come from: <span class="chlabel"><span>NAME</span></span>
 * The actual embed URLs use sudamericaplay2.com with Bitmovin player.
 */
function parseMatchPageStreams(html, matchId) {
  // Extract channel names from buttons
  const channelRegex = /<span class="chlabel"><span>([^<]+)<\/span><\/span>/g;
  const channels = [];
  let m;
  while ((m = channelRegex.exec(html)) !== null) {
    channels.push(m[1]);
  }

  if (channels.length === 0) return [];

  // Map channel names to known sudamericaplay2.com URLs
  // These are the real embed URLs that lacancha.tv uses
  const channelUrlMap = {
    'DSports': 'https://sudamericaplay2.com/canal_8112/cza_dsports.html',
    'DSports+': 'https://sudamericaplay2.com/canal_8112/cza_dsportsplus.html',
    'DSports+ NO ADS': 'https://sudamericaplay2.com/canal_8112/cza_dsportsplus.html',
    'ESPN': 'https://sudamericaplay2.com/canal_8112/cza_espn.html',
    'ESPN 2': 'https://sudamericaplay2.com/canal_8112/cza_espn2.html',
    'FOX': 'https://sudamericaplay2.com/canal_8112/cza_fox.html',
    'FOX Sports': 'https://sudamericaplay2.com/canal_8112/cza_foxsports.html',
    'DAZN Spain': 'https://sudamericaplay2.com/canal_8112/cza_dazn.html',
    'Telemundo': 'https://sudamericaplay2.com/canal_8112/cza_telemundo.html',
    'beIN Sports': 'https://sudamericaplay2.com/canal_8112/cza_bein.html',
    'BBC/ITV': 'https://sudamericaplay2.com/canal_8112/cza_bbc.html',
    'Peacock 4K (HEVC)': 'https://sudamericaplay2.com/canal_8112/cza_peacock4k.html',
    'FOX 4K (HEVC)': 'https://sudamericaplay2.com/canal_8112/cza_fox4k.html',
  };

  // Build stream objects using the known URLs or construct a guess
  const seen = new Set();
  return channels
    .map((name, i) => {
      if (seen.has(name)) return null;
      seen.add(name);

      // Use known URL or construct from pattern
      const embedUrl = channelUrlMap[name] ||
        `https://sudamericaplay2.com/canal_8112/cza_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.html`;

      return {
        id: `proxy-${i}`,
        match_id: matchId,
        channel_id: null,
        embed_name: name,
        embed_url: embedUrl,
        source: 'lacancha-proxy',
        stream_param: null,
        created_at: new Date().toISOString()
      };
    })
    .filter(Boolean)
    .slice(0, 20);
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
    const embedUrls = [];
    const embedRegex = /"embed_url":"(https?:\/\/[^"]+)"/g;
    const nameRegex = /"embed_name":"([^"]+)"/g;

    const urls = [];
    let m;
    while ((m = embedRegex.exec(rscText)) !== null) urls.push(m[1]);

    const names = [];
    while ((m = nameRegex.exec(rscText)) !== null) names.push(m[1]);

    // Deduplicate by embed_name (keep first occurrence)
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

    return embedUrls.slice(0, 20); // Max 20 streams
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

      let streams = [];

      // Strategy 1: Fetch match page HTML and extract channels (DSports, DSports+ from sudamericaplay2)
      try {
        const html = await fetchMatchPageHTML(matchId);
        console.log(`[${new Date().toISOString()}] Got match page HTML (${html.length} bytes)`);
        streams = parseMatchPageStreams(html, matchId);
        console.log(`[${new Date().toISOString()}] Got ${streams.length} streams from match page`);
      } catch (e) {
        console.log(`[${new Date().toISOString()}] Match page HTML failed: ${e.message}`);
      }

      // Strategy 2: Also fetch en-vivo RSC for additional channels (FOX, DAZN, Telemundo, etc.)
      try {
        console.log(`[${new Date().toISOString()}] Fetching en-vivo RSC for additional channels`);
        const rscText = await fetchRSC();
        const rscStreams = parseStreams(rscText, matchId);
        console.log(`[${new Date().toISOString()}] Got ${rscStreams.length} streams from en-vivo RSC`);

        // Merge: add RSC streams that aren't already in the match page streams
        const existingNames = new Set(streams.map(s => s.embed_name));
        for (const rscStream of rscStreams) {
          if (!existingNames.has(rscStream.embed_name)) {
            streams.push(rscStream);
            existingNames.add(rscStream.embed_name);
          }
        }
      } catch (e) {
        console.log(`[${new Date().toISOString()}] en-vivo RSC failed: ${e.message}`);
      }

      // Limit to 20 streams max
      streams = streams.slice(0, 20);

      console.log(`[${new Date().toISOString()}] Total streams: ${streams.length}`);
      res.writeHead(200);
      res.end(JSON.stringify({ streams, matchId, count: streams.length }));
    } catch (err) {
      console.error('Proxy error:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to fetch streams', detail: err.message }));
    }
  } else if (parsed.pathname === '/api/embed') {
    const embedUrl = parsed.query.url;

    if (!embedUrl) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'url parameter required' }));
      return;
    }

    try {
      // Fetch the embed page and rewrite URLs to proxy through localhost
      const embedContent = await new Promise((resolve, reject) => {
        https.get(embedUrl, {
          headers: {
            'Accept': 'text/html',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
            'Referer': 'https://lacancha.tv/',
          }
        }, (response) => {
          let data = '';
          response.on('data', chunk => data += chunk);
          response.on('end', () => resolve(data));
        }).on('error', reject);
      });

      // Inject a <base> tag so relative URLs resolve to the embed origin
      const embedOrigin = new URL(embedUrl).origin;
      const modifiedContent = embedContent.replace(
        '<head>',
        `<head><base href="${embedOrigin}/">`
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.writeHead(200);
      res.end(modifiedContent);
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to fetch embed', detail: err.message }));
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
