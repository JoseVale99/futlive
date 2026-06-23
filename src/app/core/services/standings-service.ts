import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { GroupStanding } from '../models/standings-model';
import { groupByGroupName } from '../../shared/utils/standings-util';
import { catchError, finalize, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StandingsService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT_TOKEN);

  private readonly _standings = signal<GroupStanding[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly standings = this._standings.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly groupedStandings = signal<Map<string, GroupStanding[]>>(new Map());

  fetchStandings(): void {
    this._loading.set(true);
    this._error.set(null);

    this.http.get<GroupStanding[]>(`${this.env.supabaseUrl}/group_standings`, {
      params: { select: '*', order: 'group_name.asc,rank.asc' },
      headers: {
        'apikey': this.env.supabaseKey,
        'Authorization': `Bearer ${this.env.supabaseKey}`
      }
    }).pipe(
      catchError((err: HttpErrorResponse) => {
        this._error.set(`Error al cargar posiciones: ${err.statusText || err.message}`);
        return of([]);
      }),
      finalize(() => this._loading.set(false))
    ).subscribe(standings => {
      this._standings.set(standings);
      this.groupedStandings.set(groupByGroupName(standings));
    });
  }
}
