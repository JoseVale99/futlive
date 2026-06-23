export interface GroupStanding {
  id: string;
  group_name: string;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  rank: number;
  created_at: string;
}
