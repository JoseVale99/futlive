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

const SUPABASE_URL = 'https://nmaopmcugunecbclfwzs.supabase.co/rest/v1';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tYW9wbWN1Z3VuZWNiY2xmd3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODc5ODEsImV4cCI6MjA5Njc2Mzk4MX0.Z2-LSY83JtAgX3mtR3_wxNfzUwkLJPyvhuIb2xT_eVM';

const SAMPLE_SCORERS = [
  { rank: 1, player_name: "Cristiano Ronaldo", team: "Portugal", team_flag: "https://flagcdn.com/w40/pt.png", goals: 5, assists: 1, matches_played: 3 },
  { rank: 2, player_name: "Kylian Mbappé", team: "Francia", team_flag: "https://flagcdn.com/w40/fr.png", goals: 4, assists: 2, matches_played: 3 },
  { rank: 3, player_name: "Kai Havertz", team: "Alemania", team_flag: "https://flagcdn.com/w40/de.png", goals: 4, assists: 0, matches_played: 2 },
  { rank: 4, player_name: "Harry Kane", team: "Inglaterra", team_flag: "https://flagcdn.com/w40/gb-eng.png", goals: 3, assists: 1, matches_played: 3 },
  { rank: 5, player_name: "Erling Haaland", team: "Noruega", team_flag: "https://flagcdn.com/w40/no.png", goals: 3, assists: 0, matches_played: 3 },
  { rank: 6, player_name: "Vinícius Jr.", team: "Brasil", team_flag: "https://flagcdn.com/w40/br.png", goals: 2, assists: 2, matches_played: 3 },
  { rank: 7, player_name: "Julián Álvarez", team: "Argentina", team_flag: "https://flagcdn.com/w40/ar.png", goals: 2, assists: 1, matches_played: 3 },
  { rank: 8, player_name: "Viktor Gyökeres", team: "Suecia", team_flag: "https://flagcdn.com/w40/se.png", goals: 2, assists: 1, matches_played: 2 },
  { rank: 9, player_name: "Alphonso Davies", team: "Canadá", team_flag: "https://flagcdn.com/w40/ca.png", goals: 2, assists: 3, matches_played: 3 },
  { rank: 10, player_name: "Christian Pulisic", team: "EE.UU.", team_flag: "https://flagcdn.com/w40/us.png", goals: 2, assists: 1, matches_played: 2 }
];

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
 * Parse match page HTML to extract streams from Next.js hydration data.
 * The hydration contains full stream objects with embed_url already resolved.
 */
