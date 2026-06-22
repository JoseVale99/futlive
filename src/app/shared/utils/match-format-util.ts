/**
 * Formatea la fecha de inicio en formato HH:mm en la zona horaria local.
 * @param isoString Fecha en formato ISO.
 * @returns Fecha formateada.
 */
export function formatKickoffTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Formatea el marcador de un partido.
 * @param home Goles del equipo local.
 * @param away Goles del equipo visitante.
 * @returns Marcador formateado (ej. "2 - 1" o "- - -").
 */
export function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) return '- - -';
  return `${home} - ${away}`;
}

/**
 * Formatea la ubicación del partido.
 * @param venueName Nombre del estadio.
 * @param venueCity Ciudad del estadio.
 * @returns Ubicación formateada (ej. "Estadio Azteca, Ciudad de México").
 */
export function formatVenue(venueName: string, venueCity: string): string {
  if (!venueName) return venueCity || '';
  if (!venueCity) return venueName || '';
  return `${venueName}, ${venueCity}`;
}

/**
 * Formatea la información de la etapa del torneo.
 * @param stage Etapa (ej. "Group A").
 * @param groupName Nombre del grupo (puede ser nulo).
 * @returns Información formateada.
 */
export function formatStageInfo(stage: string, groupName: string | null): string {
  if (!groupName) return stage;
  return `${stage}${groupName ? ` - ${groupName}` : ''}`;
}
