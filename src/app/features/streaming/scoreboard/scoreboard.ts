import { Component, computed, effect, input, signal } from '@angular/core';
import { Match } from '../../../core/models/match-model';
import { LiveScoreData } from '../../../core/models/live-data-model';
import { formatScore } from '../../../shared/utils/match-format-util';

@Component({
  selector: 'app-scoreboard',
  standalone: true,
  template: `
    <div class="flex items-center justify-between py-2 px-3 rounded-xl shadow-sm bg-white dark:bg-gray-900">
      <!-- Home team -->
      <div class="flex items-center gap-2">
        <img
          [src]="match().home_flag"
          [alt]="match().home_team"
          class="w-8 h-8 object-contain"
        />
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[100px]">
          {{ match().home_team }}
        </span>
      </div>

      <!-- Score + live indicator -->
      <div class="flex flex-col items-center gap-1">
        @if (isLive()) {
          <div class="flex items-center gap-1.5">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span class="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase">
              {{ liveMinute() }}
            </span>
          </div>
        }

        <span
          class="text-lg font-bold text-gray-900 dark:text-gray-100"
          [class.animate-scale-up]="scoreChanged()"
        >
          {{ scoreText() }}
        </span>

        @if (showDisconnection()) {
          <div class="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M12 3l9.66 16.59A1 1 0 0 1 20.66 21H3.34a1 1 0 0 1-.86-1.41L12 3z" />
            </svg>
            <span class="text-[10px] font-medium">Sin conexión</span>
          </div>
        }
      </div>

      <!-- Away team -->
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[100px]">
          {{ match().away_team }}
        </span>
        <img
          [src]="match().away_flag"
          [alt]="match().away_team"
          class="w-8 h-8 object-contain"
        />
      </div>
    </div>
  `,
})
export class ScoreboardComponent {
  match = input.required<Match>();
  liveScore = input<LiveScoreData | null>(null);
  consecutiveErrors = input<number>(0);

  readonly scoreText = computed(() => {
    const live = this.liveScore();
    if (live) return formatScore(live.home_score, live.away_score);
    const m = this.match();
    return formatScore(m.home_score, m.away_score);
  });

  readonly isLive = computed(() => {
    const live = this.liveScore();
    return live?.status === 'live' || this.match().status === 'live';
  });

  readonly liveMinute = computed(() => {
    const live = this.liveScore();
    if (live?.time_elapsed) return `${live.time_elapsed}'`;
    const m = this.match();
    if (m.time_elapsed !== null) return `${m.time_elapsed}'`;
    return '';
  });

  readonly showDisconnection = computed(() => this.consecutiveErrors() >= 3);
  readonly scoreChanged = signal(false);

  private scoreChangeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    let previousScore: string | undefined;
    effect(() => {
      const current = this.scoreText();
      if (previousScore !== undefined && previousScore !== current) {
        this.scoreChanged.set(true);
        if (this.scoreChangeTimer) clearTimeout(this.scoreChangeTimer);
        this.scoreChangeTimer = setTimeout(() => this.scoreChanged.set(false), 2000);
      }
      previousScore = current;
    });
  }
}
