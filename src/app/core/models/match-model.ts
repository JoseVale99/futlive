export type MatchStatus = 'scheduled' | 'live' | 'finished';

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
}

export interface MatchState {
  matches: Match[];
  loading: boolean;
  error: string | null;
  activeStatus: MatchStatus;
}
