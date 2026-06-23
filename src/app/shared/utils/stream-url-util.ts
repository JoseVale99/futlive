export function buildSafeEmbedUrl(embedUrl: string): string | null {
  if (!embedUrl || embedUrl.trim() === '') return null;

  try {
    new URL(embedUrl);
    return embedUrl;
  } catch {
    return null;
  }
}
