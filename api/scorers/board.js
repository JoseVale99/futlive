/**
 * Vercel Serverless Function — Top scorers desde ESPN Statistics API
 * Se despliega en /api/scorers/board
 *
 * Devuelve formato { players: ScorersApiPlayer[] } compatible con el frontend.
 */

const ESPN_STATS_URL = `${process.env.ESPN_API_BASE}/apis/site/v2/sports/soccer/fifa.world/statistics`;

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const response = await fetch(ESPN_STATS_URL, {
      headers: { 'User-Agent': 'NexaTV/1.0' }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Error al obtener datos de ESPN statistics' });
    }

    const data = await response.json();
    const goalsCategory = data.stats?.find(s => s.name === 'goalsLeaders');
    const assistsCategory = data.stats?.find(s => s.name === 'assistsLeaders');

    const players = [];

    // Goals leaders
    if (goalsCategory && goalsCategory.leaders) {
      goalsCategory.leaders.slice(0, 20).forEach((leader, idx) => {
        players.push({
          category: 'goals',
          rank: idx + 1,
          player_name: leader.athlete.displayName,
          player_photo: leader.athlete.headshot?.href || '',
          team: leader.athlete.team.displayName,
          team_code: leader.athlete.team.abbreviation || '',
          value: leader.value,
          updated_at: data.timestamp || new Date().toISOString(),
          player_external_id: parseInt(leader.athlete.id, 10) || 0,
        });
      });
    }

    // Assists leaders
    if (assistsCategory && assistsCategory.leaders) {
      assistsCategory.leaders.slice(0, 20).forEach((leader, idx) => {
        players.push({
          category: 'assists',
          rank: idx + 1,
          player_name: leader.athlete.displayName,
          player_photo: leader.athlete.headshot?.href || '',
          team: leader.athlete.team.displayName,
          team_code: leader.athlete.team.abbreviation || '',
          value: leader.value,
          updated_at: data.timestamp || new Date().toISOString(),
          player_external_id: parseInt(leader.athlete.id, 10) || 0,
        });
      });
    }

    return res.status(200).json({ players });
  } catch (err) {
    return res.status(502).json({ error: 'Error de conexión con ESPN statistics' });
  }
}

module.exports = handler;
