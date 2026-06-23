export interface TopScorer {
  rank: number;
  player_name: string;
  team: string;
  team_flag: string;
  goals: number;
  assists: number;
  matches_played: number;
}

export type ScorersResponse = TopScorer[];
