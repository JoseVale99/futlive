export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type EventType = 'goal' | 'yellow' | 'red' | 'sub';

export interface MatchEvent {
  id: string;
  match_id: string;
  team: 'home' | 'away';
  type: EventType;
  player: string;
  assist: string | null;
  minute: number;
  created_at: string;
}

/** @deprecated Usar MatchEvent con type='goal' */
export interface Goal {
  team: 'home' | 'away';
  scorer: string;
  minute: number;
}

export interface MatchStats {
  match_id: string;
  team: 'home' | 'away';
  possession: number;
  shots: number;
  shots_on_target: number;
  corners: number;
  fouls: number;
}

export interface Match {
  id: string;
  external_id: string;
  competition: string;
  stage: string;
  group_name: string | null;
  home_team: string;
  away_team: string;
  home_flag: string;
  away_flag: string;
  kickoff_at: string; // Timestamp ISO
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  time_elapsed: number | null;
  updated_at: string;
  venue_name: string;
  venue_city: string;
  goals?: Goal[];
  events?: MatchEvent[];
  stats?: MatchStats[];
}

export interface MatchState {
  matches: Match[];
  loading: boolean;
  error: string | null;
  activeStatus: MatchStatus;
}
