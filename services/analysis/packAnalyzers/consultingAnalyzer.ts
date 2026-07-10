import type { PackAnalyzer } from "@/services/analysis/types";
import { compact, finishAnalysis, hasAny } from "./shared";

export const consultingAnalyzer: PackAnalyzer = (event) => {
  const input = event.rawInput;
  const hasClientGoal = hasAny(input, [/client|business|goal|objective|outcome|cliente|negocio|objetivo/i]);
  const hasScope = hasAny(input, [/scope|include|exclude|in scope|out of scope|alcance|incluye|excluye/i]);
  const hasEvidence = hasAny(input, [/evidence|data|interview|finding|metric|dato|evidencia|hallazgo/i]);
  const hasDecision = hasAny(input, [/decision|approve|steering|sponsor|stakeholder|decisión|aprobar/i]);
  const missingInformation = compact([
    !hasClientGoal && "Client outcome and decision to support",
    !hasScope && "Delivery scope and exclusions",
    !hasEvidence && "Evidence supporting the current interpretation",
    !hasDecision && "Decision owner and approval path",
  ]);
  const risks = compact([
    !hasScope && "Client and delivery team may expect different deliverables",
    !hasEvidence && "Recommendations may be perceived as unsupported opinion",
    !hasDecision && "Delivery may finish without a clear adoption decision",
  ]);
  return finishAnalysis(event, {
    summary: "The consulting brief was evaluated for client outcome, scope, evidence, decision ownership and delivery alignment.",
    probableIntent: `Turn “${event.title}” into an evidence-backed client decision and delivery path.`,
    missingInformation,
    risks,
    criticalQuestions: ["Which client decision must this engagement enable?", "What evidence would materially change the recommendation?"],
    recommendedActions: ["Align the outcome, scope and exclusions", "Connect findings to evidence and a named decision owner"],
    recommendedOutput: "consulting-delivery-brief",
    artifactTitle: `${event.title} — Consulting Delivery Brief`,
    claritySignals: [hasClientGoal, hasScope, hasEvidence, hasDecision].filter(Boolean).length * 3,
  });
};
