import { MatchEvent } from '../../core/models/match-model';

/**
 * Sorts events by minute ascending. For same minute, sorts by created_at ascending.
 * Returns new array (no mutation).
 */
export function sortEventsByMinuteAndCreatedAt(events: MatchEvent[]): MatchEvent[] {
  return [...events].sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    return a.created_at.localeCompare(b.created_at);
  });
}

/**
 * Merges incoming events into existing list without duplicates.
 * Deduplicates by event.id. Preserves insertion order of existing, appends truly new events.
 */
export function mergeEventsById(existing: MatchEvent[], incoming: MatchEvent[]): MatchEvent[] {
  const seenIds = new Set(existing.map(e => e.id));
  const merged = [...existing];
  for (const event of incoming) {
    if (!seenIds.has(event.id)) {
      merged.push(event);
      seenIds.add(event.id);
    }
  }
  return merged;
}
