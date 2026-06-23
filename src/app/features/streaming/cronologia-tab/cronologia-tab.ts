import { Component, input, computed, signal, effect } from '@angular/core';
import { MatchEvent, EventType } from '../../../core/models/match-model';
import { sortEventsByMinuteAndCreatedAt } from '../../../shared/utils/event-sort-util';

@Component({
  selector: 'app-cronologia-tab',
  standalone: true,
  template: `
    @if (hasError()) {
      <div class="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-medium">
        <span>⚠️</span>
        <span>Error de conexión</span>
      </div>
    }

    @if (sortedEvents().length > 0) {
      <div class="space-y-3">
        @for (event of sortedEvents(); track event.id) {
          <div
            [class]="(event.team === 'home'
              ? 'flex items-center gap-3'
              : 'flex items-center gap-3 flex-row-reverse')
              + (isNewEvent(event.id) ? ' animate-fade-in' : '')"
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
  hasError = input<boolean>(false);

  readonly sortedEvents = computed(() =>
    sortEventsByMinuteAndCreatedAt(this.events())
  );

  // Track previously seen IDs for fade-in animation
  private readonly knownIds = signal<Set<string>>(new Set());

  readonly newEventIds = computed(() => {
    const current = new Set(this.events().map(e => e.id));
    const known = this.knownIds();
    const newIds = new Set<string>();
    for (const id of current) {
      if (!known.has(id)) newIds.add(id);
    }
    return newIds;
  });

  constructor() {
    // After rendering new events, mark them as known for subsequent updates
    effect(() => {
      const currentIds = new Set(this.events().map(e => e.id));
      // Schedule knownIds update after current change detection cycle
      queueMicrotask(() => {
        this.knownIds.set(currentIds);
      });
    });
  }

  isNewEvent(id: string): boolean {
    return this.newEventIds().has(id);
  }

  getEventIcon(type: EventType): string {
    return getEventIcon(type);
  }
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
