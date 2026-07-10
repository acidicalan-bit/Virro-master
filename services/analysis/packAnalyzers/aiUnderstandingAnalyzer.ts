import type { PackAnalyzer } from "@/services/analysis/types";
import { compact, finishAnalysis, hasAny } from "./shared";

export const aiUnderstandingAnalyzer: PackAnalyzer = (event) => {
  const input = event.rawInput;
  const hasPurpose = hasAny(input, [/purpose|goal|objective|outcome|so that|objetivo|resultado/i]);
  const hasContext = hasAny(input, [/source|context|document|data|customer|system|fuente|contexto/i]);
  const hasBoundaries = hasAny(input, [/must|cannot|never|only|constraint|policy|debe|no puede/i]);
  const hasReview = hasAny(input, [/review|approve|human|verify|validation|revis|aprobar/i]);
  const missingInformation = compact([
    !hasPurpose && "Explicit purpose and intended decision",
    !hasContext && "Authoritative context or source material",
    !hasBoundaries && "Instruction boundaries and prohibited behavior",
    !hasReview && "Human review or verification responsibility",
  ]);
  const risks = compact([
    !hasContext && "AI output may be grounded in incomplete or assumed context",
    !hasBoundaries && "The system may act beyond the intended operational boundary",
    !hasReview && "Unverified output may be treated as an approved decision",
  ]);
  return finishAnalysis(event, {
    summary: "The instruction was evaluated for purpose, grounding context, action boundaries and human verification.",
    probableIntent: `Enable an AI system to act on “${event.title}” with bounded, reviewable context.`,
    missingInformation,
    risks,
    criticalQuestions: ["Which source is authoritative when context conflicts?", "What must the AI never infer or decide autonomously?"],
    recommendedActions: ["Package the authoritative context", "Define constraints, expected structure and human review ownership"],
    recommendedOutput: "context-pack",
    artifactTitle: `${event.title} — AI Context Pack`,
    claritySignals: [hasPurpose, hasContext, hasBoundaries, hasReview].filter(Boolean).length * 3,
    scoreAdjustments: { automationReadiness: 5, aiUnderstandingDebt: -6 },
  });
};
