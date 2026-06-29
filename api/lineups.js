/**
 * Vercel Serverless Function — Alineaciones desde ESPN Summary API.
 * Endpoint: /api/lineups?matchId={espn_event_id}
 */

const ESPN_BASE = `${process.env.ESPN_API_BASE}/apis/site/v2/sports/soccer/fifa.world/summary`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { matchId } = req.query;

  if (!matchId) {
    return res.status(400).json({ error: 'matchId query parameter required' });
  }

  try {
    const url = `${ESPN_BASE}?event=${matchId}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();
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

    return res.status(200).json({ lineups, substitutions });
  } catch (err) {
    return res.status(200).json([]);
  }
};
