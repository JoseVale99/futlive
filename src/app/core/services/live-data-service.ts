import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { Subscription, timer, switchMap, catchError, of, timeout, delay, Observable, forkJoin, retry } from 'rxjs';
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

    // For finished matches, fetch directly from Supabase (no proxy needed)
    if (status === 'finished') {
      this.fetchFinishedMatchData(matchId);
      return;
    }

    const source$ = this.buildPollingSource(status);

    this.pollingSubscription = source$
      .pipe(
        switchMap(() => this.fetchLiveFromSupabase(matchId))
      )
      .subscribe((response) => {
        if (response) {
          this._consecutiveErrors.set(0);
          this._error.set(null);

          const merged = mergeEventsById(this._events(), response.events);
          this._events.set(merged);
          this._stats.set(response.stats);

          if (response.liveScore) {
            this._liveScore.set(response.liveScore);
            this.handleStatusTransition(response.liveScore.status as MatchStatus);
          }
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

  private handleError(): void {
    const errors = this._consecutiveErrors() + 1;
    this._consecutiveErrors.set(errors);

    if (errors >= POLLING_CONFIG.maxRetries) {
      if (this.currentMatchId && this._events().length === 0) {
        this.fetchEventsFromSupabase(this.currentMatchId);
      }
      this._error.set('Datos en vivo no disponibles');
    }
  }
  /**
   * Fetch live data directly from Supabase: match record + events + stats.
   * Replaces the old lacancha.tv /api/match/{id}/live dependency.
   */
  private fetchLiveFromSupabase(matchId: string): Observable<{
    events: MatchEvent[];
    stats: MatchStats[];
    liveScore: LiveScoreData | null;
  } | null> {
    const headers = new HttpHeaders({
      apikey: this.env.supabaseKey,
      Authorization: `Bearer ${this.env.supabaseKey}`,
    });

    const match$ = this.http
      .get<Array<{ status: string; home_score: number; away_score: number; time_elapsed: number | null }>>(
        `${this.env.supabaseUrl}/matches`,
        { params: { id: `eq.${matchId}`, select: 'status,home_score,away_score,time_elapsed' }, headers }
      )
      .pipe(
        timeout(POLLING_CONFIG.httpTimeout),
        catchError(() => of([]))
      );

    const events$ = this.http
      .get<MatchEvent[]>(`${this.env.supabaseUrl}/match_events`, {
        params: { match_id: `eq.${matchId}`, select: '*', order: 'minute.asc' },
        headers,
      })
      .pipe(
        timeout(POLLING_CONFIG.httpTimeout),
        catchError(() => of([] as MatchEvent[]))
      );

    const stats$ = this.http
      .get<MatchStats[]>(`${this.env.supabaseUrl}/match_stats`, {
        params: { match_id: `eq.${matchId}`, select: '*' },
        headers,
      })
      .pipe(
        timeout(POLLING_CONFIG.httpTimeout),
        catchError(() => of([] as MatchStats[]))
      );

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

  /**
   * Fallback: fetch events from Supabase when proxy fails (for mobile/slow connections).
   */
  private fetchEventsFromSupabase(matchId: string): void {
    const headers = new HttpHeaders({
      apikey: this.env.supabaseKey,
      Authorization: `Bearer ${this.env.supabaseKey}`,
    });

    this.http
      .get<MatchEvent[]>(`${this.env.supabaseUrl}/match_events`, {
        params: { match_id: `eq.${matchId}`, select: '*', order: 'minute.asc' },
        headers,
      })
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

  /**
   * For finished matches: fetch events and stats directly from Supabase.
   * No proxy/live API needed since the data is already persisted.
   * Uses retry logic and longer timeout for mobile connections.
   */
  private fetchFinishedMatchData(matchId: string): void {
    const headers = new HttpHeaders({
      apikey: this.env.supabaseKey,
      Authorization: `Bearer ${this.env.supabaseKey}`,
    });

    const MOBILE_TIMEOUT = 25_000; // 25s para conexiones lentas

    const events$ = this.http
      .get<MatchEvent[]>(`${this.env.supabaseUrl}/match_events`, {
        params: { match_id: `eq.${matchId}`, select: '*', order: 'minute.asc' },
        headers,
      })
      .pipe(
        timeout(MOBILE_TIMEOUT),
        retry({ count: 2, delay: 3000 }),
        catchError(() => of([] as MatchEvent[]))
      );

    const stats$ = this.http
      .get<MatchStats[]>(`${this.env.supabaseUrl}/match_stats`, {
        params: { match_id: `eq.${matchId}`, select: '*' },
        headers,
      })
      .pipe(
        timeout(MOBILE_TIMEOUT),
        retry({ count: 2, delay: 3000 }),
        catchError(() => of([] as MatchStats[]))
      );

    forkJoin([events$, stats$]).subscribe(([events, stats]) => {
      this._events.set(events);
      this._stats.set(stats);
      this._loading.set(false);

      // Si ambos están vacíos, indicar error para que el usuario sepa
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

  private normalizeEventType(type: string): EventType {
    const normalized = type.toLowerCase().replace(/[-\s]/g, '_');
    if (normalized === 'own_goal' || normalized === 'og' || normalized === 'autogol') return 'own_goal';
    if (normalized === 'goal') return 'goal';
    if (normalized === 'yellow' || normalized === 'yellow_card') return 'yellow';
    if (normalized === 'red' || normalized === 'red_card') return 'red';
    if (normalized === 'sub' || normalized === 'substitution') return 'sub';
    return type as EventType;
  }
}
