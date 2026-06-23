import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StreamService } from '../../../core/services/stream-service';
import { MatchService } from '../../../core/services/match-service';
import { IframePlayerComponent } from '../iframe-player/iframe-player';
import { ChannelSelectorComponent } from '../channel-selector/channel-selector';
import { Match } from '../../../core/models/match-model';
import { formatScore } from '../../../shared/utils/match-format-util';

@Component({
  selector: 'app-streaming-view',
  standalone: true,
  imports: [RouterLink, IframePlayerComponent, ChannelSelectorComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div class="max-w-6xl mx-auto flex items-center gap-4">
          <a routerLink="/" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg class="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </a>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white truncate">📺 Transmisión en vivo</h1>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-4 py-6">
        @if (this.streamService.loading()) {
          <!-- Loading State -->
          <div class="animate-pulse">
            <div class="aspect-video w-full max-w-[1280px] mx-auto bg-gray-200 dark:bg-gray-700 rounded-xl mb-6"></div>
            <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
            <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
        } @else if (this.streamService.error()) {
          <!-- Error State -->
          <div class="text-center py-12">
            <div class="text-5xl mb-4">⚠️</div>
            <p class="text-lg text-red-600 dark:text-red-400 font-semibold mb-4">{{ this.streamService.error() }}</p>
            <button
              (click)="this.streamService.fetchStreams(this.matchId())"
              class="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        } @else if (this.streamService.streams().length === 0) {
          <!-- No Streams -->
          <div class="text-center py-12">
            <div class="text-5xl mb-4">📺</div>
            <p class="text-lg text-gray-600 dark:text-gray-300 font-semibold">No hay transmisiones disponibles para este partido</p>
          </div>
        } @else {
          <!-- Match Info -->
          @if (this.match()) {
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6 border border-gray-100 dark:border-gray-700">
              <div class="flex items-center justify-between">
                <div class="text-center flex-1">
                  <p class="text-sm font-bold text-gray-900 dark:text-white">{{ this.match()!.home_team }}</p>
                </div>
                <div class="px-6 text-center">
                  <p class="text-3xl font-black text-gray-900 dark:text-white">{{ this.formatScore(this.match()!.home_score, this.match()!.away_score) }}</p>
                  @if (this.match()!.status === 'live') {
                    <p class="text-xs font-bold text-red-500 mt-1 flex items-center justify-center gap-1">
                      <span class="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                      {{ this.match()!.time_elapsed }}'
                    </p>
                  }
                </div>
                <div class="text-center flex-1">
                  <p class="text-sm font-bold text-gray-900 dark:text-white">{{ this.match()!.away_team }}</p>
                </div>
              </div>
            </div>
          }

          <!-- Player -->
          <div class="mb-6">
            <app-iframe-player [stream]="this.streamService.activeStream()" />
          </div>

          <!-- Channel Selector -->
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-gray-700">
            <app-channel-selector
              [streams]="this.streamService.streams()"
              [active]="this.streamService.activeStream()"
              (channelSelected)="this.streamService.selectStream($event)"
            />
          </div>
        }
      </div>
    </div>
  `
})
export class StreamingViewComponent implements OnInit {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  readonly streamService: StreamService = inject(StreamService);
  readonly matchService: MatchService = inject(MatchService);

  readonly matchId = signal<string>('');
  readonly match = signal<Match | null>(null);

  readonly formatScore = formatScore;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('matchId');
    if (id) {
      this.matchId.set(id);
      this.streamService.fetchStreams(id);
      const found = this.matchService.matches().find((m: Match) => m.id === id);
      if (found) this.match.set(found);
    } else {
      this.router.navigate(['/']);
    }
  }
}
