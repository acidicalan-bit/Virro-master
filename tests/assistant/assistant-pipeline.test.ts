import { describe, expect, it } from "vitest";
import { assistantOrchestrator } from "@/services/assistant";

describe("Virro Understanding Assistant pipeline", () => {
  it("classifies talent pain and returns an auditable bounded result", async () => {
    const result = await assistantOrchestrator.analyze({ mode: "critical-flow-discovery", workspaceId: "test", title: "QA Automation Senior role", rawInput: "Recruiters send candidates with Selenium keywords but the client rejects them because autonomy, API testing and CI/CD expectations were unclear." }, "en");
    expect(result.classification.pack).toBe("talent-staffing");
    expect(result.criticalQuestions.length).toBeLessThanOrEqual(3);
    expect(result.trace.steps).toHaveLength(8);
    expect(result.trace.rawInputRetained).toBe(false);
    expect(result.auditOpportunity.recommendedAudit).toBe("Talent & Staffing Understanding Audit");
    expect(result.selfCheck.length).toBeGreaterThan(0);
    for (const score of Object.values(result.scores)) expect(score).toBeGreaterThanOrEqual(0);
  });

  it("keeps unclassified pain in critical flow discovery", async () => {
    const result = await assistantOrchestrator.analyze({ mode: "critical-flow-discovery", workspaceId: "test", title: "Cross-team pain", rawInput: "Things move forward but people lose time and rebuild context before acting." }, "en");
    expect(result.classification.pack).toBe("critical-flow-discovery");
    expect(result.auditOpportunity.recommendedAudit).toContain("Meaning Loss Audit");
  });
});
