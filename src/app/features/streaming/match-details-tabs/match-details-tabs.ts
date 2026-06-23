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
}

@Component({
  selector: 'app-match-details-tabs',
  standalone: true,
  imports: [CronologiaTabComponent, AlineacionesTabComponent, EstadisticasTabComponent],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
      <!-- Tab Bar -->
      <div class="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 scrollbar-hide">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            (click)="activeTab.set(tab.id)"
            [class]="activeTab() === tab.id
              ? 'flex-1 min-w-[120px] px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/20 whitespace-nowrap'
              : 'flex-1 min-w-[120px] px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 whitespace-nowrap transition-colors'"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Tab Panels -->
      <div class="p-4">
        @if (activeTab() === 'cronologia') {
          <app-cronologia-tab [events]="events()" />
        } @else if (activeTab() === 'alineaciones') {
          <app-alineaciones-tab [lineups]="lineups()" />
        } @else if (activeTab() === 'estadisticas') {
          <app-estadisticas-tab [stats]="stats()" />
        }
      </div>
    </div>
  `,
})
export class MatchDetailsTabsComponent {
  events = input<MatchEvent[]>([]);
  stats = input<MatchStats[]>([]);
  lineups = input<MatchLineup[]>([]);

  readonly tabs: Tab[] = [
    { id: 'cronologia', label: 'Cronología' },
    { id: 'alineaciones', label: 'Alineaciones' },
    { id: 'estadisticas', label: 'Estadísticas' },
  ];

  readonly activeTab = signal<TabId>('cronologia');
}
