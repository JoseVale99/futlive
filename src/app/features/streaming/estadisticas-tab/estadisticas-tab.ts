import { Component, input, computed } from '@angular/core';
import { MatchStats } from '../../../core/models/match-model';

export interface StatBar {
  label: string;
  homeValue: number;
  awayValue: number;
  homeWidth: number;
  awayWidth: number;
}

@Component({
  selector: 'app-estadisticas-tab',
  standalone: true,
  template: `
    @if (statBars().length > 0) {
      <div class="space-y-4">
        @for (stat of statBars(); track stat.label) {
          <div class="space-y-1">
            <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span class="font-semibold text-gray-900 dark:text-white">{{ stat.homeValue }}</span>
              <span class="font-medium">{{ stat.label }}</span>
              <span class="font-semibold text-gray-900 dark:text-white">{{ stat.awayValue }}</span>
            </div>
            <div class="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
              <div
                class="bg-blue-500 rounded-l-full transition-all duration-500"
                [style.width.%]="stat.homeWidth"
              ></div>
              <div
                class="bg-red-500 rounded-r-full transition-all duration-500 ml-auto"
                [style.width.%]="stat.awayWidth"
              ></div>
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <p class="text-sm">Estadísticas no disponibles aún</p>
      </div>
    }
  `,
})
export class EstadisticasTabComponent {
  stats = input<MatchStats[]>([]);

  readonly statBars = computed(() => buildStatBars(this.stats()));
}

/** Pure function: calculates proportional bar widths for a stat pair */
export function calculateBarWidths(
  homeValue: number,
  awayValue: number
): { homeWidth: number; awayWidth: number } {
  const total = homeValue + awayValue;
  if (total === 0) return { homeWidth: 50, awayWidth: 50 };
  return {
    homeWidth: Math.round((homeValue / total) * 100),
    awayWidth: Math.round((awayValue / total) * 100),
  };
}

/** Pure function: builds stat bars from paired home/away MatchStats */
export function buildStatBars(stats: MatchStats[]): StatBar[] {
  const home = stats.find((s) => s.team === 'home');
  const away = stats.find((s) => s.team === 'away');
  if (!home || !away) return [];

  const statKeys: {
    key: keyof Pick<MatchStats, 'possession' | 'shots' | 'shots_on_target' | 'corners' | 'fouls'>;
    label: string;
  }[] = [
    { key: 'possession', label: 'Posesión' },
    { key: 'shots', label: 'Tiros' },
    { key: 'shots_on_target', label: 'Tiros al arco' },
    { key: 'corners', label: 'Córners' },
    { key: 'fouls', label: 'Faltas' },
  ];

  return statKeys.map(({ key, label }) => {
    const homeValue = home[key];
    const awayValue = away[key];
    const { homeWidth, awayWidth } = calculateBarWidths(homeValue, awayValue);
    return { label, homeValue, awayValue, homeWidth, awayWidth };
  });
}
