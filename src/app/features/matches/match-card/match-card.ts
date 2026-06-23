import { Component, input, signal, inject, OnInit } from '@angular/core';
import { Match, Goal, MatchEvent } from '../../../core/models/match-model';
import { formatKickoffTime, formatScore, formatVenue, formatStageInfo } from '../../../shared/utils/match-format-util';
import { APP_CONSTANTS } from '../../../shared/constants/app-constants';
import { StreamService } from '../../../core/services/stream-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-match-card',
  standalone: true,
  template: `
    <div class="group relative overflow-hidden bg-white dark:bg-gray-800/60 rounded-2xl shadow-lg hover:shadow-2xl dark:hover:shadow-blue-900/20 transition-all duration-300 hover:-translate-y-0.5 w-full">
      <!-- Gradient border top for live matches -->
      @if (match().status === 'live') {
        <div class="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-red-500 to-orange-500"></div>
      }

      <div class="p-5 sm:p-6">
        <!-- Header Info -->
        <div class="flex justify-between items-center mb-5 text-xs font-semibold">
          <span class="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{{ match().competition }}</span>
          <span class="text-gray-500 dark:text-gray-400">{{ formatStage(match()) }}</span>
        </div>

        <!-- Match Content -->
        <div class="grid grid-cols-3 items-center gap-4 mb-6">
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

        <!-- Action Buttons -->
        @if (match().status === 'live' && hasStream()) {
          <div class="mb-6">
            <button
              (click)="watchLive()"
              class="w-full py-3 bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl font-black text-sm shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              VER EN VIVO
            </button>
          </div>
        }

        <!-- Goals Only (Main View) -->
        @if (goalEvents().length) {
          <div class="mb-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
            <div class="grid grid-cols-2 gap-4">
              <!-- Home Goals -->
              <div class="space-y-1.5">
                @for (goal of homeGoalEvents(); track goal.id) {
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] text-gray-400 dark:text-gray-500 font-bold">{{ goal.minute }}'</span>
                    <span class="text-xs text-gray-800 dark:text-gray-200 font-semibold">{{ goal.player }}</span>
                    <svg class="w-3.5 h-3.5 shrink-0 ml-auto" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10.5" stroke="#333" stroke-width="1.2" fill="white"/>
                      <polygon points="12,6.5 15.5,9.5 14.5,14 9.5,14 8.5,9.5" fill="#222" stroke="#222" stroke-width="0.3"/>
                      <line x1="12" y1="6.5" x2="12" y2="1.5" stroke="#333" stroke-width="0.7"/>
                      <line x1="15.5" y1="9.5" x2="21" y2="7.5" stroke="#333" stroke-width="0.7"/>
                      <line x1="14.5" y1="14" x2="19" y2="19" stroke="#333" stroke-width="0.7"/>
                      <line x1="9.5" y1="14" x2="5" y2="19" stroke="#333" stroke-width="0.7"/>
                      <line x1="8.5" y1="9.5" x2="3" y2="7.5" stroke="#333" stroke-width="0.7"/>
                    </svg>
                  </div>
                }
              </div>
              <!-- Away Goals -->
              <div class="space-y-1.5">
                @for (goal of awayGoalEvents(); track goal.id) {
                  <div class="flex items-center justify-end gap-2">
                    <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10.5" stroke="#333" stroke-width="1.2" fill="white"/>
                      <polygon points="12,6.5 15.5,9.5 14.5,14 9.5,14 8.5,9.5" fill="#222" stroke="#222" stroke-width="0.3"/>
                      <line x1="12" y1="6.5" x2="12" y2="1.5" stroke="#333" stroke-width="0.7"/>
                      <line x1="15.5" y1="9.5" x2="21" y2="7.5" stroke="#333" stroke-width="0.7"/>
                      <line x1="14.5" y1="14" x2="19" y2="19" stroke="#333" stroke-width="0.7"/>
                      <line x1="9.5" y1="14" x2="5" y2="19" stroke="#333" stroke-width="0.7"/>
                      <line x1="8.5" y1="9.5" x2="3" y2="7.5" stroke="#333" stroke-width="0.7"/>
                    </svg>
                    <span class="text-xs text-gray-800 dark:text-gray-200 font-semibold">{{ goal.player }}</span>
                    <span class="text-[10px] text-gray-400 dark:text-gray-500 font-bold">{{ goal.minute }}'</span>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- Possession Bar (always visible for live/finished) -->
        @if (match().status === 'live' || match().status === 'finished') {
          <div class="mb-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-bold text-gray-600 dark:text-gray-400">50%</span>
              <span class="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">Posesión</span>
              <span class="text-[11px] font-bold text-gray-600 dark:text-gray-400">50%</span>
            </div>
            <div class="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
              <div class="h-full bg-linear-to-r from-blue-400 to-blue-600 rounded-l-full" style="width: 50%;"></div>
              <div class="h-full bg-linear-to-r from-orange-400 to-orange-600 rounded-r-full" style="width: 50%;"></div>
            </div>
          </div>
        }

        <!-- Expandable Stats Tab -->
        @if (hasDetailedEvents()) {
          <div class="border-t border-gray-100 dark:border-gray-700/50">
            <button (click)="toggleDetails()" class="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">
              <svg class="w-4 h-4 transition-transform duration-200" [class.rotate-180]="showDetails()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
              {{ showDetails() ? 'Ocultar estadísticas' : 'Ver estadísticas' }}
            </button>

            @if (showDetails()) {
              <div class="pb-4 px-2 space-y-2 animate-fade-in">
                @for (event of nonGoalEvents(); track event.id) {
                  <div class="flex items-center gap-2 text-xs py-1" [class]="event.team === 'home' ? '' : 'flex-row-reverse text-right'">
                    @if (event.type === 'yellow') {
                      <div class="w-3 h-4 bg-yellow-400 rounded-sm shrink-0 shadow-sm"></div>
                    } @else if (event.type === 'red') {
                      <div class="w-3 h-4 bg-red-500 rounded-sm shrink-0 shadow-sm"></div>
                    } @else if (event.type === 'sub') {
                      <svg class="w-4 h-4 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
                      </svg>
                    }
                    <span class="text-[10px] text-gray-400 dark:text-gray-500 font-bold min-w-6">{{ event.minute }}'</span>
                    <div class="flex flex-col">
                      <span class="text-gray-800 dark:text-gray-200 font-semibold">{{ event.player }}</span>
                      @if (event.assist && event.type === 'sub') {
                        <span class="text-[10px] text-gray-400 dark:text-gray-500">↓ {{ event.assist }}</span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Venue Info -->
        <div class="pt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ formatVenueDisplay(match()) }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class MatchCardComponent implements OnInit {
  private readonly streamService = inject(StreamService);
  private readonly router = inject(Router);

  match = input.required<Match>();
  showDetails = signal(false);
  hasStream = signal(false);

  ngOnInit() {
    if (this.match().status === 'live') {
      this.streamService.checkAvailability(this.match().id).subscribe(available => {
        this.hasStream.set(available);
      });
    }
  }

  watchLive() {
    this.router.navigate(['/stream', this.match().id]);
  }

  toggleDetails() {
    this.showDetails.update(v => !v);
  }

  goalEvents(): MatchEvent[] {
    return (this.match().events || []).filter(e => e.type === 'goal').sort((a, b) => a.minute - b.minute);
  }

  homeGoalEvents(): MatchEvent[] {
    return this.goalEvents().filter(e => e.team === 'home');
  }

  awayGoalEvents(): MatchEvent[] {
    return this.goalEvents().filter(e => e.team === 'away');
  }

  nonGoalEvents(): MatchEvent[] {
    return (this.match().events || []).filter(e => e.type !== 'goal').sort((a, b) => a.minute - b.minute);
  }

  hasDetailedEvents(): boolean {
    return this.nonGoalEvents().length > 0;
  }

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

  homeGoals(): Goal[] {
    return this.match().goals?.filter(g => g.team === 'home') || [];
  }

  awayGoals(): Goal[] {
    return this.match().goals?.filter(g => g.team === 'away') || [];
  }

  handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = APP_CONSTANTS.IMAGES.FLAG_PLACEHOLDER;
  }
}
