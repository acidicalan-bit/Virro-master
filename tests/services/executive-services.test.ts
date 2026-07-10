import { describe, expect, it } from "vitest";
import { events, workspace } from "@/lib/data/seed";
import { buildDashboardInsights } from "@/lib/services/dashboard-insights";
import { reportBuilder, reportDefinitions } from "@/lib/services/report-builder";

describe("executive services", () => {
  it("derives dashboard risk and backlog from events", () => {
    const insights = buildDashboardInsights(events);
    expect(insights.metrics.totalEvents).toBe(events.length);
    expect(insights.areaRisk.length).toBeGreaterThan(0);
    expect(insights.backlog.length).toBeGreaterThan(0);
    expect(insights.recommendedActions.length).toBeGreaterThan(0);
  });

  it("builds all nine enterprise report types", () => {
    expect(reportDefinitions).toHaveLength(9);
    for (const definition of reportDefinitions) {
      const report = reportBuilder.buildReport(workspace.id, events, definition.type, "2026-07-10T00:00:00.000Z");
      expect(report.title).toBe(definition.label);
      expect(report.summary).toBeTruthy();
      expect(report.whatWasAnalyzed.length).toBeGreaterThan(0);
      expect(Object.keys(report.scores).length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.suggestedNextPilot).toBeTruthy();
    }
  });

  it("builds the executive narrative in Spanish when requested", () => {
    const report = reportBuilder.buildReport(workspace.id, events, "executive-virro-score", "2026-07-10T00:00:00.000Z", "es");
    expect(report.summary).toContain("Se analizaron");
    expect(report.recommendations[1]).toContain("responsable");
    expect(report.suggestedNextPilot).toContain("piloto de entendimiento");
  });
});
