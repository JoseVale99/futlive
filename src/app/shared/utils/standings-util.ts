import { FormResult, GroupStanding } from '../../core/models/standings-model';

export function groupByGroupName(standings: GroupStanding[]): Map<string, GroupStanding[]> {
  const grouped = new Map<string, GroupStanding[]>();
  standings.forEach(standing => {
    if (!grouped.has(standing.group_name)) {
      grouped.set(standing.group_name, []);
    }
    grouped.get(standing.group_name)!.push(standing);
  });
  return grouped;
}

export function getTeamFlagUrl(teamExternalId: number): string {
  return `https://media.api-sports.io/football/teams/${teamExternalId}.png`;
}

export function parseFormString(form: string | null): FormResult[] {
  if (!form) return [];
  return form.split('').map(c => c.toUpperCase() as FormResult).filter(c => ['W', 'D', 'L'].includes(c));
}

export function isQualifying(standing: GroupStanding): boolean {
  return !!standing.description && standing.description.trim() !== '';
}
