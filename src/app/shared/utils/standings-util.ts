import { GroupStanding, FormResult } from '../../core/models/standings-model';

/**
 * Groups flat standings array into a Map keyed by group_name
 */
export function groupByGroupName(standings: GroupStanding[]): Map<string, GroupStanding[]> {
  const groups = new Map<string, GroupStanding[]>();

  // Ensure we sort by rank within each group if not already sorted
  const sortedStandings = [...standings].sort((a, b) => {
    if (a.group_name !== b.group_name) {
      return a.group_name.localeCompare(b.group_name);
    }
    return a.rank - b.rank;
  });

  for (const standing of sortedStandings) {
    if (!groups.has(standing.group_name)) {
      groups.set(standing.group_name, []);
    }
    groups.get(standing.group_name)?.push(standing);
  }

  return groups;
}

/**
 * Returns the flag image URL for a given team.
 * Primero usa team_logo (ESPN), fallback a api-sports por team_external_id.
 */
export function getTeamFlagUrl(teamExternalId: number, teamLogo?: string | null): string {
  if (teamLogo) return teamLogo;
  if (!teamExternalId) return 'assets/flags/placeholder.png';
  return `https://media.api-sports.io/football/teams/${teamExternalId}.png`;
}

/**
 * Parses a form string ("WWDL") into an array of result types
 */
export function parseFormString(form: string | null): FormResult[] {
  if (!form) return [];
  return form.split('').filter(char => ['W', 'D', 'L'].includes(char)) as FormResult[];
}

/**
 * Determines if a team qualifies (has non-null description)
 */
export function isQualifying(standing: GroupStanding): boolean {
  return !!standing.description && standing.description.trim().length > 0;
}
