import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { catchError, map, of, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { leagueHttpParams } from '../../shared/constants/leagues';
import { Match } from '../models/match-model';
import { GroupStanding } from '../models/standings-model';
import { getFlagUrl } from '../../shared/utils/flag-util';

export type ScorerCategory = 'goals' | 'assists';

export interface ScorerRow {
  rank: number;
  name: string;
  team: string;
  teamCode: string;
  teamFlag: string;
  value: number;
  category: ScorerCategory;
}

export interface LeagueDataSources {
  matches$: Observable<Match[]>;
  standings$: Observable<GroupStanding[]>;
  scorers$: Observable<ScorerRow[]>;
}

@Injectable({ providedIn: 'root' })
export class LeagueDataService {
  private readonly http = inject(HttpClient);

  /**
   * Streams por tab. Cada uno emite una vez que su data está lista (o vacío en error).
   * El componente los conecta a `toSignal()` para que cada tab "se active" cuando se muestra
   * y pueda cachearse/cancelarse de forma independiente.
   */
  sources(slug: string): LeagueDataSources {
    return {
      matches$: this.fetchMatches(slug),
      standings$: this.fetchStandings(slug),
      scorers$: this.fetchScorers(slug),
    };
  }

  private fetchMatches(slug: string): Observable<Match[]> {
    const params = (status: string) => leagueHttpParams(slug, { status });

    const live$ = this.http.get<Match[]>(environment.apiBase, { params: params('live') })
      .pipe(timeout(10000), catchError(() => of([] as Match[])));
    const scheduled$ = this.http.get<Match[]>(environment.apiBase, { params: params('scheduled') })
      .pipe(timeout(10000), catchError(() => of([] as Match[])));
    const finished$ = this.http.get<Match[]>(environment.apiBase, { params: params('finished') })
      .pipe(timeout(10000), catchError(() => of([] as Match[])));

    return forkJoin([live$, scheduled$, finished$]).pipe(
      map(([live, scheduled, finished]) => {
        const sortAsc = (a: Match, b: Match) =>
          new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime();
        const sortDesc = (a: Match, b: Match) =>
          new Date(b.kickoff_at).getTime() - new Date(a.kickoff_at).getTime();
        return [...live, ...[...scheduled].sort(sortAsc), ...[...finished].sort(sortDesc)];
      })
    );
  }

  private fetchStandings(slug: string): Observable<GroupStanding[]> {
    return this.http.get<GroupStanding[]>('/api/standings', {
      params: new HttpParams().set('league', slug),
    }).pipe(timeout(10000), catchError(() => of([] as GroupStanding[])));
  }

  private fetchScorers(slug: string): Observable<ScorerRow[]> {
    return this.http.get<{ players: any[] }>('/api/scorers', {
      params: new HttpParams().set('league', slug),
    }).pipe(
      timeout(10000),
      map(res => (res.players ?? [])
        .filter((p: any) => p.category === 'goals' || p.category === 'assists')
        .sort((a: any, b: any) => a.rank - b.rank)
        .map((p: any) => ({
          rank: p.rank,
          name: p.player_name,
          team: p.team,
          teamCode: p.team_code,
          teamFlag: getFlagUrl(p.team_code),
          value: p.value,
          category: p.category as ScorerCategory,
        }))),
      catchError(() => of([] as ScorerRow[]))
    );
  }
}