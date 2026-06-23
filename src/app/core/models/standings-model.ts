export interface GroupStanding {
  group_name: string;
  rank: number;
  team: string;
  team_code: string;
  team_external_id: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  description: string | null;
  form: string | null;
  updated_at: string;
}

export type FormResult = 'W' | 'D' | 'L';

export interface GroupedStandings {
  groupName: string;
  teams: GroupStanding[];
}
