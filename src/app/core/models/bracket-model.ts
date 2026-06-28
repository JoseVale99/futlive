export interface BracketTeamInfo {
  name: string;
  code: string;
  logo: string;
  score: number | null;
}

export interface KnockoutMatch {
  id: string;
  matchNum: number | null;
  round: string;
  date: string;
  status: string;
  statusDetail: string;
  home: BracketTeamInfo | null;
  away: BracketTeamInfo | null;
  winner: 'home' | 'away' | null;
}

export interface BracketResponse {
  matches: KnockoutMatch[];
}
