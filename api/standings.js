/**
 * Vercel Serverless Function — Posiciones desde ESPN API (datos en tiempo real).
 * Transforma la respuesta de ESPN al formato GroupStanding[] que espera el frontend.
 */

const ESPN_STANDINGS_URL = process.env.ESPN_STANDINGS_URL;

function getStat(stats, name) {
  const stat = stats.find(s => s.name === name);
  return stat ? stat.value : 0;
}

function transformEspnToGroupStandings(espnData) {
  const standings = [];

  for (const group of espnData.children || []) {
    const groupName = group.name; // "Group A", "Group B", etc.
    const entries = group.standings?.entries || [];

    // Ordenar por rank
    const sorted = [...entries].sort((a, b) => getStat(a.stats, 'rank') - getStat(b.stats, 'rank'));

    for (const entry of sorted) {
      const team = entry.team;
      const stats = entry.stats || [];
      const note = entry.note;

      standings.push({
        group_name: groupName,
        rank: getStat(stats, 'rank'),
        team: team.displayName,
        team_code: team.abbreviation,
        team_external_id: parseInt(team.id, 10),
        team_logo: team.logos?.[0]?.href || null,
        played: getStat(stats, 'gamesPlayed'),
        win: getStat(stats, 'wins'),
        draw: getStat(stats, 'ties'),
        lose: getStat(stats, 'losses'),
        gf: getStat(stats, 'pointsFor'),
        ga: getStat(stats, 'pointsAgainst'),
        gd: getStat(stats, 'pointDifferential'),
        points: getStat(stats, 'points'),
        description: note?.description || null,
        form: null,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return standings;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const response = await fetch(ESPN_STANDINGS_URL, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `ESPN API responded with ${response.status}` });
    }

    const espnData = await response.json();
    const standings = transformEspnToGroupStandings(espnData);

    return res.status(200).json(standings);
  } catch (err) {
    return res.status(500).json({ error: `Failed to fetch standings: ${err.message}` });
  }
};
