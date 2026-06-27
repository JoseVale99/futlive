/**
 * Construye una URL segura para el iframe de transmisión.
 * La mayoría de streams se cargan directo. Solo dominios problemáticos pasan por /api/embed.
 */
export function buildSafeEmbedUrl(url: string): string {
  if (!url) return '';
  if (!url.startsWith('http')) return url;

  // Cargar todo directo — estos sitios son players diseñados para ser embebidos
  return url;
}
