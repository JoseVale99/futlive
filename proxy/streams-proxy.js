/**
 * Servidor proxy local para desarrollo — NexaTV.
 *
 * Uso: node proxy/streams-proxy.js
 * Escucha en http://localhost:3001
 *
 * Endpoints:
 * - /api/streams?matchId={id}  → canales de streaming gratuitos
 * - /api/standings             → posiciones desde ESPN
 * - /api/bracket               → bracket knockout desde ESPN
 * - /api/scorers               → goleadores desde Supabase
 * - /api/v1?status={status}    → partidos desde ESPN
 *
 * NO depende de lacancha.tv — usa futbol-libres.su y ustream.to.
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Cargar .env si existe (desarrollo local)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

const PORT = 3001;

// --- Utilidades ---

function fetchJson(targetUrl, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(targetUrl, { headers: { 'Accept': 'application/json', ...headers } }, (resp) => {
      let body = '';
      resp.on('data', chunk => body += chunk);
      resp.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Invalid JSON')); }
      });
    }).on('error', reject);
  });
}

// --- ESPN Transform ---
function transformEspnEvent(event) {
  const comp = event.competitions?.[0];
  if (!comp) return null;

  const stateMap = { pre: 'scheduled', in: 'live', post: 'finished' };
  const status = stateMap[comp.status?.type?.state] || 'scheduled';
  const home = comp.competitors?.find(c => c.homeAway === 'home');
  const away = comp.competitors?.find(c => c.homeAway === 'away');
  if (!home || !away) return null;

  const stage = event.season?.slug?.replace(/-/g, ' ') || comp.altGameNote || '';
  let time_elapsed = null;
  if (status === 'live') {
    const mins = parseInt(comp.status?.displayClock, 10);
    if (!isNaN(mins)) time_elapsed = mins;
  }

  const getFlag = (team) => {
    const m = team.logo?.match(/countries\/500\/(\w+)\.png/);
    return m ? `https://a.espncdn.com/i/teamlogos/countries/500/${m[1]}.png` : (team.logo || '');
  };

  const events = (comp.details || []).map(d => {
    let type = null;
    if (d.redCard) type = 'red';
    else if (d.yellowCard) type = 'yellow';
    else if (d.ownGoal) type = 'own_goal';
    else if (d.penaltyKick && d.scoringPlay) type = 'penalty';
    else if (d.scoringPlay) type = 'goal';
    if (!type) return null;

    const teamSide = d.team?.id === home.id ? 'home' : 'away';
    const athlete = d.athletesInvolved?.[0];
    if (!athlete) return null; // Sin jugador identificado, no mostrar
    const clockVal = d.clock?.displayValue || '';
    const minute = parseInt(clockVal, 10) || 0;
    return {
      id: `${event.id}-${clockVal}-${type}-${athlete.id || 'x'}`,
      match_id: event.id, team: teamSide, type,
      player: athlete.displayName || 'Jugador desconocido',
      assist: null, minute, created_at: event.date,
    };
  }).filter(Boolean);

  const stats = [];
  for (const competitor of [home, away]) {
    const side = competitor === home ? 'home' : 'away';
    const sm = {};
    (competitor.statistics || []).forEach(s => { sm[s.name] = parseFloat(s.displayValue) || 0; });
    if (Object.keys(sm).length > 0) {
      stats.push({
        match_id: event.id, team: side,
        possession: sm.possessionPct || 0, shots: sm.totalShots || 0,
        shots_on_target: sm.shotsOnTarget || 0, corners: sm.wonCorners || 0,
        fouls: sm.foulsCommitted || 0,
      });
    }
  }

  const goals = events
    .filter(e => e.type === 'goal' || e.type === 'own_goal' || e.type === 'penalty')
    .map(e => ({ team: e.team, scorer: e.player, minute: e.minute }));

  return {
    id: event.id, external_id: event.uid || event.id,
    competition: 'FIFA World Cup 2026', stage, group_name: null,
    home_team: home.team?.displayName || '', away_team: away.team?.displayName || '',
    home_flag: getFlag(home.team), away_flag: getFlag(away.team),
    kickoff_at: comp.startDate || event.date, status,
    home_score: home.score !== undefined ? parseInt(home.score, 10) : null,
    away_score: away.score !== undefined ? parseInt(away.score, 10) : null,
    time_elapsed, updated_at: new Date().toISOString(),
    venue_name: comp.venue?.fullName || '', venue_city: comp.venue?.address?.city || '',
    goals: goals.length > 0 ? goals : undefined,
    events: events.length > 0 ? events : undefined,
    stats: stats.length > 0 ? stats : undefined,
  };
}

// --- Streams: lacancha.tv scrape + fallback futbol-libre ---
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
      if (Math.abs(s.idx - nameEntry.idx) < 500) { source = s.val; break; }
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

function fetchLaCanchaMatchPage(matchId) {
  return new Promise((resolve, reject) => {
    https.get(`https://lacancha.tv/es/partido/${matchId}`, {
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

function fetchLaCanchaRSC() {
  return new Promise((resolve, reject) => {
    https.get('https://lacancha.tv/es/en-vivo?_rsc=c82pw5EwhOARkkko', {
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
    }).on('error', () => resolve(''));
  });
}

async function buildStreams(matchId) {
  let streams = [];

  // Strategy 1+2: Scrape lacancha.tv (en-vivo general + RSC)
  try {
    const [htmlResult, rscResult] = await Promise.allSettled([
      fetchLaCanchaMatchPage(matchId).then(html => parseMatchPageStreams(html, matchId)),
      fetchLaCanchaRSC().then(rsc => parseRSCStreams(rsc, matchId)),
    ]);

    // Preferir RSC que trae todos los canales en vivo
    if (rscResult.status === 'fulfilled' && rscResult.value.length > 0) {
      streams = rscResult.value;
    }

    // Merge match page results
    if (htmlResult.status === 'fulfilled' && htmlResult.value.length > 0) {
      const existingNames = new Set(streams.map(s => s.embed_name));
      for (const s of htmlResult.value) {
        if (!existingNames.has(s.embed_name)) {
          streams.push(s);
          existingNames.add(s.embed_name);
        }
      }
    }
  } catch (e) {
    console.log(`[streams] lacancha.tv scrape failed: ${e.message}`);
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

  return streams;
}

// --- Bracket ---
const EVENT_ID_TO_MATCH_NUM = {
  '760486': 73, '760489': 74, '760488': 75, '760487': 76,
  '760492': 77, '760490': 78, '760491': 79, '760495': 80,
  '760494': 81, '760493': 82, '760496': 83, '760497': 84,
  '760498': 85, '760500': 86, '760501': 87, '760499': 88,
  '760503': 89, '760502': 90, '760504': 91, '760505': 92,
  '760506': 93, '760507': 94, '760509': 95, '760508': 96,
  '760510': 97, '760511': 98, '760512': 99, '760513': 100,
  '760514': 101, '760515': 102, '760516': 103, '760517': 104,
};

function transformBracketEvent(event) {
  const comp = event.competitions?.[0];
  if (!comp) return null;
  const st = comp.status?.type;
  const competitors = comp.competitors || [];
  const homeC = competitors.find(c => c.homeAway === 'home');
  const awayC = competitors.find(c => c.homeAway === 'away');
  let winner = null;
  if (st?.completed) {
    if (homeC?.winner) winner = 'home';
    else if (awayC?.winner) winner = 'away';
  }
  const matchNum = EVENT_ID_TO_MATCH_NUM[event.id] || null;
  return {
    id: event.id, matchNum, round: comp.altGameNote || '',
    date: event.date, status: st?.name || 'STATUS_SCHEDULED',
    statusDetail: st?.shortDetail || '',
    home: homeC ? { name: homeC.team?.displayName || 'TBD', code: homeC.team?.abbreviation || '', logo: homeC.team?.logo || '', score: homeC.score != null ? parseInt(homeC.score, 10) : null } : null,
    away: awayC ? { name: awayC.team?.displayName || 'TBD', code: awayC.team?.abbreviation || '', logo: awayC.team?.logo || '', score: awayC.score != null ? parseInt(awayC.score, 10) : null } : null,
    winner,
  };
}

// --- Server ---
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const parsed = url.parse(req.url, true);

  if (parsed.pathname === '/api/streams') {
    const matchId = parsed.query.matchId;
    if (!matchId) { res.writeHead(400); res.end(JSON.stringify({ error: 'matchId parameter required' })); return; }

    try {
      console.log(`[${new Date().toISOString()}] Fetching streams for: ${matchId}`);
      const streams = await buildStreams(matchId);
      console.log(`[${new Date().toISOString()}] Got ${streams.length} streams`);
      res.writeHead(200);
      res.end(JSON.stringify({ streams, matchId, count: streams.length }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to build streams', detail: err.message }));
    }

  } else if (parsed.pathname === '/api/standings') {
    try {
      console.log(`[${new Date().toISOString()}] Fetching standings from ESPN`);
      const espnUrl = `${process.env.ESPN_API_BASE}/apis/v2/sports/soccer/fifa.world/standings`;
      const espnRes = await fetchJson(espnUrl);

      const standings = [];
      for (const group of espnRes.children || []) {
        const entries = group.standings?.entries || [];
        for (const entry of entries) {
          const team = entry.team;
          const stats = entry.stats || [];
          const getStat = (name) => { const s = stats.find(x => x.name === name); return s ? s.value : 0; };
          standings.push({
            group_name: group.name,
            rank: getStat('rank'),
            team: team.displayName,
            team_code: team.abbreviation,
            team_external_id: parseInt(team.id, 10),
            team_logo: team.logos?.[0]?.href || null,
            played: getStat('gamesPlayed'),
            win: getStat('wins'),
            draw: getStat('ties'),
            lose: getStat('losses'),
            gf: getStat('pointsFor'),
            ga: getStat('pointsAgainst'),
            gd: getStat('pointDifferential'),
            points: getStat('points'),
            description: entry.note?.description || null,
            form: null,
            updated_at: new Date().toISOString(),
          });
        }
      }
      standings.sort((a, b) => a.group_name.localeCompare(b.group_name) || a.rank - b.rank);
      console.log(`[${new Date().toISOString()}] Got ${standings.length} standings`);
      res.writeHead(200);
      res.end(JSON.stringify(standings));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: `Failed to fetch standings: ${err.message}` }));
    }

  } else if (parsed.pathname === '/api/bracket') {
    const ESPN_API_BASE = process.env.ESPN_API_BASE || 'https://site.api.espn.com';
    const ESPN_SCOREBOARD = `${ESPN_API_BASE}/apis/site/v2/sports/soccer/fifa.world/scoreboard`;
    const ROUNDS = [
      { value: '2' }, { value: '3' }, { value: '4' },
      { value: '5' }, { value: '6' }, { value: '7' },
    ];

    try {
      console.log(`[${new Date().toISOString()}] Fetching bracket from ESPN`);
      const fetches = ROUNDS.map(round => {
        const targetUrl = `${ESPN_SCOREBOARD}?dates=20260628-20260720&seasontype=${round.value}`;
        return fetchJson(targetUrl).then(d => (d.events || []).map(transformBracketEvent).filter(Boolean)).catch(() => []);
      });

      const results = await Promise.all(fetches);
      let matches = results.flat();

      if (matches.length === 0) {
        const fallbackData = await fetchJson(`${ESPN_SCOREBOARD}?dates=20260628-20260720`).catch(() => ({ events: [] }));
        matches = (fallbackData.events || []).map(transformBracketEvent).filter(Boolean);
      }

      console.log(`[${new Date().toISOString()}] Got ${matches.length} bracket matches`);
      res.writeHead(200);
      res.end(JSON.stringify({ matches }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: `Failed to fetch bracket: ${err.message}` }));
    }

  } else if (parsed.pathname === '/api/scorers' || parsed.pathname === '/api/scorers/board') {
    try {
      console.log(`[${new Date().toISOString()}] Fetching scorers from ESPN statistics`);
      const ESPN_API_BASE = process.env.ESPN_API_BASE || 'https://site.api.espn.com';
      const espnStatsUrl = `${ESPN_API_BASE}/apis/site/v2/sports/soccer/fifa.world/statistics`;
      const data = await fetchJson(espnStatsUrl, { 'User-Agent': 'NexaTV/1.0' });

      const goalsCategory = (data.stats || []).find(s => s.name === 'goalsLeaders');
      const assistsCategory = (data.stats || []).find(s => s.name === 'assistsLeaders');

      const players = [];

      if (goalsCategory && goalsCategory.leaders) {
        goalsCategory.leaders.slice(0, 20).forEach((leader, idx) => {
          players.push({
            category: 'goals',
            rank: idx + 1,
            player_name: leader.athlete.displayName,
            player_photo: leader.athlete.headshot ? leader.athlete.headshot.href : '',
            team: leader.athlete.team.displayName,
            team_code: leader.athlete.team.abbreviation || '',
            value: leader.value,
            updated_at: data.timestamp || new Date().toISOString(),
            player_external_id: parseInt(leader.athlete.id, 10) || 0,
          });
        });
      }

      if (assistsCategory && assistsCategory.leaders) {
        assistsCategory.leaders.slice(0, 20).forEach((leader, idx) => {
          players.push({
            category: 'assists',
            rank: idx + 1,
            player_name: leader.athlete.displayName,
            player_photo: leader.athlete.headshot ? leader.athlete.headshot.href : '',
            team: leader.athlete.team.displayName,
            team_code: leader.athlete.team.abbreviation || '',
            value: leader.value,
            updated_at: data.timestamp || new Date().toISOString(),
            player_external_id: parseInt(leader.athlete.id, 10) || 0,
          });
        });
      }

      if (players.length === 0) {
        res.writeHead(200);
        res.end(JSON.stringify({ players: [] }));
        return;
      }

      console.log(`[${new Date().toISOString()}] Got ${players.length} scorer entries from ESPN`);
      res.writeHead(200);
      res.end(JSON.stringify({ players }));
    } catch (err) {
      console.log(`[${new Date().toISOString()}] ESPN scorers failed: ${err.message}`);
      res.writeHead(200);
      res.end(JSON.stringify({ players: [] }));
    }

  } else if (parsed.pathname === '/api/lineups') {
    const matchId = parsed.query.matchId;
    if (!matchId) { res.writeHead(400); res.end(JSON.stringify({ error: 'matchId required' })); return; }

    const ESPN_API_BASE = process.env.ESPN_API_BASE || 'https://site.api.espn.com';
    const summaryUrl = `${ESPN_API_BASE}/apis/site/v2/sports/soccer/fifa.world/summary?event=${matchId}`;

    try {
      const data = await fetchJson(summaryUrl);
      const rosters = data.rosters || [];
      const lineups = rosters.map(roster => ({
        team: roster.team?.displayName || '',
        team_flag: roster.team?.logo || '',
        side: roster.homeAway || '',
        formation: roster.formation || '',
        players: (roster.roster || []).map(p => ({
          name: p.athlete?.displayName || '',
          number: p.jersey || '',
          position: p.position?.abbreviation || '',
          starter: p.starter || false,
        })),
      }));

      // Extraer sustituciones de keyEvents
      const homeTeamId = rosters.find(r => r.homeAway === 'home')?.team?.id;
      const substitutions = (data.keyEvents || [])
        .filter(e => e.type?.type === 'substitution' && e.participants?.length >= 2)
        .map(e => {
          const playerIn = e.participants[0]?.athlete;
          const playerOut = e.participants[1]?.athlete;
          if (!playerIn || !playerOut) return null;
          const clockVal = e.clock?.displayValue || '';
          const minute = parseInt(clockVal, 10) || 0;
          const teamSide = e.team?.id === homeTeamId ? 'home' : 'away';
          return {
            id: `sub-${e.id}`,
            match_id: matchId,
            team: teamSide,
            type: 'sub',
            player: playerIn.displayName,
            assist: playerOut.displayName,
            minute,
            created_at: e.wallclock || new Date().toISOString(),
          };
        })
        .filter(Boolean);

      res.writeHead(200);
      res.end(JSON.stringify({ lineups, substitutions }));
    } catch (err) {
      res.writeHead(200);
      res.end(JSON.stringify({ lineups: [], substitutions: [] }));
    }

  } else if (parsed.pathname === '/api/v1') {
    const { status, id, dates } = parsed.query;
    const ESPN_API_BASE = process.env.ESPN_API_BASE || 'https://site.api.espn.com';
    const ESPN_SCOREBOARD = `${ESPN_API_BASE}/apis/site/v2/sports/soccer/fifa.world/scoreboard`;

    try {
      const params = new URLSearchParams();
      if (dates) params.set('dates', dates);
      else if (status === 'scheduled' || status === 'finished' || !status) params.set('dates', '20260611-20260720');

      const targetUrl = params.toString() ? `${ESPN_SCOREBOARD}?${params.toString()}` : ESPN_SCOREBOARD;
      console.log(`[${new Date().toISOString()}] ESPN: status=${status || 'all'}, id=${id || 'none'}`);

      const espnData = await fetchJson(targetUrl, { 'User-Agent': 'NexaTV/1.0' });
      let matches = (espnData.events || []).map(transformEspnEvent).filter(Boolean);

      if (status) matches = matches.filter(m => m.status === status);
      if (id) matches = matches.filter(m => m.id === id);

      res.writeHead(200);
      res.end(JSON.stringify(matches));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: `Failed to fetch from ESPN: ${err.message}` }));
    }

  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found. Use /api/streams?matchId={id}, /api/standings, /api/bracket, /api/scorers, or /api/v1?status={status}' }));
  }
});

server.listen(PORT, () => {
  console.log(`🎬 NexaTV proxy running on http://localhost:${PORT}`);
  console.log(`   GET /api/streams?matchId={id}`);
  console.log(`   GET /api/standings`);
  console.log(`   GET /api/bracket`);
  console.log(`   GET /api/scorers`);
  console.log(`   GET /api/v1?status={live|scheduled|finished}`);
});
