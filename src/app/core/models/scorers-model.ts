export interface TopScorer {
  rank: number;
  player_name: string;
  team: string;
  team_flag: string;
  goals: number;
  assists: number;
  matches_played: number;
}

export interface TopAssister {
  rank: number;
  player_name: string;
  team: string;
  team_flag: string;
  assists: number;
  matches_played: number;
}

export interface CardEntry {
  rank: number;
  player_name: string;
  team: string;
  team_flag: string;
  yellow_cards: number;
  red_cards: number;
  card_type: 'amarilla' | 'roja';
}

export type ScorersResponse = TopScorer[];
