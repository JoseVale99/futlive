import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ScorersApiResponse, TopScorer, TopAssister, CardEntry } from '../models/scorers-model';
import { catchError, finalize, of, timeout } from 'rxjs';
import { translateTeamName } from '../../shared/utils/team-name-util';
import { getFlagUrl } from '../../shared/utils/flag-util';

const SCORERS_API = '/api/scorers/board';

@Injectable({ providedIn: 'root' })
export class ScorersService {
  private readonly http = inject(HttpClient);

  private _scorers = signal<TopScorer[]>([]);
  private _assisters = signal<TopAssister[]>([]);
  private _cards = signal<CardEntry[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  readonly scorers = this._scorers.asReadonly();
  readonly assisters = this._assisters.asReadonly();
  readonly cards = this._cards.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  fetchScorers(): void {
    this._loading.set(true);
    this._error.set(null);

    this.http.get<ScorersApiResponse>(SCORERS_API, {
      headers: { 'Accept': 'application/json' }
    }).pipe(
      timeout(15000),
      catchError(err => {
        console.error('[ScorersService] Error:', err);
        this._error.set('Error al cargar estadísticas');
        return of(null);
      }),
      finalize(() => this._loading.set(false))
    ).subscribe(response => {
      if (!response || !response.players || response.players.length === 0) {
        if (!this._error()) this._error.set('Sin datos disponibles');
        return;
      }

      const players = response.players;

      // Goals
      const goals = players
        .filter(p => p.category === 'goals')
        .sort((a, b) => a.rank - b.rank)
        .map(p => ({
          rank: p.rank,
          player_name: p.player_name,
          player_photo: p.player_photo,
          team: translateTeamName(p.team),
          team_code: p.team_code,
          team_flag: getFlagUrl(p.team_code),
          goals: p.value,
        }));
      this._scorers.set(goals);

      // Assists
      const assists = players
        .filter(p => p.category === 'assists')
        .sort((a, b) => a.rank - b.rank)
        .map(p => ({
          rank: p.rank,
          player_name: p.player_name,
          player_photo: p.player_photo,
          team: translateTeamName(p.team),
          team_code: p.team_code,
          team_flag: getFlagUrl(p.team_code),
          assists: p.value,
        }));
      this._assisters.set(assists);

      // Cards (yellow + red combined, sorted: reds first then yellows)
      const reds = players
        .filter(p => p.category === 'red')
        .sort((a, b) => a.rank - b.rank)
        .map(p => ({
          rank: p.rank,
          player_name: p.player_name,
          player_photo: p.player_photo,
          team: translateTeamName(p.team),
          team_code: p.team_code,
          team_flag: getFlagUrl(p.team_code),
          value: p.value,
          card_type: 'red' as const,
        }));

      const yellows = players
        .filter(p => p.category === 'yellow')
        .sort((a, b) => a.rank - b.rank)
        .map(p => ({
          rank: p.rank,
          player_name: p.player_name,
          player_photo: p.player_photo,
          team: translateTeamName(p.team),
          team_code: p.team_code,
          team_flag: getFlagUrl(p.team_code),
          value: p.value,
          card_type: 'yellow' as const,
        }));

      // Merge: reds first, then yellows, re-rank
      const allCards = [...reds, ...yellows].map((c, i) => ({ ...c, rank: i + 1 }));
      this._cards.set(allCards);
    });
  }
}
