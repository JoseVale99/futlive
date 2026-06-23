/**
 * Vercel Serverless Function — Proxy de goleadores desde Supabase
 * Se despliega automáticamente en /api/scorers
 *
 * Intenta consultar la tabla top_scorers de Supabase.
 * Si no existe o está vacía, retorna datos de muestra.
 */

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

async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Cache headers: 5 min CDN cache
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/top_scorers?order=goals.desc,assists.desc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // If table doesn't exist (404) or empty, return sample data
    if (!response.ok || response.status === 404) {
      return res.status(200).json(SAMPLE_SCORERS);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(200).json(SAMPLE_SCORERS);
    }

    return res.status(200).json(data);
  } catch (err) {
    // On any error, return sample data as fallback
    return res.status(200).json(SAMPLE_SCORERS);
  }
}

module.exports = handler;
