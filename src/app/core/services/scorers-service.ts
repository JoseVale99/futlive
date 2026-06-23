import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ENVIRONMENT_TOKEN } from '../config/environment';
import { TopScorer } from '../models/scorers-model';
import { catchError, finalize, of, timeout } from 'rxjs';

const SAMPLE_SCORERS: TopScorer[] = [
  { rank: 1, player_name: "Cristiano Ronaldo", team: "Portugal", team_flag: "https://flagcdn.com/w40/pt.png", goals: 5, assists: 1, matches_played: 3 },
  { rank: 2, player_name: "Kylian Mbappé", team: "Francia", team_flag: "https://flagcdn.com/w40/fr.png", goals: 4, assists: 2, matches_played: 3 },
  { rank: 3, player_name: "Kai Havertz", team: "Alemania", team_flag: "https://flagcdn.com/w40/de.png", goals: 4, assists: 0, matches_played: 2 },
  { rank: 4, player_name: "Harry Kane", team: "Inglaterra", team_flag: "https://flagcdn.com/w40/gb-eng.png", goals: 3, assists: 1, matches_played: 3 },
  { rank: 5, player_name: "Erling Haaland", team: "Noruega", team_flag: "https://flagcdn.com/w40/no.png", goals: 3, assists: 0, matches_played: 3 },
  { rank: 6, player_name: "Vinícius Jr.", team: "Brasil", team_flag: "https://flagcdn.com/w40/br.png", goals: 2, assists: 2, matches_played: 3 },
  { rank: 7, player_name: "Julián Álvarez", team: "Argentina", team_flag: "https://flagcdn.com/w40/ar.png", goals: 2, assists: 1, matches_played: 3 },
  { rank: 8, player_name: "Viktor Gyökeres", team: "Suecia", team_flag: "https://flagcdn.com/w40/se.png", goals: 2, assists: 1, matches_played: 2 },
  { rank: 9, player_name: "Alphonso Davies", team: "Canadá", team_flag: "https://flagcdn.com/w40/ca.png", goals: 2, assists: 3, matches_played: 3 },
  { rank: 10, player_name: "Christian Pulisic", team: "EE.UU.", team_flag: "https://flagcdn.com/w40/us.png", goals: 2, assists: 1, matches_played: 2 }
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
