import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { Subscription, timer, switchMap, catchError, of, timeout, delay, Observable, EMPTY } from 'rxjs';
import { MatchEvent, MatchStats, MatchStatus } from '../models/match-model';
import { LiveMatchResponse, LiveScoreData, MatchLineup, LineupPlayer, POLLING_CONFIG } from '../models/live-data-model';
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

  // Internal writable signals
  private readonly _events = signal<MatchEvent[]>([]);
  private readonly _stats = signal<MatchStats[]>([]);
  private readonly _lineups = signal<MatchLineup[]>([]);
  private readonly _liveScore = signal<LiveScoreData | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _consecutiveErrors = signal(0);

  // Public readonly signals
  readonly events = this._events.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly lineups = this._lineups.asReadonly();
  readonly liveScore = this._liveScore.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly consecutiveErrors = this._consecutiveErrors.asReadonly();

  // Internal state
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

    // Fetch lineups from Supabase as fallback
    this.fetchLineupsFromSupabase(matchId);
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

    const source$ = this.buildPollingSource(status);
    const proxyUrl = this.buildProxyUrl(matchId);

    this.pollingSubscription = source$
      .pipe(
        switchMap(() =>
          this.http.get<LiveMatchResponse>(proxyUrl).pipe(
            timeout(POLLING_CONFIG.httpTimeout),
            catchError((err) => {
              this.handleError();
              return of(null);
            })
          )
        )
      )
      .subscribe((response) => {
        if (response) {
          this.handleResponse(response);
        }
        this._loading.set(false);
      });
  }

  private buildPollingSource(status: MatchStatus): Observable<number> {
    if (status === 'live') {
      return timer(0, POLLING_CONFIG.liveInterval);
    }
    // scheduled or finished: one-shot
    return timer(0);
  }

  private buildProxyUrl(matchId: string): string {
    return this.env.production
      ? `/api/streams?matchId=${matchId}&type=live`
      : `http://localhost:3001/api/live?matchId=${matchId}`;
  }

  private handleResponse(response: LiveMatchResponse): void {
    // Reset consecutive errors on success
    this._consecutiveErrors.set(0);
    this._error.set(null);

    // Merge events without losing existing ones
    const incomingEvents = response.events ?? [];
    const merged = mergeEventsById(this._events(), incomingEvents);
    this._events.set(merged);

    this._stats.set(response.stats ?? []);

    // Update live score
    if (response.match) {
      this._liveScore.set({
        home_score: response.match.home_score,
        away_score: response.match.away_score,
        time_elapsed: response.match.time_elapsed,
        status: response.match.status,
      });

      // Detect status transitions
      const newStatus = response.match.status as MatchStatus;
      this.handleStatusTransition(newStatus);
    }

    // Use lineups from lacancha.tv if present
    if (response.lineups && response.lineups.length > 0) {
      this._lineups.set(response.lineups);
    }
  }

  private handleError(): void {
    const errors = this._consecutiveErrors() + 1;
    this._consecutiveErrors.set(errors);

    if (errors >= POLLING_CONFIG.maxRetries) {
      this._error.set('Error de conexión: no se pudieron obtener datos en vivo');
      // Stop retrying — wait for next regular polling cycle
    } else {
      // Schedule a retry after retryDelay
      this.retrySubscription?.unsubscribe();
      this.retrySubscription = of(null)
        .pipe(delay(POLLING_CONFIG.retryDelay))
        .subscribe(() => {
          if (this.currentMatchId) {
            const proxyUrl = this.buildProxyUrl(this.currentMatchId);
            this.http
              .get<LiveMatchResponse>(proxyUrl)
              .pipe(
                timeout(POLLING_CONFIG.httpTimeout),
                catchError(() => {
                  this.handleError();
                  return EMPTY;
                })
              )
              .subscribe((response) => {
                if (response) {
                  this.handleResponse(response);
                }
              });
          }
        });
    }
  }

  private handleStatusTransition(newStatus: MatchStatus): void {
    const prevStatus = this.currentStatus();

    if (prevStatus === newStatus) return;

    if (prevStatus === 'scheduled' && newStatus === 'live') {
      // Transition scheduled → live: start 15s polling
      this.currentStatus.set('live');
      if (this.currentMatchId) {
        this.setupPolling(this.currentMatchId, 'live');
      }
    } else if (prevStatus === 'live' && newStatus === 'finished') {
      // Transition live → finished: stop polling, preserve signals
      this.currentStatus.set('finished');
      this.pollingSubscription?.unsubscribe();
      this.pollingSubscription = undefined;
      this.retrySubscription?.unsubscribe();
      this.retrySubscription = undefined;
    }
  }

  private fetchLineupsFromSupabase(matchId: string): void {
    const url = `${this.env.supabaseUrl}/match_lineups?match_id=eq.${matchId}&select=*`;
    const headers = new HttpHeaders({
      apikey: this.env.supabaseKey,
      Authorization: `Bearer ${this.env.supabaseKey}`,
    });

    this.lineupsSubscription = this.http
      .get<SupabaseLineupRow[]>(url, { headers })
      .pipe(
        timeout(POLLING_CONFIG.httpTimeout),
        catchError(() => of(null))
      )
      .subscribe((rows) => {
        if (rows && rows.length > 0) {
          const transformed = this.transformLineups(rows);
          // Only set if no lineups from lacancha.tv yet
          if (this._lineups().length === 0) {
            this._lineups.set(transformed);
          }
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
      lineups.push({
        team: 'home',
        team_name: 'Local',
        players: grouped.get('home')!,
      });
    }

    if (grouped.has('away')) {
      lineups.push({
        team: 'away',
        team_name: 'Visitante',
        players: grouped.get('away')!,
      });
    }

    return lineups;
  }
}
