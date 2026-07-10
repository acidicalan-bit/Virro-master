import { mockEvents, workspaceStats } from "@/lib/data/mock-events";

export const demoScenarioService = {
  getWorkspaceOverview: () => workspaceStats,
  listUnderstandingEvents: () => mockEvents,
  getUnderstandingEvent: (id: string) => mockEvents.find((event) => event.id === id),
};
