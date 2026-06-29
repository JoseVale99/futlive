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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL y SUPABASE_KEY deben estar definidas como variables de entorno.');
  process.exit(1);
}

const PORT = 3001;

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

// --- Utilidades ---

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
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON from Supabase')); }
      });
    }).on('error', reject);
  });
}

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
    const clockVal = d.clock?.displayValue || '';
    const minute = parseInt(clockVal, 10) || 0;
    return {
      id: `${event.id}-${clockVal}-${type}-${athlete?.id || 'x'}`,
      match_id: event.id, team: teamSide, type,
      player: athlete?.displayName || 'Unknown',
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

// --- Streams (sin lacancha.tv) ---
function buildStreams(matchId) {
  const streams = [];

  // Source 1: futbol-libres.su — canales verificados
  const futbolLibreChannels = [
    { name: 'ESPN', slug: 'espn-1', priority: 1 },
    { name: 'ESPN Premium', slug: 'espn-premium', priority: 1 },
    { name: 'DSports', slug: 'directv-sports', priority: 1 },
    { name: 'Fox Sports', slug: 'fox-sports', priority: 1 },
    { name: 'TUDN', slug: 'tudn', priority: 1 },
    { name: 'TNT Sports', slug: 'tnt-sports', priority: 2 },
    { name: 'TyC Sports', slug: 'tyc-sports', priority: 2 },
    { name: 'Telemundo', slug: 'telemundo', priority: 2 },
  ];

  for (const ch of futbolLibreChannels) {
    streams.push({
      id: `fl-${streams.length}`,
      match_id: matchId,
      channel_id: null,
      embed_name: ch.name,
      embed_url: `https://futbol-libres.su/${ch.slug}/`,
      source: 'futbol-libre',
      stream_param: null,
      priority: ch.priority,
      created_at: new Date().toISOString(),
    });
  }

  // Source 2: librepelota.su (Pelota Libre TV) — mismos canales, otro dominio
  const pelotaLibreChannels = [
    { name: 'ESPN (PL)', slug: 'espn-1', priority: 2 },
    { name: 'ESPN Premium (PL)', slug: 'espn-premium', priority: 2 },
    { name: 'DSports (PL)', slug: 'directv-sports', priority: 2 },
    { name: 'Fox Sports (PL)', slug: 'fox-sports', priority: 2 },
    { name: 'TUDN (PL)', slug: 'tudn', priority: 2 },
    { name: 'TNT Sports (PL)', slug: 'tnt-sports', priority: 3 },
    { name: 'TyC Sports (PL)', slug: 'tyc-sports', priority: 3 },
    { name: 'Win Sports+ (PL)', slug: 'win-sports-premium', priority: 3 },
  ];

  for (const ch of pelotaLibreChannels) {
    streams.push({
      id: `pl-${streams.length}`,
      match_id: matchId,
      channel_id: null,
      embed_name: ch.name,
      embed_url: `https://librepelota.su/es/${ch.slug}/`,
      source: 'pelota-libre',
      stream_param: null,
      priority: ch.priority,
      created_at: new Date().toISOString(),
    });
  }

  // Source 3: Replay+ (replayplusapp.com) — DSports, DSports+, DSports 2
  streams.push({
    id: `rp-${streams.length}`,
    match_id: matchId,
    channel_id: null,
    embed_name: 'Replay+ (DSports/DSports+)',
    embed_url: 'https://www.replayplusapp.com/en-vivo',
    source: 'replay-plus',
    stream_param: null,
    priority: 1,
    created_at: new Date().toISOString(),
  });

  streams.sort((a, b) => a.priority - b.priority);
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

    console.log(`[${new Date().toISOString()}] Building streams for: ${matchId}`);
    const streams = buildStreams(matchId);
    res.writeHead(200);
    res.end(JSON.stringify({ streams, matchId, count: streams.length }));

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

  } else if (parsed.pathname === '/api/scorers') {
    try {
      console.log(`[${new Date().toISOString()}] Fetching scorers`);
      const supabaseUrl = `${SUPABASE_URL}/top_scorers?order=goals.desc,assists.desc`;
      const data = await fetchSupabase(supabaseUrl);
      if (!Array.isArray(data) || data.length === 0) {
        res.writeHead(200);
        res.end(JSON.stringify(SAMPLE_SCORERS));
      } else {
        res.writeHead(200);
        res.end(JSON.stringify(data));
      }
    } catch (err) {
      res.writeHead(200);
      res.end(JSON.stringify(SAMPLE_SCORERS));
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
      res.writeHead(200);
      res.end(JSON.stringify(lineups));
    } catch (err) {
      res.writeHead(200);
      res.end(JSON.stringify([]));
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
