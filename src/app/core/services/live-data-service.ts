import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { Subscription, timer, switchMap, catchError, of, timeout, Observable, forkJoin, retry } from 'rxjs';
import { EventType, MatchEvent, MatchStats, MatchStatus } from '../models/match-model';
import { LiveScoreData, MatchLineup, LineupPlayer, POLLING_CONFIG } from '../models/live-data-model';
import { mergeEventsById } from '../../shared/utils/event-sort-util';

interface SupabaseLineupRow {
  id: string;
  match_id: string;
  team: 'home' | 'away';
  player: string;
  position: string;
  shirt_number: number;
  is_starter: boolean;
}

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
  private lineupsSubscription?: Subscription;
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
    this.fetchLineupsFromProxy(matchId);
  }

  stopPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = undefined;
    this.lineupsSubscription?.unsubscribe();
    this.lineupsSubscription = undefined;
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
      this.fetchFinishedMatchData(matchId);
      return;
    }

    const source$ = this.buildPollingSource(status);

    this.pollingSubscription = source$
      .pipe(
        switchMap(() => {
          if (this.currentStatus() === 'scheduled') {
            return this.fetchMatchStatusOnly(matchId);
          }
          return this.fetchLiveFromProxy(matchId);
        })
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
      if (this.currentMatchId && this._events().length === 0) {
        this.fetchEventsFromProxy(this.currentMatchId);
      }
      this._error.set('Datos en vivo no disponibles');
    }
  }

  private fetchMatchStatusOnly(matchId: string): Observable<{
    events: MatchEvent[];
    stats: MatchStats[];
    liveScore: LiveScoreData | null;
  } | null> {
    const params = new HttpParams()
      .set('table', 'matches')
      .set('id', `eq.${matchId}`)
      .set('select', 'status,home_score,away_score,time_elapsed');

    return this.http
      .get<Array<{ status: string; home_score: number; away_score: number; time_elapsed: number | null }>>(
        this.env.apiBase, { params }
      )
      .pipe(
        timeout(POLLING_CONFIG.httpTimeout),
        switchMap(matchRows => {
          const matchData = matchRows[0] ?? null;
          const liveScore: LiveScoreData | null = matchData
            ? {
                home_score: matchData.home_score ?? 0,
                away_score: matchData.away_score ?? 0,
                time_elapsed: matchData.time_elapsed?.toString() ?? '0',
                status: matchData.status,
              }
            : null;
          return of({ events: [] as MatchEvent[], stats: [] as MatchStats[], liveScore });
        }),
        catchError(() => {
          this.handleError();
          return of(null);
        })
      );
  }

  private fetchLiveFromProxy(matchId: string): Observable<{
    events: MatchEvent[];
    stats: MatchStats[];
    liveScore: LiveScoreData | null;
  } | null> {
    const matchParams = new HttpParams()
      .set('table', 'matches')
      .set('id', `eq.${matchId}`)
      .set('select', 'status,home_score,away_score,time_elapsed');

    const eventsParams = new HttpParams()
      .set('table', 'match_events')
      .set('match_id', `eq.${matchId}`)
      .set('select', '*')
      .set('order', 'minute.asc');

    const statsParams = new HttpParams()
      .set('table', 'match_stats')
      .set('match_id', `eq.${matchId}`)
      .set('select', '*');

    const match$ = this.http
      .get<Array<{ status: string; home_score: number; away_score: number; time_elapsed: number | null }>>(
        this.env.apiBase, { params: matchParams }
      )
      .pipe(timeout(POLLING_CONFIG.httpTimeout), catchError(() => of([])));

    const events$ = this.http
      .get<MatchEvent[]>(this.env.apiBase, { params: eventsParams })
      .pipe(timeout(POLLING_CONFIG.httpTimeout), catchError(() => of([] as MatchEvent[])));

    const stats$ = this.http
      .get<MatchStats[]>(this.env.apiBase, { params: statsParams })
      .pipe(timeout(POLLING_CONFIG.httpTimeout), catchError(() => of([] as MatchStats[])));

    return forkJoin([match$, events$, stats$]).pipe(
      switchMap(([matchRows, events, stats]) => {
        const matchData = matchRows[0] ?? null;
        const liveScore: LiveScoreData | null = matchData
          ? {
              home_score: matchData.home_score ?? 0,
              away_score: matchData.away_score ?? 0,
              time_elapsed: matchData.time_elapsed?.toString() ?? '0',
              status: matchData.status,
            }
          : null;
        return of({ events, stats, liveScore });
      }),
      catchError(() => {
        this.handleError();
        return of(null);
      })
    );
  }

  private fetchEventsFromProxy(matchId: string): void {
    const params = new HttpParams()
      .set('table', 'match_events')
      .set('match_id', `eq.${matchId}`)
      .set('select', '*')
      .set('order', 'minute.asc');

    this.http
      .get<MatchEvent[]>(this.env.apiBase, { params })
      .pipe(
        timeout(25_000),
        retry({ count: 1, delay: 3000 }),
        catchError(() => of([] as MatchEvent[]))
      )
      .subscribe((events) => {
        if (events.length > 0) {
          this._events.set(mergeEventsById(this._events(), events));
          this._error.set(null);
        }
        this._loading.set(false);
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

  private fetchLineupsFromProxy(matchId: string): void {
    const params = new HttpParams()
      .set('table', 'match_lineups')
      .set('match_id', `eq.${matchId}`)
      .set('select', '*');

    this.lineupsSubscription = this.http
      .get<SupabaseLineupRow[]>(this.env.apiBase, { params })
      .pipe(
        timeout(POLLING_CONFIG.httpTimeout),
        catchError(() => of(null))
      )
      .subscribe((rows) => {
        if (rows && rows.length > 0) {
          const transformed = this.transformLineups(rows);
          if (this._lineups().length === 0) {
            this._lineups.set(transformed);
          }
        }
      });
  }

  private fetchFinishedMatchData(matchId: string): void {
    const MOBILE_TIMEOUT = 25_000;

    const eventsParams = new HttpParams()
      .set('table', 'match_events')
      .set('match_id', `eq.${matchId}`)
      .set('select', '*')
      .set('order', 'minute.asc');

    const statsParams = new HttpParams()
      .set('table', 'match_stats')
      .set('match_id', `eq.${matchId}`)
      .set('select', '*');

    const events$ = this.http
      .get<MatchEvent[]>(this.env.apiBase, { params: eventsParams })
      .pipe(timeout(MOBILE_TIMEOUT), retry({ count: 2, delay: 3000 }), catchError(() => of([] as MatchEvent[])));

    const stats$ = this.http
      .get<MatchStats[]>(this.env.apiBase, { params: statsParams })
      .pipe(timeout(MOBILE_TIMEOUT), retry({ count: 2, delay: 3000 }), catchError(() => of([] as MatchStats[])));

    forkJoin([events$, stats$]).subscribe(([events, stats]) => {
      this._events.set(events);
      this._stats.set(stats);
      this._loading.set(false);

      if (events.length === 0 && stats.length === 0) {
        this._error.set('No se encontraron datos del partido');
      }
    });
  }

  private transformLineups(rows: SupabaseLineupRow[]): MatchLineup[] {
    const grouped = new Map<'home' | 'away', LineupPlayer[]>();

    for (const row of rows) {
      const players = grouped.get(row.team) ?? [];
      players.push({
        name: row.player,
        number: row.shirt_number,
        position: row.position,
        is_starter: row.is_starter,
      });
      grouped.set(row.team, players);
    }

    const lineups: MatchLineup[] = [];
    if (grouped.has('home')) {
      lineups.push({ team: 'home', team_name: 'Local', players: grouped.get('home')! });
    }
    if (grouped.has('away')) {
      lineups.push({ team: 'away', team_name: 'Visitante', players: grouped.get('away')! });
    }
    return lineups;
  }
}
