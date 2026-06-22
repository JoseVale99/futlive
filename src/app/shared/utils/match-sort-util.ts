import { Match } from '../../core/models/match-model';

/**
 * Ordena una lista de partidos por su fecha de inicio.
 * @param matches Lista de partidos a ordenar.
 * @param direction Dirección del ordenamiento ('asc' para ascendente, 'desc' para descendente).
 * @returns Una nueva lista de partidos ordenada.
 */
export function sortMatchesByKickoff(matches: Match[], direction: 'asc' | 'desc' = 'asc'): Match[] {
  return [...matches].sort((a, b) => {
    const dateA = new Date(a.kickoff_at).getTime();
    const dateB = new Date(b.kickoff_at).getTime();

    return direction === 'asc' ? dateA - dateB : dateB - dateA;
  });
}
