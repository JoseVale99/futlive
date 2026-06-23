/**
 * Vercel Serverless Function — Embed proxy/wrapper
 * Sirve un HTML wrapper que carga el iframe del stream.
 * Evita problemas de referrer y iframe-nesting.
 *
 * Usage: /api/embed?url=https://embedindia.st/embed/...
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'url query parameter required' });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  return res.status(200).send(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body,iframe{width:100%;height:100%;border:0;overflow:hidden;background:#000}</style>
</head><body>
<iframe src="${url}" allow="autoplay;fullscreen;encrypted-media;picture-in-picture" allowfullscreen style="width:100%;height:100%;border:0"></iframe>
</body></html>`);
};
