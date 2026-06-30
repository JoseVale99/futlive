/**
 * Vercel Serverless Function — ESPN API proxy para partidos del Mundial.
 * Reemplaza la dependencia de Supabase para la tabla "matches".
 *
 * Endpoint: /api/espn?status=live|scheduled|finished
 *           /api/espn?id=<espn_event_id>
 *
 * Usa: https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
 */

const ESPN_BASE = `${process.env.ESPN_API_BASE}/apis/site/v2/sports/soccer/fifa.world/scoreboard`;

// Mapeo de estado ESPN → estado interno
function mapStatus(state) {
  if (state === 'pre') return 'scheduled';
  if (state === 'in') return 'live';
  if (state === 'post') return 'finished';
  return 'scheduled';
}

// Mapeo de tipo de evento ESPN → tipo interno
function mapEventType(detail) {
  const text = (detail.type?.text || '').toLowerCase();
  if (detail.redCard) return 'red';
  if (detail.yellowCard) return 'yellow';
  if (detail.ownGoal) return 'own_goal';
  if (detail.penaltyKick && detail.scoringPlay) return 'penalty';
  if (detail.scoringPlay) return 'goal';
  // Sustituciones no vienen en "details" de ESPN scoreboard
  return null;
}

// Determina si un competidor es home o away y extrae la abreviatura de bandera
function getFlag(team) {
  // ESPN logo URL pattern: .../countries/500/xxx.png
  const match = team.logo?.match(/countries\/500\/(\w+)\.png/);
  return match ? `https://a.espncdn.com/i/teamlogos/countries/500/${match[1]}.png` : (team.logo || '');
}

