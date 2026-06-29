/**
 * Vercel Serverless Function — Proxy de streams gratuitos para partidos en vivo.
 * Se despliega automáticamente en /api/streams?matchId={id}
 *
 * Fuentes:
 * - futbol-libres.su (canales deportivos con embed directo)
 * - ustream.to (canales 24/7 embebibles)
 * - Canales genéricos conocidos con URLs estables
 *
 * NO depende de lacancha.tv
 */

/**
 * Canales principales de futbol-libres.su
 * Solo incluye slugs verificados que existen en el sitio.
 */
const FUTBOL_LIBRE_CHANNELS = [
  { name: 'ESPN', slug: 'espn-1', priority: 1 },
  { name: 'ESPN Premium', slug: 'espn-premium', priority: 1 },
  { name: 'DSports', slug: 'directv-sports', priority: 1 },
  { name: 'Fox Sports', slug: 'fox-sports', priority: 1 },
  { name: 'TUDN', slug: 'tudn', priority: 1 },
  { name: 'TNT Sports', slug: 'tnt-sports', priority: 2 },
  { name: 'TyC Sports', slug: 'tyc-sports', priority: 2 },
  { name: 'Telemundo', slug: 'telemundo', priority: 2 },
];

/**
 * Canales de Pelota Libre TV (librepelota.su) — segunda fuente alternativa.
 * Mismos canales, dominio diferente.
 */
const PELOTA_LIBRE_CHANNELS = [
  { name: 'ESPN (PL)', slug: 'espn-1', priority: 2 },
  { name: 'ESPN Premium (PL)', slug: 'espn-premium', priority: 2 },
  { name: 'DSports (PL)', slug: 'directv-sports', priority: 2 },
  { name: 'Fox Sports (PL)', slug: 'fox-sports', priority: 2 },
  { name: 'TUDN (PL)', slug: 'tudn', priority: 2 },
  { name: 'TNT Sports (PL)', slug: 'tnt-sports', priority: 3 },
  { name: 'TyC Sports (PL)', slug: 'tyc-sports', priority: 3 },
  { name: 'Win Sports+ (PL)', slug: 'win-sports-premium', priority: 3 },
];

/**
 * Genera la lista de streams disponibles para un partido.
 */
function buildStreams(matchId) {
  const streams = [];

  // Source 1: futbol-libres.su
  for (const ch of FUTBOL_LIBRE_CHANNELS) {
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
  for (const ch of PELOTA_LIBRE_CHANNELS) {
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

  // Source 3: Replay+ (replayplusapp.com) — transmite DSports, DSports+, DSports 2
  // Se embebe directamente su página de en-vivo que tiene reproductor integrado
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

  // Ordenar por prioridad (1 = mejor)
  streams.sort((a, b) => a.priority - b.priority);

  return streams;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { matchId } = req.query;

  if (!matchId) {
    return res.status(400).json({ error: 'matchId query parameter required' });
  }

  // Cache corto — los canales no cambian frecuentemente
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=60');

  try {
    const streams = buildStreams(matchId);

    return res.status(200).json({
      streams,
      matchId,
      count: streams.length,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to build streams', detail: err.message });
  }
};
