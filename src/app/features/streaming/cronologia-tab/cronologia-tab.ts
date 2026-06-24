import { Component, input, computed, signal, effect } from '@angular/core';
import { MatchEvent, EventType } from '../../../core/models/match-model';
import { groupEventsByCategory } from '../../../shared/utils/event-group-util';
import { detectNewEventIds } from '../../../shared/utils/event-sort-util';
import { truncatePlayerName } from '../../../shared/utils/player-util';
import { formatMinute } from '../../../shared/utils/format-util';

export interface MaterialIconConfig {
  text: string;
  colorClass: string;
  fallbackEmoji: string;
}

const ICON_MAP: Record<EventType, MaterialIconConfig> = {
  goal: { text: 'sports_soccer', colorClass: '', fallbackEmoji: '⚽' },
  own_goal: { text: 'sports_soccer', colorClass: 'text-red-400', fallbackEmoji: '⚽🔴' },
  sub: { text: 'swap_horiz', colorClass: '', fallbackEmoji: '🔄' },
  yellow: { text: 'square', colorClass: 'text-yellow-400', fallbackEmoji: '🟨' },
  red: { text: 'square', colorClass: 'text-red-500', fallbackEmoji: '🟥' },
};

@Component({
  selector: 'app-cronologia-tab',
  standalone: true,
  template: `
    @if (hasError()) {
      <div class="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-xs font-medium">
        <span>⚠️</span>
        <span>Datos en vivo no disponibles — reintentando automáticamente</span>
      </div>
    }

    @if (groupedEvents().length > 0) {
      <div class="space-y-5">
        @for (category of groupedEvents(); track category.key) {
          <section>
            <h3 class="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
              {{ category.label }}
            </h3>
            <div class="space-y-3">
              @for (event of category.events; track event.id) {
                <div
                  [class]="getEventRowClass(event)"
                >
                  <div [class]="event.team === 'home'
                    ? 'flex items-center gap-2 flex-1 justify-start'
                    : 'flex items-center gap-2 flex-1 justify-end'"
                  >
                    @if (fontLoaded()) {
                      <span
                        class="material-symbols-outlined text-lg"
                        [class]="'material-symbols-outlined text-lg ' + getIcon(event.type).colorClass"
                      >{{ getIcon(event.type).text }}</span>
                    } @else {
                      <span class="text-lg">{{ getIcon(event.type).fallbackEmoji }}</span>
                    }
                    <div [class]="event.team === 'home' ? 'text-left' : 'text-right'">
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ truncateName(event.player) }}</p>
                      @if (event.assist) {
                        <p class="text-xs text-gray-500 dark:text-gray-400">Asist: {{ truncateName(event.assist) }}</p>
                      }
                    </div>
                  </div>
                  <span class="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full min-w-[40px] text-center">
                    {{ formatMin(event.minute) }}
                  </span>
                </div>
              }
            </div>
          </section>
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

  readonly fontLoaded = signal<boolean>(false);

  readonly groupedEvents = computed(() =>
    groupEventsByCategory(this.events())
  );

  private readonly knownIds = signal<Set<string>>(new Set());

  readonly newEventIds = computed(() =>
    detectNewEventIds(this.knownIds(), this.events())
  );

  constructor() {
    // Font detection with 3s timeout
    if (typeof document !== 'undefined' && document.fonts) {
      const timeout = new Promise<boolean>(resolve => setTimeout(() => resolve(false), 3000));
      const fontCheck = document.fonts.load('20px "Material Symbols Outlined"')
        .then(() => true)
        .catch(() => false);
      Promise.race([fontCheck, timeout]).then(loaded => {
        this.fontLoaded.set(loaded);
      });
    }

    // Track known IDs for animation detection
    effect(() => {
      const currentIds = new Set(this.events().map(e => e.id));
      queueMicrotask(() => {
        this.knownIds.set(currentIds);
      });
    });
  }

  isNewEvent(id: string): boolean {
    return this.newEventIds().has(id);
  }

  getIcon(type: EventType): MaterialIconConfig {
    return ICON_MAP[type] ?? { text: '●', colorClass: '', fallbackEmoji: '●' };
  }

  truncateName(name: string): string {
    return truncatePlayerName(name);
  }

  formatMin(minute: number): string {
    return formatMinute(minute);
  }

  getEventRowClass(event: MatchEvent): string {
    const base = event.team === 'home'
      ? 'flex items-center gap-3'
      : 'flex items-center gap-3 flex-row-reverse';
    const animation = this.isNewEvent(event.id) ? ' motion-safe:animate-fade-in' : '';
    return base + animation;
  }
}
