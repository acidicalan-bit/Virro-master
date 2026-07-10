import { describe, expect, it } from "vitest";
import { demoScenarios } from "@/lib/data/demo-scenarios";
import { createUnderstandingEvent } from "@/lib/domain/understanding-event";
import { packAnalyzerRegistry } from "@/services/analysis/analysisEngine";

describe("pack analyzers", () => {
  for (const scenario of demoScenarios) {
    it(`${scenario.packType} returns the consistent AnalysisResult payload`, () => {
      const event = createUnderstandingEvent({
        id: `TEST-${scenario.id}`,
        createdAt: "2026-07-10T00:00:00.000Z",
        workspaceId: "test-workspace",
        title: scenario.title,
        rawInput: scenario.rawInput,
        inputType: scenario.inputType,
        sourceRole: scenario.sourceRole,
        targetRole: scenario.targetRole,
        targetTeam: scenario.targetTeam,
        expectedReceiver: scenario.targetReceiver,
        packType: scenario.packType,
        probableIntent: "Pending",
        missingContext: [],
        risks: [],
        criticalQuestions: [],
        recommendedOutput: scenario.generatedOutput.type,
        scores: scenario.mockScores,
      });
      const result = packAnalyzerRegistry[scenario.packType](event);

      expect(result.summary).toBeTruthy();
      expect(result.probableIntent).toBeTruthy();
      expect(result.targetReceiver).toBe(scenario.targetReceiver);
      expect(Array.isArray(result.missingInformation)).toBe(true);
      expect(Array.isArray(result.risks)).toBe(true);
      expect(result.criticalQuestions.length).toBeGreaterThan(0);
      expect(result.recommendedActions.length).toBeGreaterThan(0);
      expect(result.generatedArtifacts).toHaveLength(1);
      expect(result.generatedArtifacts[0].type).toBe(result.recommendedOutput);
      for (const score of Object.values(result.scores)) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });
  }
});
