/**
 * Vercel Serverless Function — Bracket/Knockout desde ESPN API.
 * Trae todos los partidos de la fase eliminatoria (R32, R16, QF, SF, Final)
 * y retorna el ganador de cada match para propagar el bracket en tiempo real.
 *
 * Formato de respuesta:
 * {
 *   matches: [
 *     { id, matchNum, round, date, status, home: { name, code, logo, score }, away: { ... }, winner: 'home'|'away'|null }
 *   ]
 * }
 */

const ESPN_BASE = `${process.env.ESPN_API_BASE}/apis/site/v2/sports/soccer/fifa.world/scoreboard`;

// ESPN calendar values por ronda
const ROUNDS = [
  { value: '2', label: 'Round of 32' },
  { value: '3', label: 'Round of 16' },
  { value: '4', label: 'Quarterfinals' },
  { value: '5', label: 'Semifinals' },
  { value: '6', label: '3rd-Place Match' },
  { value: '7', label: 'Final' },
];

// Mapeo de ESPN event IDs a match numbers FIFA (basado en la página de ESPN bracket)
const EVENT_ID_TO_MATCH_NUM = {
  // Round of 32
  '760486': 73, '760489': 74, '760488': 75, '760487': 76,
  '760492': 77, '760490': 78, '760491': 79, '760495': 80,
  '760494': 81, '760493': 82, '760496': 83, '760497': 84,
  '760498': 85, '760500': 86, '760501': 87, '760499': 88,
  // Round of 16
  '760503': 89, '760502': 90, '760504': 91, '760505': 92,
  '760506': 93, '760507': 94, '760509': 95, '760508': 96,
  // Quarterfinals
  '760510': 97, '760511': 98, '760512': 99, '760513': 100,
  // Semifinals
  '760514': 101, '760515': 102,
  // 3rd place
  '760516': 103,
  // Final
  '760517': 104,
};

function transformEvent(event) {
  const comp = event.competitions?.[0];
  if (!comp) return null;

  const status = comp.status?.type;
  const competitors = comp.competitors || [];

  const home = competitors.find(c => c.homeAway === 'home');
  const away = competitors.find(c => c.homeAway === 'away');

  let winner = null;
  if (status?.completed) {
    if (home?.winner) winner = 'home';
    else if (away?.winner) winner = 'away';
  }

  const matchNum = EVENT_ID_TO_MATCH_NUM[event.id] || null;

  return {
    id: event.id,
    matchNum,
    round: comp.altGameNote || '',
    date: event.date,
    status: status?.name || 'STATUS_SCHEDULED',
    statusDetail: status?.shortDetail || '',
    home: home ? {
      name: home.team?.displayName || 'TBD',
      code: home.team?.abbreviation || '',
      logo: home.team?.logo || '',
      score: home.score != null ? parseInt(home.score, 10) : null,
    } : null,
    away: away ? {
      name: away.team?.displayName || 'TBD',
      code: away.team?.abbreviation || '',
      logo: away.team?.logo || '',
      score: away.score != null ? parseInt(away.score, 10) : null,
    } : null,
    winner,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    // Fetch cada ronda en paralelo
    const fetches = ROUNDS.map(async (round) => {
      const url = `${ESPN_BASE}?dates=20260628-20260720&seasontype=${round.value}`;
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.events || []).map(transformEvent).filter(Boolean);
    });

    const results = await Promise.all(fetches);
    const matches = results.flat();

    // Si el filtro por seasontype no funciona, intentar traer todo por fecha
    if (matches.length === 0) {
      const fallbackUrl = `${ESPN_BASE}?dates=20260628-20260720`;
      const resp = await fetch(fallbackUrl, { headers: { 'Accept': 'application/json' } });
      if (resp.ok) {
        const data = await resp.json();
        const fallbackMatches = (data.events || []).map(transformEvent).filter(Boolean);
        return res.status(200).json({ matches: fallbackMatches });
      }
    }

    return res.status(200).json({ matches });
  } catch (err) {
    return res.status(500).json({ error: `Failed to fetch bracket: ${err.message}` });
  }
};
