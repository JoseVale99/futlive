import { Component, input } from '@angular/core';
import { Match } from '../../../core/models/match-model';
import { CommonModule } from '@angular/common';
import { formatKickoffTime, formatScore, formatVenue, formatStageInfo } from '../../../shared/utils/match-format-util';
import { APP_CONSTANTS } from '../../../shared/constants/app-constants';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="group relative overflow-hidden bg-white dark:bg-gray-800/60 rounded-2xl shadow-lg hover:shadow-2xl dark:hover:shadow-blue-900/20 transition-all duration-300 hover:-translate-y-1">
      <!-- Gradient border top for live matches -->
      <div *ngIf="match().status === 'live'" class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>

      <div class="p-6">
        <!-- Header Info -->
        <div class="flex justify-between items-center mb-5 text-xs font-semibold">
          <span class="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{{ match().competition }}</span>
          <span class="text-gray-500 dark:text-gray-400">{{ formatStage(match()) }}</span>
        </div>

        <!-- Match Content -->
        <div class="grid grid-cols-3 items-center gap-4">
          <!-- Home Team -->
          <div class="flex flex-col items-center text-center">
            <div class="w-16 h-16 mb-3 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-full overflow-hidden border border-gray-100 dark:border-gray-600/50 shadow-sm">
              <img [src]="match().home_flag"
                   [alt]="match().home_team"
                   (error)="handleImageError($event)"
                   class="w-full h-full object-cover">
            </div>
            <span class="text-sm font-extrabold text-gray-900 dark:text-white line-clamp-2">{{ match().home_team }}</span>
          </div>

          <!-- Score / Time -->
          <div class="flex flex-col items-center justify-center">
            @if (match().status === 'scheduled') {
              <span class="text-2xl font-black text-gray-900 dark:text-white tracking-tighter mb-1">{{ formatTime(match().kickoff_at) }}</span>
              <span class="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">Hora Local</span>
            } @else {
              <span class="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">{{ formatScoreDisplay(match()) }}</span>
              @if (match().status === 'live') {
                <div class="flex items-center bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full border border-red-100 dark:border-red-800/50">
                  <span class="relative flex h-2.5 w-2.5 mr-2">
                    <span class="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <span class="text-xs font-bold text-red-600 dark:text-red-400">{{ match().time_elapsed }}'</span>
                </div>
              } @else {
                <span class="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold bg-gray-100 dark:bg-gray-700/50 px-3 py-1 rounded-full">Finalizado</span>
              }
            }
          </div>

          <!-- Away Team -->
          <div class="flex flex-col items-center text-center">
            <div class="w-16 h-16 mb-3 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-full overflow-hidden border border-gray-100 dark:border-gray-600/50 shadow-sm">
              <img [src]="match().away_flag"
                   [alt]="match().away_team"
                   (error)="handleImageError($event)"
                   class="w-full h-full object-cover">
            </div>
            <span class="text-sm font-extrabold text-gray-900 dark:text-white line-clamp-2">{{ match().away_team }}</span>
          </div>
        </div>

        <!-- Footer Info (Scheduled only) -->
        @if (match().status === 'scheduled') {
          <div class="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-center text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
            <svg class="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ formatVenueDisplay(match()) }}
          </div>
        }
      </div>
    </div>
  `
})
export class MatchCardComponent {
  match = input.required<Match>();

  formatTime(isoString: string): string {
    return formatKickoffTime(isoString);
  }

  formatScoreDisplay(match: Match): string {
    return formatScore(match.home_score, match.away_score);
  }

  formatVenueDisplay(match: Match): string {
    return formatVenue(match.venue_name, match.venue_city);
  }

  formatStage(match: Match): string {
    return formatStageInfo(match.stage, match.group_name);
  }

  handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = APP_CONSTANTS.IMAGES.FLAG_PLACEHOLDER; // Placeholder fallback
  }
}
