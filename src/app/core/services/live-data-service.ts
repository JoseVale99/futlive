import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { Subscription, timer, switchMap, catchError, of, timeout, Observable, map, retry } from 'rxjs';
import { MatchEvent, MatchStats, MatchStatus, Match } from '../models/match-model';
import { LiveScoreData, MatchLineup, POLLING_CONFIG } from '../models/live-data-model';
import { mergeEventsById } from '../../shared/utils/event-sort-util';

@Injectable({ providedIn: 'root' })
export class LiveDataService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT_TOKEN);

  private readonly _events = signal<MatchEvent[]>([]);
  private readonly _stats = signal<MatchStats[]>([]);
  private readonly _lineups = signal<MatchLineup[]>([]);
  private readonly _liveScore = signal<LiveScoreData | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _consecutiveErrors = signal(0);

  readonly events = this._events.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly lineups = this._lineups.asReadonly();
  readonly liveScore = this._liveScore.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly consecutiveErrors = this._consecutiveErrors.asReadonly();

  private currentStatus = signal<MatchStatus>('scheduled');
  private currentMatchId: string | null = null;
  private pollingSubscription?: Subscription;
  private retrySubscription?: Subscription;

  startPolling(matchId: string, initialStatus: MatchStatus): void {
    this.stopPolling();
    this._loading.set(true);
    this._error.set(null);
    this._consecutiveErrors.set(0);
    this._events.set([]);
    this._stats.set([]);
    this._lineups.set([]);
    this._liveScore.set(null);
    this.currentMatchId = matchId;
    this.currentStatus.set(initialStatus);

    this.setupPolling(matchId, initialStatus);
  }

  stopPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = undefined;
    this.retrySubscription?.unsubscribe();
    this.retrySubscription = undefined;
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private setupPolling(matchId: string, status: MatchStatus): void {
    this.pollingSubscription?.unsubscribe();
    this.retrySubscription?.unsubscribe();

    if (status === 'finished') {
      this.fetchMatchData(matchId);
      this.fetchLineups(matchId);
      return;
    }

    // Fetch lineups una vez al inicio
    this.fetchLineups(matchId);

    const source$ = this.buildPollingSource(status);

    this.pollingSubscription = source$
      .pipe(
        switchMap(() => this.fetchMatchFromEspn(matchId))
      )
      .subscribe((response) => {
        if (response) {
          this._consecutiveErrors.set(0);
          this._error.set(null);

          if (response.events.length > 0) {
            const merged = mergeEventsById(this._events(), response.events);
            this._events.set(merged);
          }
          if (response.stats.length > 0) {
            this._stats.set(response.stats);
          }

          if (response.liveScore) {
            this._liveScore.set(response.liveScore);
            this.handleStatusTransition(response.liveScore.status as MatchStatus);
          }
        }
        this._loading.set(false);
      });
  }

  private buildPollingSource(status: MatchStatus): Observable<number> {
    if (status === 'live') return timer(0, POLLING_CONFIG.liveInterval);
    if (status === 'scheduled') return timer(0, POLLING_CONFIG.liveInterval);
    return timer(0);
  }

  private handleError(): void {
    const errors = this._consecutiveErrors() + 1;
    this._consecutiveErrors.set(errors);

    if (errors >= POLLING_CONFIG.maxRetries) {
      this._error.set('Datos en vivo no disponibles');
    }
  }

  /**
   * Obtiene datos del partido desde ESPN (eventos, stats, score) en una sola llamada.
   */
  private fetchMatchFromEspn(matchId: string): Observable<{
    events: MatchEvent[];
    stats: MatchStats[];
    liveScore: LiveScoreData | null;
  } | null> {
    const params = new HttpParams().set('id', matchId);

    return this.http
      .get<Match[]>(this.env.apiBase, { params })
      .pipe(
        timeout(POLLING_CONFIG.httpTimeout),
        map(matches => {
          const match = matches[0] ?? null;
          if (!match) return null;

          const liveScore: LiveScoreData = {
            home_score: match.home_score ?? 0,
            away_score: match.away_score ?? 0,
            time_elapsed: match.time_elapsed?.toString() ?? '0',
            status: match.status,
          };

          return {
            events: match.events || [],
            stats: match.stats || [],
            liveScore,
          };
        }),
        catchError(() => {
          this.handleError();
          return of(null);
        })
      );
  }

  /**
   * Obtiene datos de un partido finalizado desde ESPN.
   */
  private fetchMatchData(matchId: string): void {
    const params = new HttpParams().set('id', matchId);

    this.http
      .get<Match[]>(this.env.apiBase, { params })
      .pipe(
        timeout(25_000),
        retry({ count: 2, delay: 3000 }),
        catchError(() => of([] as Match[]))
      )
      .subscribe((matches) => {
        const match = matches[0];
        if (match) {
          this._events.set(match.events || []);
          this._stats.set(match.stats || []);

          if (match.home_score !== null || match.away_score !== null) {
            this._liveScore.set({
              home_score: match.home_score ?? 0,
              away_score: match.away_score ?? 0,
              time_elapsed: match.time_elapsed?.toString() ?? '0',
              status: match.status,
            });
          }
        }

        this._loading.set(false);

        if (!match || ((match.events || []).length === 0 && (match.stats || []).length === 0)) {
          this._error.set('No se encontraron datos del partido');
        }
      });
  }

  /**
   * Obtiene alineaciones desde ESPN summary API.
   */
  private fetchLineups(matchId: string): void {
    const url = this.env.production
      ? `/api/lineups?matchId=${matchId}`
      : `http://localhost:3001/api/lineups?matchId=${matchId}`;

    this.http.get<{ team: string; side: string; formation: string; players: { name: string; number: string; position: string; starter: boolean }[] }[]>(url).pipe(
      timeout(15_000),
      catchError(() => of([]))
    ).subscribe(raw => {
      if (raw && raw.length > 0) {
        const lineups: MatchLineup[] = raw.map(r => ({
          team: (r.side === 'home' ? 'home' : 'away') as 'home' | 'away',
          team_name: r.team,
          players: r.players.map(p => ({
            name: p.name,
            number: parseInt(p.number, 10) || 0,
            position: p.position,
            is_starter: p.starter,
          })),
        }));
        this._lineups.set(lineups);
      }
    });
  }

  private handleStatusTransition(newStatus: MatchStatus): void {
    const prevStatus = this.currentStatus();
    if (prevStatus === newStatus) return;

    if (prevStatus === 'scheduled' && newStatus === 'live') {
      this.currentStatus.set('live');
      if (this.currentMatchId) {
        this.setupPolling(this.currentMatchId, 'live');
      }
    } else if (prevStatus === 'live' && newStatus === 'finished') {
      this.currentStatus.set('finished');
      this.pollingSubscription?.unsubscribe();
      this.pollingSubscription = undefined;
      this.retrySubscription?.unsubscribe();
      this.retrySubscription = undefined;
    }
  }
}
