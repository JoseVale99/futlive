/**
 * Vercel Serverless Function — Proxy de estadísticas desde lacancha.tv
 * Se despliega en /api/scorers/board
 */

const SCORERS_API = 'https://lacancha.tv/api/scorers/board';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const response = await fetch(SCORERS_API);

    if (!response.ok) {
      return res.status(502).json({ error: 'Error al obtener datos de goleadores' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Error de conexión con la API de estadísticas' });
  }
}

module.exports = handler;
