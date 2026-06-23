import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { GroupStanding } from '../models/standings-model';
import { groupByGroupName } from '../../shared/utils/standings-util';
import { catchError, finalize, of, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StandingsService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT_TOKEN);

  private _standings = signal<GroupStanding[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  readonly standings = this._standings.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly groupedStandings = computed(() => groupByGroupName(this._standings()));

  fetchStandings(): void {
    this._loading.set(true);
    this._error.set(null);

    this.http.get<GroupStanding[]>(`${this.env.supabaseUrl}/group_standings`, {
      params: { order: 'group_name.asc,rank.asc' },
      headers: {
        'apikey': this.env.supabaseKey,
        'Authorization': `Bearer ${this.env.supabaseKey}`
      }
    }).pipe(
      timeout(15000),
      catchError(err => {
        this._error.set(err.message || err.statusText || 'Error al cargar posiciones');
        return of([]);
      }),
      finalize(() => this._loading.set(false))
    ).subscribe(data => {
      this._standings.set(data);
    });
  }
}
