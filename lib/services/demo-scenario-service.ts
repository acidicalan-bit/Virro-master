import { virroSeed } from "@/lib/data/seed";
import { buildWorkspaceStats } from "@/lib/domain/understanding-event";

export const demoScenarioService = {
  getWorkspace: () => virroSeed.workspace,
  getWorkspaceOverview: () => buildWorkspaceStats(virroSeed.events),
  listTeams: () => virroSeed.workspace.teams,
  listRoleCards: () => virroSeed.roleCards,
  listWorkflows: () => virroSeed.workflows,
  listUnderstandingEvents: () => virroSeed.events,
  getUnderstandingEvent: (id: string) => virroSeed.events.find((event) => event.id === id),
  listAnalysisResults: () => virroSeed.analysisResults,
  listReports: () => virroSeed.reports,
};
