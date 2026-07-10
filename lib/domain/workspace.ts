import type { CompanyWorkspace, RoleCard, Team, Workflow } from "@/lib/types/understanding";

export const getTeamById = (workspace: CompanyWorkspace, teamId: string): Team | undefined =>
  workspace.teams.find((team) => team.id === teamId);

export const getRoleCardsByTeam = (roleCards: RoleCard[], teamId: string): RoleCard[] =>
  roleCards.filter((role) => role.teamId === teamId);

export const getWorkflowsForTeam = (workflows: Workflow[], teamName: string): Workflow[] =>
  workflows.filter((workflow) => workflow.sourceTeam === teamName || workflow.targetTeam === teamName);

export function validateWorkspaceReferences(
  workspace: CompanyWorkspace,
  roleCards: RoleCard[],
  workflows: Workflow[],
): string[] {
  const issues: string[] = [];
  const teamIds = new Set(workspace.teams.map((team) => team.id));
  const teamNames = new Set(workspace.teams.map((team) => team.name));

  for (const role of roleCards) {
    if (role.workspaceId !== workspace.id) issues.push(`Role ${role.id} belongs to another workspace.`);
    if (!teamIds.has(role.teamId)) issues.push(`Role ${role.id} references an unknown team.`);
  }
  for (const workflow of workflows) {
    if (!teamNames.has(workflow.sourceTeam)) issues.push(`Workflow ${workflow.id} has an unknown source team.`);
    if (!teamNames.has(workflow.targetTeam)) issues.push(`Workflow ${workflow.id} has an unknown target team.`);
  }
  return issues;
}
