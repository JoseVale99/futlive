/**
 * Vercel Serverless Function — Proxy de posiciones desde Supabase
 * Se despliega automáticamente en /api/standings
 */

const SUPABASE_URL = 'https://nmaopmcugunecbclfwzs.supabase.co/rest/v1';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tYW9wbWN1Z3VuZWNiY2xmd3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODc5ODEsImV4cCI6MjA5Njc2Mzk4MX0.Z2-LSY83JtAgX3mtR3_wxNfzUwkLJPyvhuIb2xT_eVM';

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
      `${SUPABASE_URL}/group_standings?order=group_name.asc,rank.asc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase responded with status ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: `Failed to fetch standings: ${err.message}` });
  }
}

module.exports = handler;
