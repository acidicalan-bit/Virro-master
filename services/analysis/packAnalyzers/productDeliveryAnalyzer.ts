import type { PackAnalyzer } from "@/services/analysis/types";
import { compact, finishAnalysis, hasAny } from "./shared";

export const productDeliveryAnalyzer: PackAnalyzer = (event) => {
  const input = event.rawInput;
  const hasActor = hasAny(input, [/user|customer|admin|actor|persona|usuario|cliente/i]);
  const hasOutcome = hasAny(input, [/accept|success|expected|result|done|criteri|resultado|éxito/i]);
  const hasEdgeCases = hasAny(input, [/error|fail|invalid|edge|exception|fallback|rollback/i]);
  const isBug = event.inputType === "bug";
  const missingInformation = compact([
    !hasActor && "Primary actor or affected user",
    !hasOutcome && "Observable outcome or acceptance condition",
    !hasEdgeCases && "Failure, exception and edge-case behavior",
  ]);
  const risks = compact([
    !hasOutcome && "Delivery may be considered complete under different interpretations",
    !hasEdgeCases && "QA coverage may omit material failure paths",
    !hasActor && "The delivered behavior may optimize for the wrong user",
  ]);
  const recommendedOutput = isBug ? "bug-report" : "acceptance-criteria";
  return finishAnalysis(event, {
    summary: `The ${event.inputType.replaceAll("-", " ")} was evaluated for delivery intent, actor clarity, acceptance boundaries and testability.`,
    probableIntent: isBug ? `Restore the expected behavior described in “${event.title}”.` : `Turn “${event.title}” into a delivery-ready definition.`,
    missingInformation,
    risks,
    criticalQuestions: ["What observable behavior proves the outcome is complete?", "Which failure path must be handled before release?"],
    recommendedActions: ["Confirm the primary actor and business outcome", "Define acceptance boundaries and priority edge cases"],
    recommendedOutput,
    artifactTitle: `${event.title} — ${isBug ? "Bug Report" : "Acceptance Criteria"}`,
    claritySignals: [hasActor, hasOutcome, hasEdgeCases].filter(Boolean).length * 3,
    scoreAdjustments: { technicalReadiness: 4 },
  });
};
