import { LineupPlayer } from '../../core/models/live-data-model';

/**
 * Trunca el nombre del jugador si excede maxLength.
 * Agrega "…" al final si se trunca.
 */
export function truncatePlayerName(name: string, maxLength = 25): string {
  if (name.length > maxLength) {
    return name.slice(0, maxLength) + '…';
  }
  return name;
}

/**
 * Filtra solo jugadores titulares (is_starter === true).
 */
export function filterStarters(players: LineupPlayer[]): LineupPlayer[] {
  return players.filter((player) => player.is_starter === true);
}

/**
 * Ordena jugadores por número de camiseta ascendente.
 * Retorna un nuevo array sin mutar el original.
 */
export function sortByJerseyNumber(players: LineupPlayer[]): LineupPlayer[] {
  return [...players].sort((a, b) => a.number - b.number);
}
