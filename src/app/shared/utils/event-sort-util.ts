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
 * Deduplicates by event.id AND by composite key (player + minute + type + team)
 * to avoid showing the same goal multiple times from different polling responses.
 */
export function mergeEventsById(existing: MatchEvent[], incoming: MatchEvent[]): MatchEvent[] {
  const seenIds = new Set(existing.map(e => e.id));
  const seenKeys = new Set(existing.map(e => eventKey(e)));
  const merged = [...existing];

  for (const event of incoming) {
    const key = eventKey(event);
    if (!seenIds.has(event.id) && !seenKeys.has(key)) {
      merged.push(event);
      seenIds.add(event.id);
      seenKeys.add(key);
    }
  }
  return merged;
}

/** Composite key to identify semantically identical events */
function eventKey(e: MatchEvent): string {
  return `${e.team}|${e.type}|${e.player}|${e.minute}`;
}

/**
 * Detects IDs present in current events but absent from knownIds.
 * Useful for identifying newly arrived events in a polling cycle.
 */
export function detectNewEventIds(knownIds: Set<string>, current: MatchEvent[]): Set<string> {
  const newIds = new Set<string>();
  for (const event of current) {
    if (!knownIds.has(event.id)) {
      newIds.add(event.id);
    }
  }
  return newIds;
}
