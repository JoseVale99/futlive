import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StreamService } from '../../../core/services/stream-service';
import { MatchService } from '../../../core/services/match-service';
import { LiveDataService } from '../../../core/services/live-data-service';
import { IframePlayerComponent } from '../iframe-player/iframe-player';
import { ChannelSelectorComponent } from '../channel-selector/channel-selector';
import { MatchDetailsTabsComponent } from '../match-details-tabs/match-details-tabs';
import { ScoreboardComponent } from '../scoreboard/scoreboard';
import { Match } from '../../../core/models/match-model';

@Component({
  selector: 'app-streaming-view',
  standalone: true,
  imports: [RouterLink, IframePlayerComponent, ChannelSelectorComponent, MatchDetailsTabsComponent, ScoreboardComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div class="max-w-7xl mx-auto flex items-center gap-4">
          <a routerLink="/" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg class="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </a>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white truncate flex items-center gap-2">
            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2h-6l1 2h2v1H7v-1h2l1-2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v10h16V6H4zm6.5 2.5l5 2.5-5 2.5v-5z"/>
            </svg>
            {{ isFinished() ? 'Resumen del partido' : 'Transmisión en vivo' }}
          </h1>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 py-6">
        @if (streamService.loading()) {
          <div class="animate-pulse space-y-3">
            <div class="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div class="aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        } @else if (streamService.error()) {
          <div class="text-center py-16">
            <div class="relative w-32 h-32 mx-auto mb-6">
              <div class="absolute inset-2 rounded-xl border-2 border-gray-300/30 dark:border-gray-600/30 bg-gray-100/50 dark:bg-gray-800/50"></div>
              <div class="absolute inset-0 flex items-center justify-center animate-bounce">
                <div class="w-14 h-14 bg-white dark:bg-gray-200 rounded-full shadow-lg flex items-center justify-center">
                  <svg class="w-9 h-9 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 3.3l1.35-.95c1.82.56 3.37 1.76 4.38 3.34l-.39 1.34-1.35.46L13 7.45V5.3zm-3.35-.95L11 5.3v2.15L7.01 9.49l-1.35-.46-.39-1.34c1.01-1.58 2.56-2.78 4.38-3.34zM7.08 17.11l-1.14.1C4.73 15.81 4 13.99 4 12c0-.12.01-.23.02-.35l1-.73 1.38.48 1.46 4.34-.78 1.37zm7.42 2.48c-.79.26-1.63.41-2.5.41s-1.71-.15-2.5-.41l-.69-1.49.64-1.1h5.11l.64 1.11-.7 1.48zM14.27 15H9.73l-1.35-4.02L12 8.44l3.63 2.54L14.27 15zm3.79 2.21l-1.14-.1-.78-1.37 1.46-4.34 1.38-.48 1 .73c.01.12.02.23.02.35 0 1.99-.73 3.81-1.94 5.21z"/>
                  </svg>
                </div>
              </div>
            </div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Partido no disponible</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">{{ streamService.error() }}</p>
            <div class="flex items-center justify-center gap-3">
              <button (click)="streamService.fetchStreams(matchId())" class="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-green-600/20 transition-all hover:scale-105 active:scale-95">
                Reintentar
              </button>
              <a routerLink="/" class="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Ir al inicio
              </a>
            </div>
          </div>
        } @else {
          <div class="flex flex-col gap-3">
            <!-- Scoreboard -->
            @if (matchLoading()) {
              <div class="animate-pulse bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3">
                <div class="flex items-center justify-center gap-6">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600"></div>
                    <div class="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
                  </div>
                  <div class="text-center">
                    <div class="h-6 w-16 bg-gray-200 dark:bg-gray-600 rounded mx-auto"></div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600"></div>
                  </div>
                </div>
              </div>
            } @else if (matchError()) {
              <div class="text-center py-10">
                <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01M12 3l9.66 16.59A1 1 0 0 1 20.66 21H3.34a1 1 0 0 1-.86-1.41L12 3z"/>
                  </svg>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ matchError() }}</p>
                <button (click)="retryMatchLoad()" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                  Reintentar
                </button>
              </div>
            } @else if (match()) {
              <app-scoreboard
                [match]="match()!"
                [liveScore]="liveDataService.liveScore()"
                [consecutiveErrors]="liveDataService.consecutiveErrors()"
              />
            }

            <!-- Player + Channels (solo si NO es finished) -->
            @if (!isFinished()) {
              <app-iframe-player [stream]="streamService.activeStream()" />

              @if (streamService.streams().length === 1) {
                <app-channel-selector
                  [streams]="streamService.streams()"
                  [active]="streamService.activeStream()"
                  (channelSelected)="streamService.selectStream($event)"
                />
              } @else if (streamService.streams().length > 1) {
                <div class="p-3 rounded-xl">
                  <app-channel-selector
                    [streams]="streamService.streams()"
                    [active]="streamService.activeStream()"
                    (channelSelected)="streamService.selectStream($event)"
                  />
                </div>
              }
            } @else {
              <!-- Finished badge -->
              <div class="flex justify-center">
                <span class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                  Partido finalizado
                </span>
              </div>
            }

            <!-- Match Details Tabs -->
            <app-match-details-tabs
              [events]="liveDataService.events()"
              [stats]="liveDataService.stats()"
              [lineups]="liveDataService.lineups()"
              [hasError]="!!liveDataService.error()"
              [consecutiveErrors]="liveDataService.consecutiveErrors()"
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

  readonly isFinished = computed(() => {
    const live = this.liveDataService.liveScore();
    if (live) return live.status === 'finished';
    return this.match()?.status === 'finished';
  });

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
        this.liveDataService.startPolling(id, match.status);
      } else {
        this.router.navigate(['/404'], { skipLocationChange: true });
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
        this.liveDataService.startPolling(id, match.status);
      } else {
        this.router.navigate(['/404'], { skipLocationChange: true });
      }
    });
  }

  ngOnDestroy(): void {
    this.liveDataService.stopPolling();
  }
}
