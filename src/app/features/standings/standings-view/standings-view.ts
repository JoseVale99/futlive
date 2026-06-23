import { Component, inject, OnInit } from '@angular/core';
import { StandingsService } from '../../core/services/standings-service';
import { StandingsTableComponent } from '../standings-table/standings-table';

@Component({
  selector: 'app-standings-view',
  standalone: true,
  imports: [StandingsTableComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div class="max-w-6xl mx-auto">
          <h1 class="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            🏆 Posiciones del Mundial
          </h1>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-4 py-6">
        @if (this.standingsService.loading()) {
          <!-- Loading Skeleton -->
          <div class="space-y-6">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden animate-pulse">
                <div class="h-12 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <div class="p-4">
                  <div class="space-y-3">
                    @for (j of [1, 2, 3, 4]; track j) {
                      <div class="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        } @else if (this.standingsService.error()) {
          <!-- Error State -->
          <div class="text-center py-12">
            <div class="text-5xl mb-4">⚠️</div>
            <p class="text-lg text-red-600 dark:text-red-400 font-semibold mb-4">{{ this.standingsService.error() }}</p>
            <button
              (click)="this.standingsService.fetchStandings()"
              class="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        } @else {
          <!-- Tables -->
          <div class="grid gap-6">
            @for ([group, teams] of Array.from(this.standingsService.groupedStandings().entries()); track group) {
              <app-standings-table [groupName]="group" [standings]="teams" />
            } @empty {
              <div class="text-center py-12">
                <div class="text-5xl mb-4">📊</div>
                <p class="text-lg text-gray-600 dark:text-gray-300 font-semibold">No hay posiciones disponibles</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class StandingsViewComponent implements OnInit {
  readonly standingsService: StandingsService = inject(StandingsService);

  ngOnInit(): void {
    this.standingsService.fetchStandings();
  }
}
