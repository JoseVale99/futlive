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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${LACANCHA_URL}?_rsc=${RSC_VALUE}`, {
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch the match page HTML from lacancha.tv.
 * The HTML contains channel buttons and match metadata in hydration data.
 */
async function fetchMatchPageHTML(matchId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://lacancha.tv/es/partido/${matchId}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Referer': 'https://lacancha.tv/es/en-vivo',
      }
    });
    return res.text();
  } finally {
    clearTimeout(timeoutId);
  }
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
    const streams = [];
    const seen = new Set();

    // The RSC contains match blocks with their associated streams.
    // Each stream has embed_url, embed_name, and a nearby match_id or slug reference.
    // Strategy: find all stream objects and check if matchId appears nearby.

    // First, try to find streams specifically associated with this matchId
    // by looking for blocks that contain both the matchId and embed_url
    const blockSize = 2000; // characters around each embed_url to search for matchId

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

    // Try to filter by matchId proximity
    const matchIdFiltered = [];
    for (let i = 0; i < allEmbeds.length; i++) {
      const embed = allEmbeds[i];
      const start = Math.max(0, embed.index - blockSize);
      const end = Math.min(rscText.length, embed.index + blockSize);
      const context = rscText.substring(start, end);

      if (context.includes(matchId)) {
        // Find closest name
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
            id: `proxy-${streams.length + matchIdFiltered.length}`,
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

    // If we found match-specific streams, return those
    if (matchIdFiltered.length > 0) {
      return matchIdFiltered.slice(0, 20);
    }

    // Fallback: if no match-specific streams found, return all (old behavior)
    // This handles cases where matchId format doesn't match what's in the RSC
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
    return [];
  }
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { matchId, type } = req.query;

  if (!matchId) {
    return res.status(400).json({ error: 'matchId query parameter required' });
  }

  // No cache for live data (polled frequently), short cache for streams
  if (type === 'live') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');
  }

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

    // Run both strategies in PARALLEL for speed
    let streams = [];
    const [matchPageResult, rscResult] = await Promise.allSettled([
      fetchMatchPageHTML(matchId).then(html => parseMatchPageStreams(html, matchId)),
      fetchRSC().then(rscText => parseStreams(rscText, matchId))
    ]);

    // Strategy 1 results
    if (matchPageResult.status === 'fulfilled' && matchPageResult.value.length > 0) {
      streams = matchPageResult.value;
      console.log(`[streams] Strategy 1 (match page): found ${streams.length} streams for ${matchId}`);
    } else {
      console.log(`[streams] Strategy 1 failed for ${matchId}: ${matchPageResult.status === 'rejected' ? matchPageResult.reason?.message : 'no streams'}`);
    }

    // Strategy 2 results - merge
    if (rscResult.status === 'fulfilled' && rscResult.value.length > 0) {
      const rscStreams = rscResult.value;
      console.log(`[streams] Strategy 2 (RSC): found ${rscStreams.length} streams for ${matchId}`);
      const existingNames = new Set(streams.map(s => s.embed_name));
      for (const rscStream of rscStreams) {
        if (!existingNames.has(rscStream.embed_name)) {
          rscStream.id = `rsc-${streams.length}`;
          streams.push(rscStream);
          existingNames.add(rscStream.embed_name);
        }
      }
    } else {
      console.log(`[streams] Strategy 2 failed for ${matchId}: ${rscResult.status === 'rejected' ? rscResult.reason?.message : 'no streams'}`);
    }

    // Strategy 3: Add known channels from futbol-libres.su as fallback/extra options
    const futbolLibreChannels = [
      { name: 'ESPN', slug: 'espn-1' },
      { name: 'ESPN Premium', slug: 'espn-premium' },
      { name: 'DSports', slug: 'directv-sports' },
      { name: 'Fox Sports', slug: 'fox-sports' },
      { name: 'TUDN', slug: 'tudn' },
      { name: 'TNT Sports', slug: 'tnt-sports' },
      { name: 'TyC Sports', slug: 'tyc-sports' },
    ];

    const existingNamesAll = new Set(streams.map(s => s.embed_name.toLowerCase()));
    for (const ch of futbolLibreChannels) {
      if (!existingNamesAll.has(ch.name.toLowerCase())) {
        streams.push({
          id: `fl-${streams.length}`,
          match_id: matchId,
          channel_id: null,
          embed_name: `${ch.name} (FL)`,
          embed_url: `https://futbol-libres.su/${ch.slug}/`,
          source: 'futbol-libre',
          stream_param: null,
          created_at: new Date().toISOString()
        });
      }
    }

    // Strategy 4: ustream.to — canales en vivo 24/7 con embed directo
    // NOTA: estos son canales generales 24/7, NO transmiten el partido específico.
    // Solo se agregan si las strategies 1-3 no encontraron suficientes streams del partido.
    if (streams.length < 5) {
      const ustreamChannels = [
        { name: 'TUDN', slug: 'univision-deportes' },
        { name: 'Fox Sports 1', slug: 'fox-sports-1-b' },
        { name: 'Fox Sports 2', slug: 'fox-sports-2' },
        { name: 'beIN Sports', slug: 'bein-sports-usa' },
        { name: 'Telemundo', slug: 'telemundo' },
        { name: 'ESPN (US)', slug: 'espn' },
      ];

      const existingNamesUstream = new Set(streams.map(s => s.embed_name.toLowerCase()));
      for (const ch of ustreamChannels) {
        if (!existingNamesUstream.has(ch.name.toLowerCase())) {
          streams.push({
            id: `us-${streams.length}`,
            match_id: matchId,
            channel_id: null,
            embed_name: ch.name,
            embed_url: `https://www.ustream.to/embed?id=${ch.slug}&remove_watermark=true`,
            source: 'ustream',
            stream_param: null,
            created_at: new Date().toISOString()
          });
        }
      }
    }

    // Limit to 35
    streams = streams.slice(0, 35);

    return res.status(200).json({
      streams,
      matchId,
      count: streams.length
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch', detail: err.message });
  }
};
