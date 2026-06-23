import { MatchEvent, MatchStats } from './match-model';

export interface LineupPlayer {
  name: string;
  number: number;
  position: string;
  is_starter: boolean;
}

export interface MatchLineup {
  team: 'home' | 'away';
  team_name: string;
  players: LineupPlayer[];
}

export interface LiveMatchResponse {
  match: {
    status: string;
    home_score: number;
    away_score: number;
    time_elapsed: string;
  };
  events: MatchEvent[];
  stats: MatchStats[];
  lineups: MatchLineup[];
}
