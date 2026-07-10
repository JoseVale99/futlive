import { Component, input, signal } from '@angular/core';
import { MatchEvent, MatchStats } from '../../../core/models/match-model';
import { MatchLineup } from '../../../core/models/live-data-model';
import { CronologiaTabComponent } from '../cronologia-tab/cronologia-tab';
import { AlineacionesTabComponent } from '../alineaciones-tab/alineaciones-tab';
import { EstadisticasTabComponent } from '../estadisticas-tab/estadisticas-tab';

export type TabId = 'cronologia' | 'alineaciones' | 'estadisticas';

export interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-match-details-tabs',
  standalone: true,
  imports: [CronologiaTabComponent, AlineacionesTabComponent, EstadisticasTabComponent],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
      <!-- Tab Bar: segmented control, scroll-snap on mobile -->
      <div class="p-1.5 m-1.5 bg-gray-100 dark:bg-gray-900/60 rounded-xl flex gap-1 overflow-x-auto scrollbar-hide">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            (click)="activeTab.set(tab.id)"
            [attr.aria-pressed]="activeTab() === tab.id"
            [class]="activeTab() === tab.id
              ? 'shrink-0 flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-lg bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm whitespace-nowrap transition-all'
              : 'shrink-0 flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 whitespace-nowrap transition-colors'"
          >
            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path [attr.d]="tab.icon" />
            </svg>
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Tab Panels -->
      <div class="px-4 pb-4 pt-2">
        @if (activeTab() === 'cronologia') {
          <app-cronologia-tab [events]="events()" [hasError]="hasError()" />
        } @else if (activeTab() === 'alineaciones') {
          <app-alineaciones-tab [lineups]="lineups()" />
        } @else if (activeTab() === 'estadisticas') {
          <app-estadisticas-tab [stats]="stats()" [consecutiveErrors]="consecutiveErrors()" />
        }
      </div>
    </div>
  `,
})
export class MatchDetailsTabsComponent {
  events = input<MatchEvent[]>([]);
  stats = input<MatchStats[]>([]);
  lineups = input<MatchLineup[]>([]);
  hasError = input<boolean>(false);
  consecutiveErrors = input<number>(0);

  readonly tabs: Tab[] = [
    { id: 'cronologia', label: 'Cronología', icon: 'M12 8v4l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z' },
    { id: 'alineaciones', label: 'Alineaciones', icon: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM2 21a8 8 0 0 1 16 0M22 21a6 6 0 0 0-6-6' },
    { id: 'estadisticas', icon: 'M3 3v18h18M7 16V9m5 7V5m5 14v-8', label: 'Estadísticas' },
  ];

  readonly activeTab = signal<TabId>('cronologia');
}
