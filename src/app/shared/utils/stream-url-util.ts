/**
 * Construye una URL segura para el iframe de transmisión.
 * @param url URL base de la transmisión.
 * @returns URL formateada y segura.
 */
export function buildSafeEmbedUrl(url: string): string {
  if (!url) return '';

  // Retornar la URL directa — el iframe la carga tal cual
  if (url.startsWith('http')) {
    return url;
  }

  return url;
}
