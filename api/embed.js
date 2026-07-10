/**
 * Vercel Serverless Function — Proxy genérico de embeds.
 * Fetchea una URL externa con Referer: futbollibrex.net y devuelve el contenido.
 * Usado para cargar la12hd.com en iframe sin problemas de SSL/X-Frame-Options.
 *
 * Endpoint: /api/embed?url=https://la12hd.com/vivo/canal.php?stream=tudn_mx
 */

const ALLOWED_HOSTS = new Set([
  'la12hd.com',
  'la16hd.com',
  'futbollibrex.net',
]);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url query parameter required' });

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'invalid url' });
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return res.status(403).json({ error: 'host not allowed' });
  }

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const upstream = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Referer': 'https://futbollibrex.net/',
        'Origin': 'https://futbollibrex.net',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
      redirect: 'follow',
    });

    const contentType = upstream.headers.get('content-type') || 'text/html; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    const body = await upstream.text();
    return res.status(upstream.status).send(body);
  } catch (err) {
    return res.status(502).json({ error: 'upstream fetch failed', detail: err.message });
  } finally {
    clearTimeout(timeoutId);
  }
};