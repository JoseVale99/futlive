import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StreamService } from '../../../core/services/stream-service';
import { MatchService } from '../../../core/services/match-service';
import { LiveDataService } from '../../../core/services/live-data-service';
import { IframePlayerComponent } from '../iframe-player/iframe-player';
import { ChannelSelectorComponent } from '../channel-selector/channel-selector';
import { MatchDetailsTabsComponent } from '../match-details-tabs/match-details-tabs';
import { Match } from '../../../core/models/match-model';
import { formatScore } from '../../../shared/utils/match-format-util';

@Component({
  selector: 'app-streaming-view',
  standalone: true,
  imports: [RouterLink, IframePlayerComponent, ChannelSelectorComponent, MatchDetailsTabsComponent],
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
        @if (streamService.loading()) {
          <div class="animate-pulse space-y-4">
            <div class="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div class="aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        } @else if (streamService.error()) {
          <div class="text-center py-12">
            <div class="text-5xl mb-4">⚠️</div>
            <p class="text-lg text-red-600 dark:text-red-400 font-semibold mb-4">{{ streamService.error() }}</p>
            <button (click)="streamService.fetchStreams(matchId())" class="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              Intentar de nuevo
            </button>
          </div>
        } @else {
          <!-- Match Info Card -->
          @if (matchLoading()) {
            <div class="animate-pulse bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 mb-6 border border-gray-100 dark:border-gray-700">
              <div class="flex items-center justify-center gap-6">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600"></div>
                  <div class="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
                </div>
                <div class="text-center">
                  <div class="h-8 w-16 bg-gray-200 dark:bg-gray-600 rounded mx-auto"></div>
                  <div class="h-3 w-12 bg-gray-200 dark:bg-gray-600 rounded mx-auto mt-2"></div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
                  <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600"></div>
                </div>
              </div>
            </div>
          } @else if (matchError()) {
            <div class="text-center py-12">
              <div class="text-5xl mb-4">⚠️</div>
              <p class="text-lg text-red-600 dark:text-red-400 font-semibold mb-4">{{ matchError() }}</p>
              <button (click)="retryMatchLoad()" class="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                Intentar de nuevo
              </button>
            </div>
          } @else if (match()) {
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 mb-6 border border-gray-100 dark:border-gray-700">
              <div class="flex items-center justify-center gap-6">
                <div class="flex items-center gap-3">
                  <img [src]="match()!.home_flag" [alt]="match()!.home_team" class="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600">
                  <span class="text-sm font-bold text-gray-900 dark:text-white">{{ match()!.home_team }}</span>
                </div>
                <div class="text-center">
                  <p class="text-3xl font-black text-gray-900 dark:text-white">{{ formatScore(match()!.home_score, match()!.away_score) }}</p>
                  @if (match()!.status === 'live') {
                    <div class="flex items-center justify-center gap-1 mt-1">
                      <span class="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                      <span class="text-xs font-bold text-red-500">{{ match()!.time_elapsed }}'</span>
                    </div>
                  }
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-sm font-bold text-gray-900 dark:text-white">{{ match()!.away_team }}</span>
                  <img [src]="match()!.away_flag" [alt]="match()!.away_team" class="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600">
                </div>
              </div>
            </div>
          }

          <!-- Player -->
          <div class="mb-6">
            <app-iframe-player [stream]="streamService.activeStream()" />
          </div>

          <!-- Channel Selector -->
          @if (streamService.streams().length > 1) {
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border border-gray-100 dark:border-gray-700">
              <app-channel-selector
                [streams]="streamService.streams()"
                [active]="streamService.activeStream()"
                (channelSelected)="streamService.selectStream($event)"
              />
            </div>
          }

          <!-- Match Details Tabs -->
          <div class="mt-6">
            <app-match-details-tabs
              [events]="liveDataService.events()"
              [stats]="liveDataService.stats()"
              [lineups]="liveDataService.lineups()"
            />
          </div>
        }
      </div>
    </div>
  `
})
export class StreamingViewComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly streamService = inject(StreamService);
  private readonly matchService = inject(MatchService);
  readonly liveDataService = inject(LiveDataService);

  readonly matchId = signal('');
  readonly match = signal<Match | null>(null);
  readonly matchLoading = signal(true);
  readonly matchError = signal<string | null>(null);
  readonly formatScore = formatScore;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('matchId');
    if (!id) { this.router.navigate(['/']); return; }

    this.matchId.set(id);
    this.matchLoading.set(true);
    this.streamService.fetchStreams(id);

    this.matchService.fetchMatchById(id).subscribe(match => {
      this.match.set(match);
      this.matchLoading.set(false);
      if (match) {
        this.liveDataService.startPolling(id, match.status === 'live');
      } else {
        this.matchError.set('No se pudo cargar la información del partido');
        this.liveDataService.startPolling(id, false);
      }
    });
  }

  retryMatchLoad(): void {
    const id = this.matchId();
    if (!id) return;

    this.matchError.set(null);
    this.matchLoading.set(true);

    this.matchService.fetchMatchById(id).subscribe(match => {
      this.match.set(match);
      this.matchLoading.set(false);
      if (match) {
        this.liveDataService.startPolling(id, match.status === 'live');
      } else {
        this.matchError.set('No se pudo cargar la información del partido');
      }
    });
  }

  ngOnDestroy(): void {
    this.liveDataService.stopPolling();
  }
}