// Transforma un evento ESPN al modelo Match
function transformEvent(event) {
  const comp = event.competitions?.[0];
  if (!comp) return null;

  const status = mapStatus(comp.status?.type?.state);
  const home = comp.competitors?.find(c => c.homeAway === 'home');
  const away = comp.competitors?.find(c => c.homeAway === 'away');

  if (!home || !away) return null;

  // Extraer stage de la season del evento
  const stage = event.season?.slug?.replace(/-/g, ' ') || comp.altGameNote || '';

  // Extraer group_name si aplica
  const groupNote = (comp.notes || []).find(n => n.headline?.toLowerCase().includes('group'));
  const group_name = groupNote?.headline || null;

  // Calcular time_elapsed desde el displayClock
  let time_elapsed = null;
  if (status === 'live') {
    const clock = comp.status?.displayClock;
    if (clock) {
      const mins = parseInt(clock, 10);
      if (!isNaN(mins)) time_elapsed = mins;
    }
  }

  // Eventos detallados (goles, tarjetas)
  const events = (comp.details || [])
    .map(d => {
      const type = mapEventType(d);
      if (!type) return null;

      const teamId = d.team?.id;
      const team = teamId === home.id ? 'home' : 'away';
      const athlete = d.athletesInvolved?.[0];
      if (!athlete) return null;
      const clockVal = d.clock?.displayValue || '';
      const minute = parseInt(clockVal, 10) || 0;

      return {
        id: `${event.id}-${clockVal}-${type}-${athlete.id || 'unknown'}`,
        match_id: event.id,
        team,
        type,
        player: athlete.displayName || 'Jugador desconocido',
        assist: null,
        minute,
        created_at: event.date,
      };
    })
    .filter(Boolean);

  // Estadísticas por equipo
  const stats = [];
  for (const competitor of [home, away]) {
    const teamSide = competitor === home ? 'home' : 'away';
    const statMap = {};
    (competitor.statistics || []).forEach(s => {
      statMap[s.name] = parseFloat(s.displayValue) || 0;
    });

    if (Object.keys(statMap).length > 0) {
      stats.push({
        match_id: event.id,
        team: teamSide,
        possession: statMap.possessionPct || 0,
        shots: statMap.totalShots || 0,
        shots_on_target: statMap.shotsOnTarget || 0,
        corners: statMap.wonCorners || 0,
        fouls: statMap.foulsCommitted || 0,
      });
    }
  }

  // Goles (para compatibilidad)
  const goals = events
    .filter(e => e.type === 'goal' || e.type === 'own_goal' || e.type === 'penalty')
    .map(e => ({ team: e.team, scorer: e.player, minute: e.minute }));

  return {
    id: event.id,
    external_id: event.uid || event.id,
    competition: 'FIFA World Cup 2026',
    stage,
    group_name,
    home_team: home.team?.displayName || home.team?.name || '',
    away_team: away.team?.displayName || away.team?.name || '',
    home_flag: getFlag(home.team),
    away_flag: getFlag(away.team),
    kickoff_at: comp.startDate || event.date,
    status,
    home_score: home.score !== undefined ? parseInt(home.score, 10) : null,
    away_score: away.score !== undefined ? parseInt(away.score, 10) : null,
    time_elapsed,
    updated_at: new Date().toISOString(),
    venue_name: comp.venue?.fullName || event.venue?.displayName || '',
    venue_city: comp.venue?.address?.city || '',
    goals: goals.length > 0 ? goals : undefined,
    events: events.length > 0 ? events : undefined,
    stats: stats.length > 0 ? stats : undefined,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { status, id, dates } = req.query;

  try {
    // Construir URL de ESPN
    const baseUrl = ESPN_BASE;

    // Si piden por ID específico, una sola request
    if (id) {
      const params = new URLSearchParams();
      params.set('dates', '20260611-20260720');
      const response = await fetch(`${baseUrl}?${params}`, {
        headers: { 'User-Agent': 'NexaTV/1.0', 'Accept': 'application/json' },
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: `ESPN API error: ${response.status}` });
      }
      const data = await response.json();
      const matches = (data.events || []).map(transformEvent).filter(Boolean).filter(m => m.id === id);
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
      return res.status(200).json(matches);
    }

    // Si piden por fecha específica
    if (dates) {
      const params = new URLSearchParams();
      params.set('dates', dates);
      const response = await fetch(`${baseUrl}?${params}`, {
        headers: { 'User-Agent': 'NexaTV/1.0', 'Accept': 'application/json' },
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: `ESPN API error: ${response.status}` });
      }
      const data = await response.json();
      let matches = (data.events || []).map(transformEvent).filter(Boolean);
      if (status) matches = matches.filter(m => m.status === status);
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
      return res.status(200).json(matches);
    }

    // Rango dinámico: 40 días atrás desde hoy hasta 7 días adelante
    const today = new Date();
    const startDate = new Date(today.getTime() - 40 * 86400000);
    const endDate = new Date(today.getTime() + 7 * 86400000);

    const ranges = [];
    let cursor = new Date(startDate);
    while (cursor < endDate) {
      const rangeEnd = new Date(Math.min(cursor.getTime() + 10 * 86400000, endDate.getTime()));
      const from = cursor.toISOString().slice(0, 10).replace(/-/g, '');
      const to = rangeEnd.toISOString().slice(0, 10).replace(/-/g, '');
      ranges.push(`${from}-${to}`);
      cursor = new Date(rangeEnd.getTime() + 86400000);
    }

    const allMatches = [];
    const fetchPromises = ranges.map(range =>
      fetch(`${baseUrl}?dates=${range}`, {
        headers: { 'User-Agent': 'NexaTV/1.0', 'Accept': 'application/json' },
      }).then(r => r.ok ? r.json() : { events: [] }).catch(() => ({ events: [] }))
    );

    const results = await Promise.all(fetchPromises);
    const seenIds = new Set();
    for (const data of results) {
      for (const event of (data.events || [])) {
        const match = transformEvent(event);
        if (match && !seenIds.has(match.id)) {
          seenIds.add(match.id);
          allMatches.push(match);
        }
      }
    }

    // Filtrar por status si se especifica
    let matches = allMatches;
    if (status) {
      matches = matches.filter(m => m.status === status);
    }

    // Cache headers
    if (status === 'live') {
      res.setHeader('Cache-Control', 'no-store');
    } else {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    }

    return res.status(200).json(matches);
  } catch (err) {
    return res.status(500).json({
      error: 'Failed to fetch from ESPN API',
      detail: err.message,
    });
  }
};
