import type { Report, UnderstandingEvent } from "@/lib/types/understanding";
import { buildWorkspaceStats } from "@/lib/domain/understanding-event";

export const reportBuilder = {
  buildExecutiveReport(
    workspaceId: string,
    events: UnderstandingEvent[],
    createdAt = new Date().toISOString(),
  ): Report {
    const stats = buildWorkspaceStats(events);
    const primaryRisks = [...new Set(events.flatMap((event) => event.risks))].slice(0, 5);
    const missingContext = [...new Set(events.flatMap((event) => event.missingContext))].slice(0, 5);

    return {
      id: `report-${crypto.randomUUID().slice(0, 8)}`,
      workspaceId,
      reportType: "executive",
      title: "Executive Operational Understanding Report",
      summary: `The estimated Virro Score is ${stats.virroScore}. ${stats.atRisk} events are currently at risk and ${stats.readyForAction}% are ready for action.`,
      findings: [
        ...primaryRisks.map((risk) => `Risk: ${risk}`),
        ...missingContext.map((context) => `Missing context: ${context}`),
      ],
      recommendations: [
        "Resolve the highest-impact missing context before the next cross-team handoff.",
        "Assign explicit ownership to events with elevated meaning loss risk.",
        "Review probabilistic readiness signals with the accountable teams.",
      ],
      createdAt,
    };
  },
};
