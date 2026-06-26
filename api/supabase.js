/**
 * Vercel Serverless Function — Proxy genérico a Supabase REST API.
 * Oculta la URL y API key del cliente.
 *
 * Usage: /api/supabase?table=matches&status=eq.live&order=kickoff_at.asc&select=*
 *
 * Params especiales (no se reenvían a Supabase):
 *   - table (requerido): nombre de la tabla/vista
 * Todo lo demás se pasa como query params a Supabase.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Tablas permitidas (whitelist para seguridad)
const ALLOWED_TABLES = new Set([
  'matches',
  'match_events',
  'match_stats',
  'match_streams',
  'match_lineups',
  'group_standings',
  'top_scorers',
]);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: missing Supabase credentials' });
  }

  const { table, ...queryParams } = req.query;

  if (!table) {
    return res.status(400).json({ error: 'table query parameter required' });
  }

  if (!ALLOWED_TABLES.has(table)) {
    return res.status(403).json({ error: `Table "${table}" not allowed` });
  }

  // Build Supabase URL with remaining query params
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }

  const supabaseEndpoint = `${SUPABASE_URL}/${table}${params.toString() ? '?' + params.toString() : ''}`;

  try {
    const response = await fetch(supabaseEndpoint, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Supabase error: ${response.status}`, detail: text });
    }

    const data = await response.json();

    // Cache: datos en vivo sin cache, el resto 30s
    const hasLiveFilter = Object.values(queryParams).some(v => String(v).includes('live'));
    if (hasLiveFilter) {
      res.setHeader('Cache-Control', 'no-store');
    } else {
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch from Supabase', detail: err.message });
  }
};
