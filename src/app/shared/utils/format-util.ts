/**
 * Formatea el minuto de un evento como string con apóstrofe.
 * @param minute Minuto del evento.
 * @returns Minuto formateado (ej. "45'").
 */
export function formatMinute(minute: number): string {
  return `${minute}'`;
}