function parseMatchPageStreams(html, matchId) {
  const streams = [];
  const seen = new Set();

  // Strategy 1: Find embed_name/embed_url pairs in escaped JSON hydration data
  // The data looks like: \"embed_name\":\"FOX\",... \"embed_url\":\"https://...\",... \"source\":\"futbol-libre\"
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

  // Pair names with their closest url (they appear sequentially in the same object)
  for (let i = 0; i < Math.min(names.length, urls.length); i++) {
    const name = names[i].val;
    const url = urls[i].val;

    if (seen.has(name)) continue;
    seen.add(name);

    // Find the closest source to this name
    let source = 'lacancha-proxy';
    const nameIdx = names[i].idx;
    for (const s of sources) {
      if (Math.abs(s.idx - nameIdx) < 500) {
        source = s.val;
        break;
      }
    }

    let embedUrl = url;
    // For futbol-libre sources, use the direct URL (the player loads directly)
    // No need to wrap in futbol-libres.su — that adds an unnecessary layer

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

  // Strategy 2: Known channel URLs (DSports, DSports+ that we confirmed manually)
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

/**
 * Fetch JSON desde Supabase REST API usando https.
 */
function fetchSupabase(targetUrl) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON from Supabase'));
        }
      });
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
    const streams = [];
    const seen = new Set();

    const embedRegex = /"embed_url":"(https?:\/\/[^"]+)"/g;
    const allEmbeds = [];
    let m;
    while ((m = embedRegex.exec(rscText)) !== null) {
      allEmbeds.push({ url: m[1], index: m.index });
    }

    const nameRegex = /"embed_name":"([^"]+)"/g;
    const allNames = [];
    while ((m = nameRegex.exec(rscText)) !== null) {
      allNames.push({ name: m[1], index: m.index });
    }

    // Try to filter streams by matchId proximity in the RSC text
    const blockSize = 2000;
    const matchIdFiltered = [];
    for (let i = 0; i < allEmbeds.length; i++) {
      const embed = allEmbeds[i];
      const start = Math.max(0, embed.index - blockSize);
      const end = Math.min(rscText.length, embed.index + blockSize);
      const context = rscText.substring(start, end);

      if (context.includes(matchId)) {
        let closestName = null;
        let minDist = Infinity;
        for (const n of allNames) {
          const dist = Math.abs(n.index - embed.index);
          if (dist < minDist) {
            minDist = dist;
            closestName = n.name;
          }
        }
        if (closestName && !seen.has(closestName)) {
          seen.add(closestName);
          matchIdFiltered.push({
            id: `proxy-${matchIdFiltered.length}`,
            match_id: matchId,
            channel_id: null,
            embed_name: closestName,
            embed_url: embed.url,
            source: 'lacancha-proxy',
            stream_param: null,
            created_at: new Date().toISOString()
          });
        }
      }
    }

    if (matchIdFiltered.length > 0) {
      console.log(`[parseStreams] Found ${matchIdFiltered.length} match-specific streams for ${matchId}`);
      return matchIdFiltered.slice(0, 20);
    }

    // Fallback: return all streams (old behavior for when matchId isn't in RSC)
    console.log(`[parseStreams] No match-specific streams found, returning all ${allNames.length} streams`);
    for (let i = 0; i < Math.min(allNames.length, allEmbeds.length); i++) {
      const name = allNames[i].name;
      if (!seen.has(name)) {
        seen.add(name);
        streams.push({
          id: `proxy-${i}`,
          match_id: matchId,
          channel_id: null,
          embed_name: name,
          embed_url: allEmbeds[i].url,
          source: 'lacancha-proxy',
          stream_param: null,
          created_at: new Date().toISOString()
        });
      }
    }

    return streams.slice(0, 20);
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
            rscStream.id = `rsc-${streams.length}`;
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
  } else if (parsed.pathname === '/api/standings') {
    try {
      console.log(`[${new Date().toISOString()}] Fetching standings from Supabase`);
      const supabaseUrl = `${SUPABASE_URL}/group_standings?order=group_name.asc,rank.asc`;
      const data = await fetchSupabase(supabaseUrl);
      console.log(`[${new Date().toISOString()}] Got ${data.length} standings entries`);
      res.writeHead(200);
      res.end(JSON.stringify(data));
    } catch (err) {
      console.error('Standings proxy error:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: `Failed to fetch standings: ${err.message}` }));
    }
  } else if (parsed.pathname === '/api/scorers') {
    try {
      console.log(`[${new Date().toISOString()}] Fetching scorers from Supabase`);
      const supabaseUrl = `${SUPABASE_URL}/top_scorers?order=goals.desc,assists.desc`;
      const data = await fetchSupabase(supabaseUrl);
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`[${new Date().toISOString()}] No scorers from Supabase, returning sample data`);
        res.writeHead(200);
        res.end(JSON.stringify(SAMPLE_SCORERS));
      } else {
        console.log(`[${new Date().toISOString()}] Got ${data.length} scorers entries`);
        res.writeHead(200);
        res.end(JSON.stringify(data));
      }
    } catch (err) {
      console.log(`[${new Date().toISOString()}] Scorers fetch failed, returning sample data`);
      res.writeHead(200);
      res.end(JSON.stringify(SAMPLE_SCORERS));
    }
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found. Use /api/streams?matchId={id}, /api/live?matchId={id}, /api/standings, or /api/scorers' }));
  }
});

server.listen(PORT, () => {
  console.log(`🎬 Streams proxy running on http://localhost:${PORT}`);
  console.log(`   Usage: GET /api/streams?matchId={match-uuid}`);
  console.log(`          GET /api/standings`);
  console.log(`          GET /api/scorers`);
});
