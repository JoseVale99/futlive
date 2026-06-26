import { Match, MatchStatus } from '../../core/models/match-model';

/**
 * Máximo de minutos desde kickoff para considerar un partido como "live".
 * 90 min de juego + 30 min de tiempo extra/descanso = 120 min.
 */
const MAX_LIVE_MINUTES = 130;

/**
 * Calcula el status efectivo de un partido.
 * Si Supabase ya dice 'live' o 'finished', se respeta.
 * Si dice 'scheduled' pero el kickoff ya pasó (y no hace más de MAX_LIVE_MINUTES),
 * lo trata como 'live' en el frontend.
 */
export function getEffectiveStatus(match: Match): MatchStatus {
  // Si ya tiene status live o finished, respetar
  if (match.status === 'live' || match.status === 'finished') {
    return match.status;
  }

  // Si es scheduled, verificar si ya debería estar en vivo
  const kickoff = new Date(match.kickoff_at).getTime();
  const now = Date.now();
  const elapsedMinutes = (now - kickoff) / 60_000;

  // Ya pasó el kickoff pero no han pasado más de MAX_LIVE_MINUTES → live
  if (elapsedMinutes > 0 && elapsedMinutes <= MAX_LIVE_MINUTES) {
    return 'live';
  }

  // Pasó demasiado tiempo → probablemente finished (pero no lo marcamos, dejamos scheduled)
  // para no asumir que terminó sin confirmación del backend
  return match.status;
}

/**
 * Aplica el status efectivo a un match, retornando una copia con el status actualizado
 * y time_elapsed calculado si corresponde.
 */
export function applyEffectiveStatus(match: Match): Match {
  const effectiveStatus = getEffectiveStatus(match);

  if (effectiveStatus === match.status) {
    return match;
  }

  // Calcular time_elapsed aproximado
  const kickoff = new Date(match.kickoff_at).getTime();
  const elapsed = Math.round((Date.now() - kickoff) / 60_000);

  return {
    ...match,
    status: effectiveStatus,
    time_elapsed: match.time_elapsed ?? elapsed,
    home_score: match.home_score ?? 0,
    away_score: match.away_score ?? 0,
  };
}
