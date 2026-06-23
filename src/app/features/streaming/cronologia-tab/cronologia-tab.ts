import { Component, input, computed } from '@angular/core';
import { MatchEvent, EventType } from '../../../core/models/match-model';

@Component({
  selector: 'app-cronologia-tab',
  standalone: true,
  template: `
    @if (sortedEvents().length > 0) {
      <div class="space-y-3">
        @for (event of sortedEvents(); track event.id) {
          <div [class]="event.team === 'home'
            ? 'flex items-center gap-3'
            : 'flex items-center gap-3 flex-row-reverse'"
          >
            <div [class]="event.team === 'home'
              ? 'flex items-center gap-2 flex-1 justify-start'
              : 'flex items-center gap-2 flex-1 justify-end'"
            >
              <span class="text-lg">{{ getEventIcon(event.type) }}</span>
              <div [class]="event.team === 'home' ? 'text-left' : 'text-right'">
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ event.player }}</p>
                @if (event.assist) {
                  <p class="text-xs text-gray-500 dark:text-gray-400">Asist: {{ event.assist }}</p>
                }
              </div>
            </div>
            <span class="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full min-w-[40px] text-center">
              {{ event.minute }}'
            </span>
          </div>
        }
      </div>
    } @else {
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <p class="text-sm">No hay eventos registrados</p>
      </div>
    }
  `,
})
export class CronologiaTabComponent {
  events = input<MatchEvent[]>([]);

  readonly sortedEvents = computed(() => sortEventsByMinute(this.events()));

  getEventIcon(type: EventType): string {
    return getEventIcon(type);
  }
}

/** Pure function: sorts events by minute ascending */
export function sortEventsByMinute(events: MatchEvent[]): MatchEvent[] {
  return [...events].sort((a, b) => a.minute - b.minute);
}

/** Pure function: maps event type to icon */
export function getEventIcon(type: EventType): string {
  const icons: Record<EventType, string> = {
    goal: '⚽',
    yellow: '🟨',
    red: '🟥',
    sub: '🔄',
  };
  return icons[type] ?? '•';
}
