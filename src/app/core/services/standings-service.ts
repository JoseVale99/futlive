import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { GroupStanding } from '../models/standings-model';
import { Match } from '../models/match-model';
import { KnockoutMatch, BracketResponse } from '../models/bracket-model';
import { groupByGroupName } from '../../shared/utils/standings-util';
import { catchError, finalize, of, timeout, forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StandingsService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT_TOKEN);

  private _standings = signal<GroupStanding[]>([]);
  private _upcomingByGroup = signal<Map<string, Match[]>>(new Map());
  private _knockoutMatches = signal<KnockoutMatch[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  readonly standings = this._standings.asReadonly();
  readonly upcomingByGroup = this._upcomingByGroup.asReadonly();
  readonly knockoutMatches = this._knockoutMatches.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly groupedStandings = computed(() => groupByGroupName(this._standings()));

  /** Mapa matchNum → KnockoutMatch para lookup rápido */
  readonly knockoutByMatchNum = computed(() => {
    const map = new Map<number, KnockoutMatch>();
    for (const m of this._knockoutMatches()) {
      if (m.matchNum != null) map.set(m.matchNum, m);
    }
    return map;
  });

  fetchStandings(): void {
    this._loading.set(true);
    this._error.set(null);

    // Standings desde ESPN (via /api/standings serverless function)
    const standings$ = this.http.get<GroupStanding[]>('/api/standings').pipe(
      timeout(15000),
      catchError(err => {
        this._error.set(err.message || err.statusText || 'Error al cargar posiciones');
        return of([]);
      })
    );

    // Próximos partidos (grupo stage)
    const upcomingParams = new HttpParams()
      .set('table', 'matches')
      .set('status', 'eq.scheduled')
      .set('stage', 'eq.Group Stage')
      .set('order', 'kickoff_at.asc')
      .set('select', 'id,home_team,away_team,home_flag,away_flag,kickoff_at,group_name,stage');

    const upcoming$ = this.http.get<Match[]>(this.env.apiBase, { params: upcomingParams }).pipe(
      timeout(15000),
      catchError(() => of([]))
    );

    // Bracket knockout desde ESPN (via /api/bracket serverless function)
    const bracket$ = this.http.get<BracketResponse>('/api/bracket').pipe(
      timeout(15000),
      catchError(() => of({ matches: [] } as BracketResponse))
    );

    forkJoin([standings$, upcoming$, bracket$]).pipe(
      finalize(() => this._loading.set(false))
    ).subscribe(([standings, upcoming, bracket]) => {
      this._standings.set(standings);
      this._knockoutMatches.set(bracket.matches);

      const teamToGroup = new Map<string, string>();
      for (const s of standings) {
        teamToGroup.set(s.team, s.group_name);
      }

      const byGroup = new Map<string, Match[]>();
      for (const match of upcoming) {
        const group = teamToGroup.get(match.home_team) || teamToGroup.get(match.away_team);
        if (!group) continue;
        const list = byGroup.get(group) || [];
        list.push(match);
        byGroup.set(group, list);
      }
      this._upcomingByGroup.set(byGroup);
    });
  }
}
