import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { Subscription, timer, switchMap, catchError, of, timeout } from 'rxjs';
import { MatchEvent, MatchStats } from '../models/match-model';
import { LiveMatchResponse, MatchLineup, LineupPlayer } from '../models/live-data-model';

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
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly events = this._events.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly lineups = this._lineups.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  private pollingSubscription?: Subscription;
  private lineupsSubscription?: Subscription;

  startPolling(matchId: string, isLive: boolean): void {
    this.stopPolling();
    this._loading.set(true);
    this._error.set(null);

    const source$ = isLive ? timer(0, 120_000) : timer(0);

    // Usar proxy para evitar CORS
    const proxyUrl = this.env.production
      ? `/api/streams?matchId=${matchId}&type=live`
      : `http://localhost:3001/api/live?matchId=${matchId}`;

    this.pollingSubscription = source$
      .pipe(
        switchMap(() =>
          this.http
            .get<LiveMatchResponse>(proxyUrl)
            .pipe(
              timeout(8000),
              catchError(() => {
                this._error.set('Error al cargar datos en vivo');
                return of(null);
              })
            )
        )
      )
      .subscribe(response => {
        if (response) {
          this._events.set(response.events ?? []);
          this._stats.set(response.stats ?? []);
          // Si la respuesta de lacancha.tv trae lineups, usarlas
          if (response.lineups && response.lineups.length > 0) {
            this._lineups.set(response.lineups);
          }
          this._error.set(null);
        }
        this._loading.set(false);
      });

    // Fetch lineups desde Supabase como fuente complementaria/fallback
    this.fetchLineupsFromSupabase(matchId);
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
        timeout(8000),
        catchError(() => of(null))
      )
      .subscribe(rows => {
        if (rows && rows.length > 0) {
          const transformed = this.transformLineups(rows);
          // Solo setear si no hay lineups de lacancha.tv
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

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
    if (this.lineupsSubscription) {
      this.lineupsSubscription.unsubscribe();
      this.lineupsSubscription = undefined;
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
