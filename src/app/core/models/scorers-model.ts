export interface TopScorer {
  rank: number;
  player_name: string;
  player_photo: string;
  team: string;
  team_code: string;
  team_flag: string;
  goals: number;
}

export interface TopAssister {
  rank: number;
  player_name: string;
  player_photo: string;
  team: string;
  team_code: string;
  team_flag: string;
  assists: number;
}

export interface CardEntry {
  rank: number;
  player_name: string;
  player_photo: string;
  team: string;
  team_code: string;
  team_flag: string;
  value: number;
  card_type: 'yellow' | 'red';
}

/** Respuesta cruda del endpoint /api/scorers/board */
export interface ScorersApiPlayer {
  category: 'goals' | 'assists' | 'yellow' | 'red';
  rank: number;
  player_name: string;
  player_photo: string;
  team: string;
  team_code: string;
  value: number;
  updated_at: string;
  player_external_id: number;
}

export interface ScorersApiResponse {
  players: ScorersApiPlayer[];
}
