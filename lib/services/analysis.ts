import { estimateScores } from "@/lib/services/scoring";
import type { AnalysisOutcome, PackId } from "@/lib/types/understanding";

export interface AnalysisService {
  analyze(input: string, pack: PackId, context?: AnalysisContext): Promise<AnalysisOutcome>;
}

export interface AnalysisContext {
  expectedReceiver?: string;
  sourceRole?: string;
  targetRole?: string;
  targetTeam?: string;
}

export class MockAnalysisService implements AnalysisService {
  async analyze(input: string, pack: PackId, context?: AnalysisContext): Promise<AnalysisOutcome> {
    await new Promise((resolve) => setTimeout(resolve, 550));
    const hasOwner = /owner|owns|owned by|accountable|responsable|equipo|team|dueño/i.test(input);
    const hasOutcome = /result|resultado|objetivo|goal|success|éxito/i.test(input);
    const hasDeadline = /\b\d{1,2}[/-]\d{1,2}|deadline|fecha|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|miércoles|jueves|viernes|sábado|domingo|Q[1-4]\b/i.test(input);
    return {
      inferredIntent: pack === "product-delivery" ? "Prepare a delivery-ready definition" : "Create actionable operational understanding",
      likelyReceiver: context?.expectedReceiver?.trim() || (hasOwner ? "Named delivery owner and collaborating team" : "Receiver not explicitly identified"),
      ambiguities: [!hasOutcome && "Expected outcome is implicit", !hasDeadline && "Decision or delivery horizon is not defined"].filter(Boolean) as string[],
      missingContext: [!hasOwner && "Accountable owner", !hasOutcome && "Observable success condition", !hasDeadline && "Timing or decision horizon"].filter(Boolean) as string[],
      criticalQuestions: ["What must the receiver be able to decide or do next?", "Which constraint would invalidate the expected outcome?"],
      riskSignals: ["Interpretation may vary across receivers", "Dependencies are not yet traceable"],
      scores: estimateScores(input),
    };
  }
}

export const analysisService: AnalysisService = new MockAnalysisService();
