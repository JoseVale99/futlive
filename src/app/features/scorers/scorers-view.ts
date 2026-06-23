import { Component, inject, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScorersService } from '../../core/services/scorers-service';
import { APP_CONSTANTS } from '../../shared/constants/app-constants';

@Component({
  selector: 'app-scorers-view',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-[#0a0e17] pb-24">
      <!-- Header -->
      <div class="sticky top-[60px] z-10 bg-gray-50/95 dark:bg-[#0a0e17]/95 backdrop-blur-md border-b border-gray-200 dark:border-white/5">
        <div class="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <a routerLink="/" class="p-2 -ml-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/5 transition-colors">
            <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <h1 class="text-lg font-bold text-gray-900 dark:text-white">Máximos Goleadores</h1>
        </div>
      </div>

      <!-- Content -->
      <div class="max-w-5xl mx-auto px-4 py-6">
        @if (scorersService.loading()) {
          <!-- Skeleton -->
          <div class="bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-white/5 p-4">
            @for (i of [1,2,3,4,5,6,7,8]; track i) {
              <div class="flex items-center gap-3 py-3 animate-pulse">
                <div class="w-6 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div class="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div class="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div class="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            }
          </div>
        } @else if (scorersService.error()) {
          <!-- Error state -->
          <div class="text-center py-12 bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-white/5">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
            </div>
            <p class="text-gray-500 dark:text-gray-400 text-sm mb-3">{{ scorersService.error() }}</p>
            <button (click)="scorersService.fetchScorers()" class="px-4 py-2 text-sm font-medium text-blue-500 hover:text-blue-600 border border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer">
              Reintentar
            </button>
          </div>
        } @else if (topScorers().length === 0) {
          <!-- Empty state -->
          <div class="text-center py-12 bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-white/5">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg class="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <p class="text-gray-500 dark:text-gray-400 text-sm">Datos de goleadores no disponibles</p>
          </div>
        } @else {
          <!-- Scorers list -->
          <div class="bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-white/5 overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
            @for (scorer of topScorers(); track scorer.rank) {
              <div [class]="scorer.rank === 1
                ? 'flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400'
                : scorer.rank <= 3
                  ? 'flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-white/[0.02]'
                  : 'flex items-center gap-3 px-4 py-3'">
                <!-- Rank -->
                <span [class]="scorer.rank === 1
                  ? 'w-7 text-center text-sm font-bold text-amber-600 dark:text-amber-400'
                  : scorer.rank <= 3
                    ? 'w-7 text-center text-sm font-bold text-gray-700 dark:text-gray-300'
                    : 'w-7 text-center text-sm font-medium text-gray-500 dark:text-gray-400'">
                  {{ scorer.rank }}
                </span>
                <!-- Flag -->
                <img [src]="scorer.team_flag" [alt]="scorer.team" class="w-6 h-6 rounded-sm object-cover" (error)="handleImgError($event)">
                <!-- Name + Team -->
                <div class="flex-1 min-w-0">
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">{{ scorer.player_name }}</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{ scorer.team }}</span>
                </div>
                <!-- Goals -->
                <div class="text-right">
                  <span class="text-sm font-bold text-gray-900 dark:text-white">{{ scorer.goals }}</span>
                  <span class="text-xs text-gray-400 dark:text-gray-500 ml-1">goles</span>
                </div>
                <!-- Assists -->
                <div class="text-right min-w-[50px]">
                  <span class="text-xs text-gray-600 dark:text-gray-300">{{ scorer.assists }}</span>
                  <span class="text-xs text-gray-400 dark:text-gray-500 ml-0.5">asist.</span>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class ScorersViewComponent implements OnInit {
  readonly scorersService = inject(ScorersService);

  readonly topScorers = computed(() => {
    const all = this.scorersService.scorers();
    return [...all].sort((a, b) => b.goals - a.goals).slice(0, 10);
  });

  ngOnInit() {
    this.scorersService.fetchScorers();
  }

  handleImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = APP_CONSTANTS.IMAGES.FLAG_PLACEHOLDER;
  }
}
