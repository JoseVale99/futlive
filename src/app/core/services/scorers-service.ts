import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { TopScorer } from '../models/scorers-model';
import { catchError, finalize, of, timeout } from 'rxjs';

const SAMPLE_SCORERS: TopScorer[] = [
  { rank: 1, player_name: "L. Messi", team: "Argentina", team_flag: "https://flagcdn.com/w40/ar.png", goals: 5, assists: 0, matches_played: 2 },
  { rank: 2, player_name: "Kylian Mbappé", team: "Francia", team_flag: "https://flagcdn.com/w40/fr.png", goals: 4, assists: 0, matches_played: 3 },
  { rank: 3, player_name: "E. Haaland", team: "Noruega", team_flag: "https://flagcdn.com/w40/no.png", goals: 4, assists: 0, matches_played: 3 },
  { rank: 4, player_name: "D. Undav", team: "Alemania", team_flag: "https://flagcdn.com/w40/de.png", goals: 3, assists: 0, matches_played: 2 },
  { rank: 5, player_name: "J. David", team: "Canadá", team_flag: "https://flagcdn.com/w40/ca.png", goals: 3, assists: 0, matches_played: 3 },
  { rank: 6, player_name: "C. Summerville", team: "Países Bajos", team_flag: "https://flagcdn.com/w40/nl.png", goals: 2, assists: 0, matches_played: 2 },
  { rank: 7, player_name: "Mikel Oyarzabal", team: "España", team_flag: "https://flagcdn.com/w40/es.png", goals: 2, assists: 0, matches_played: 2 },
  { rank: 8, player_name: "M. Araújo", team: "Uruguay", team_flag: "https://flagcdn.com/w40/uy.png", goals: 2, assists: 0, matches_played: 2 },
  { rank: 9, player_name: "A. Ueda", team: "Japón", team_flag: "https://flagcdn.com/w40/jp.png", goals: 2, assists: 0, matches_played: 2 },
  { rank: 10, player_name: "Vinícius Júnior", team: "Brasil", team_flag: "https://flagcdn.com/w40/br.png", goals: 2, assists: 0, matches_played: 3 }
];

@Injectable({ providedIn: 'root' })
export class ScorersService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(ENVIRONMENT_TOKEN);

  private _scorers = signal<TopScorer[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  readonly scorers = this._scorers.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  fetchScorers(): void {
    this._loading.set(true);
    this._error.set(null);

    this.http.get<TopScorer[]>(`${this.env.supabaseUrl}/top_scorers`, {
      params: { order: 'goals.desc,assists.desc', limit: '10' },
      headers: {
        'apikey': this.env.supabaseKey,
        'Authorization': `Bearer ${this.env.supabaseKey}`
      }
    }).pipe(
      timeout(15000),
      catchError(() => {
        // Table might not exist — use sample data
        return of(SAMPLE_SCORERS);
      }),
      finalize(() => this._loading.set(false))
    ).subscribe(data => {
      if (!data || data.length === 0) {
        this._scorers.set(SAMPLE_SCORERS);
      } else {
        this._scorers.set(data);
      }
    });
  }
}
