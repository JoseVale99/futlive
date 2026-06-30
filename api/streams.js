/**
 * Vercel Serverless Function — Proxy de streams.
 * Scrapea canales desde lacancha.tv (embed_url + embed_name).
 * Todo lo demás (partidos, stats, lineups) viene de ESPN.
 *
 * Endpoint: /api/streams?matchId={id}
 */

const LACANCHA_URL = 'https://lacancha.tv/es/en-vivo';

/**
 * Fetch RSC data from lacancha.tv.
 * El _rsc token cambia con deploys de lacancha.tv.
 * Si falla, el fallback a futbol-libre cubre.
 */
async function fetchRSC() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${LACANCHA_URL}?_rsc=c82pw5EwhOARkkko`, {
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

  const usedUrls = new Set();

  for (const nameEntry of names) {
    const name = nameEntry.val;
    if (seen.has(name)) continue;

    let closestUrl = null;
    let minDist = Infinity;
    let closestIdx = -1;

    for (let j = 0; j < urls.length; j++) {
      if (usedUrls.has(j)) continue;
      const dist = Math.abs(urls[j].idx - nameEntry.idx);
      if (dist < minDist) {
        minDist = dist;
        closestUrl = urls[j].val;
        closestIdx = j;
      }
    }

    if (!closestUrl || minDist > 2000) continue;

    seen.add(name);
    usedUrls.add(closestIdx);

    let source = 'lacancha';
    for (const s of sources) {
      if (Math.abs(s.idx - nameEntry.idx) < 500) {
        source = s.val;
        break;
      }
    }

    streams.push({
      id: `lc-${streams.length}`,
      match_id: matchId,
      channel_id: null,
      embed_name: name,
      embed_url: closestUrl,
      source,
      stream_param: null,
      created_at: new Date().toISOString(),
    });
  }

  return streams.slice(0, 30);
}

function parseRSCStreams(rscText, matchId) {
  const streams = [];
  const seenUrls = new Set();
  const nameCount = {};

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

  // Tomar todos los streams disponibles, renombrando duplicados como "Opción N"
  for (let i = 0; i < Math.min(allNames.length, allEmbeds.length); i++) {
    const baseName = allNames[i].name;
    const url = allEmbeds[i].url;

    // Deduplicar por URL (misma URL = mismo stream real)
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    // Contar ocurrencias del nombre para generar "Opción N"
    nameCount[baseName] = (nameCount[baseName] || 0) + 1;
    const displayName = nameCount[baseName] === 1
      ? baseName
      : `${baseName} Opción ${nameCount[baseName]}`;

    streams.push({
      id: `rsc-${i}`,
      match_id: matchId,
      channel_id: null,
      embed_name: displayName,
      embed_url: url,
      source: 'lacancha',
      stream_param: null,
      created_at: new Date().toISOString(),
    });
  }

  return streams.slice(0, 40);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const { matchId } = req.query;
  if (!matchId) return res.status(400).json({ error: 'matchId query parameter required' });

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');

  try {
    let streams = [];

    // Strategy 1: RSC scrape (todos los canales en vivo, sin filtrar por matchId)
    // Strategy 2: Match page HTML (canales específicos si lacancha reconoce el ID)
    const [rscResult, matchPageResult] = await Promise.allSettled([
      fetchRSC().then(rscText => parseRSCStreams(rscText, matchId)),
      fetchMatchPageHTML(matchId).then(html => parseMatchPageStreams(html, matchId)),
    ]);

    // Preferir RSC que trae todos los canales en vivo
    if (rscResult.status === 'fulfilled' && rscResult.value.length > 0) {
      streams = rscResult.value;
    }

    // Merge match page results
    if (matchPageResult.status === 'fulfilled' && matchPageResult.value.length > 0) {
      const existingNames = new Set(streams.map(s => s.embed_name));
      for (const s of matchPageResult.value) {
        if (!existingNames.has(s.embed_name)) {
          streams.push(s);
          existingNames.add(s.embed_name);
        }
      }
    }

    // Agregar balondeportes.com — solo canales que permiten iframe (spaceyou globalm/global)
    const balonChannels = [
      { name: 'DSports (BD)', url: 'https://spaceyou.store/globalm.php?channel=dsports' },
      { name: 'DSports 2 (BD)', url: 'https://spaceyou.store/globalm.php?channel=dsports2' },
      { name: 'DSports+ (BD)', url: 'https://spaceyou.store/globalm.php?channel=dsportsplus' },
      { name: 'ESPN (BD)', url: 'https://spaceyou.store/global.php?channel=espn-1' },
      { name: 'ESPN Premium (BD)', url: 'https://spaceyou.store/v41.php?channel=espnpremium' },
      { name: 'Fox Sports (BD)', url: 'https://spaceyou.store/global.php?channel=foxsports' },
      { name: 'TNT Sports (BD)', url: 'https://spaceyou.store/global.php?channel=tntsports' },
    { name: 'TyC Sports (BD)', url: 'https://spaceyou.store/global.php?channel=tycsports' },
      { name: 'TUDN (BD)', url: 'https://www.balondeportes.com/globalp.php?channel=tudnmx1' },
      { name: 'TUDN Op2 (BD)', url: 'https://www.balondeportes.com/globalp.php?channel=tudnmx' },
      { name: 'Azteca 7 (BD)', url: 'https://www.balondeportes.com/globalm.php?channel=azteca7' },
      { name: 'Canal 5 (BD)', url: 'https://www.balondeportes.com/globalp.php?channel=canal5' },
    ];
    const existingNamesBD = new Set(streams.map(s => s.embed_name.toLowerCase()));
    for (const ch of balonChannels) {
      if (!existingNamesBD.has(ch.name.toLowerCase())) {
        streams.push({
          id: `bd-${streams.length}`,
          match_id: matchId,
          channel_id: null,
          embed_name: ch.name,
          embed_url: ch.url,
          source: 'balondeportes',
          stream_param: null,
          created_at: new Date().toISOString(),
        });
      }
    }

    // Agregar futbol-libres.su como canales extra al final
    const fallbackChannels = [
      { name: 'ESPN (FL)', slug: 'espn-1' },
      { name: 'ESPN Premium (FL)', slug: 'espn-premium' },
      { name: 'DSports (FL)', slug: 'directv-sports' },
      { name: 'Fox Sports (FL)', slug: 'fox-sports' },
      { name: 'TUDN (FL)', slug: 'tudn' },
      { name: 'TNT Sports (FL)', slug: 'tnt-sports' },
      { name: 'TyC Sports (FL)', slug: 'tyc-sports' },
      { name: 'Telemundo (FL)', slug: 'telemundo' },
    ];
    const existingNamesFL = new Set(streams.map(s => s.embed_name.toLowerCase()));
    for (const ch of fallbackChannels) {
      if (!existingNamesFL.has(ch.name.toLowerCase())) {
        streams.push({
          id: `fb-${streams.length}`,
          match_id: matchId,
          channel_id: null,
          embed_name: ch.name,
          embed_url: `https://futbol-libres.su/${ch.slug}/`,
          source: 'futbol-libre',
          stream_param: null,
          created_at: new Date().toISOString(),
        });
      }
    }

    return res.status(200).json({ streams, matchId, count: streams.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch streams', detail: err.message });
  }
};
