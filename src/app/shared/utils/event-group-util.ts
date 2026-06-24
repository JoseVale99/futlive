import { EventType, MatchEvent } from '../../core/models/match-model';

export interface EventCategory {
  key: 'goals' | 'substitutions' | 'cards';
  label: string;
  events: MatchEvent[];
}

const CATEGORY_ORDER: { key: EventCategory['key']; label: string; types: EventType[] }[] = [
  { key: 'goals', label: 'Goles', types: ['goal', 'own_goal'] },
  { key: 'substitutions', label: 'Sustituciones', types: ['sub'] },
  { key: 'cards', label: 'Tarjetas', types: ['yellow', 'red'] },
];

/**
 * Sorts events within a category by minute asc, then created_at asc,
 * then home before away for same minute/created_at.
 */
export function sortEventsWithinCategory(events: MatchEvent[]): MatchEvent[] {
  return [...events].sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    const createdCmp = a.created_at.localeCompare(b.created_at);
    if (createdCmp !== 0) return createdCmp;
    if (a.team === b.team) return 0;
    return a.team === 'home' ? -1 : 1;
  });
}

/**
 * Groups events into categories in fixed order: goals → substitutions → cards.
 * Omits empty categories. Sorts events within each category by minute asc,
 * created_at asc, home before away.
 */
export function groupEventsByCategory(events: MatchEvent[]): EventCategory[] {
  return CATEGORY_ORDER
    .map(({ key, label, types }) => ({
      key,
      label,
      events: sortEventsWithinCategory(events.filter(e => types.includes(e.type))),
    }))
    .filter(category => category.events.length > 0);
}
