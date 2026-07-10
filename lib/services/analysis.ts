import { estimateScores } from "@/lib/services/scoring";
import type { AnalysisResult, PackId } from "@/lib/types/understanding";

export interface AnalysisService {
  analyze(input: string, pack: PackId): Promise<AnalysisResult>;
}

export class MockAnalysisService implements AnalysisService {
  async analyze(input: string, pack: PackId): Promise<AnalysisResult> {
    await new Promise((resolve) => setTimeout(resolve, 550));
    const hasOwner = /owner|responsable|equipo|team|dueño/i.test(input);
    const hasOutcome = /result|resultado|objetivo|goal|success|éxito/i.test(input);
    const hasDeadline = /\b\d{1,2}[/-]\d{1,2}|deadline|fecha|viernes|lunes|Q[1-4]\b/i.test(input);
    return {
      inferredIntent: pack === "product-delivery" ? "Prepare a delivery-ready definition" : "Create actionable operational understanding",
      likelyReceiver: hasOwner ? "Named delivery owner and collaborating team" : "Receiver not explicitly identified",
      ambiguities: [!hasOutcome && "Expected outcome is implicit", !hasDeadline && "Decision or delivery horizon is not defined"].filter(Boolean) as string[],
      missingContext: [!hasOwner && "Accountable owner", !hasOutcome && "Observable success condition", !hasDeadline && "Timing or decision horizon"].filter(Boolean) as string[],
      criticalQuestions: ["What must the receiver be able to decide or do next?", "Which constraint would invalidate the expected outcome?"],
      riskSignals: ["Interpretation may vary across receivers", "Dependencies are not yet traceable"],
      scores: estimateScores(input),
    };
  }
}

export const analysisService: AnalysisService = new MockAnalysisService();
