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
    <div class="bg-white dark:bg-white/10 dark:backdrop-blur-md dark:border-white/20 dark:ring-1 dark:ring-white/10 rounded-2xl shadow-sm hover:shadow-xl dark:hover:ring-2 motion-safe:transition-all duration-200 hover:scale-[1.01] p-5 mb-4 border border-gray-100 group">
      <!-- Header Info -->
      <div class="flex justify-between items-center mb-4 text-xs font-medium text-gray-400 dark:text-gray-500">
        <span>{{ match().competition }}</span>
        <span>{{ formatStage(match()) }}</span>
      </div>

      <!-- Match Content -->
      <div class="grid grid-cols-3 items-center gap-4">
        <!-- Home Team -->
        <div class="flex flex-col items-center text-center">
          <div class="w-12 h-12 mb-2 flex items-center justify-center bg-gray-50 dark:bg-white/10 rounded-full overflow-hidden border border-gray-100 dark:border-white/10">
            <img [src]="match().home_flag"
                 [alt]="match().home_team"
                 (error)="handleImageError($event)"
                 class="w-full h-full object-cover">
          </div>
          <span class="text-sm font-bold text-gray-800 dark:text-white line-clamp-2">{{ match().home_team }}</span>
        </div>

        <!-- Score / Time -->
        <div class="flex flex-col items-center justify-center">
          @if (match().status === 'scheduled') {
            <span class="text-xl font-black text-gray-900 dark:text-white tracking-tighter">{{ formatTime(match().kickoff_at) }}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-widest font-bold">Local Time</span>
          } @else {
            <span class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{{ formatScoreDisplay(match()) }}</span>
            @if (match().status === 'live') {
              <div class="flex items-center mt-1">
                <span class="relative flex h-2 w-2 mr-2">
                  <span class="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span class="text-xs font-bold text-red-500 dark:text-red-400 motion-safe:animate-pulse">{{ match().time_elapsed }}'</span>
              </div>
            } @else {
              <span class="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-widest font-bold">Finalizado</span>
            }
          }
        </div>

        <!-- Away Team -->
        <div class="flex flex-col items-center text-center">
          <div class="w-12 h-12 mb-2 flex items-center justify-center bg-gray-50 dark:bg-white/10 rounded-full overflow-hidden border border-gray-100 dark:border-white/10">
            <img [src]="match().away_flag"
                 [alt]="match().away_team"
                 (error)="handleImageError($event)"
                 class="w-full h-full object-cover">
          </div>
          <span class="text-sm font-bold text-gray-800 dark:text-white line-clamp-2">{{ match().away_team }}</span>
        </div>
      </div>

      <!-- Footer Info (Scheduled only) -->
      @if (match().status === 'scheduled') {
        <div class="mt-4 pt-4 border-t border-gray-50 dark:border-white/10 flex items-center justify-center text-[10px] text-gray-400 dark:text-gray-500 font-medium">
          <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {{ formatVenueDisplay(match()) }}
        </div>
      }
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
