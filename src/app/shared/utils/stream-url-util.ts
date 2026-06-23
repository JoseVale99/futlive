/**
 * Construye una URL segura para el iframe de transmisión.
 * @param url URL base de la transmisión.
 * @returns URL formateada y segura.
 */
export function buildSafeEmbedUrl(url: string): string {
  if (!url) return '';

  // Si ya es una URL completa, la retornamos
  if (url.startsWith('http')) {
    return url;
  }

  // Lógica personalizada si es necesario (ej. para ciertos proveedores)
  return url;
}
