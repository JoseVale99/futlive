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

export interface LiveScoreData {
  home_score: number;
  away_score: number;
  time_elapsed: string;
  status: string;
}

export interface PollingConfig {
  liveInterval: number;
  retryDelay: number;
  maxRetries: number;
  httpTimeout: number;
}

export const POLLING_CONFIG: PollingConfig = {
  liveInterval: 15_000,
  retryDelay: 5_000,
  maxRetries: 3,
  httpTimeout: 8_000,
};
