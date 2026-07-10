import type { PackAnalyzer } from "@/services/analysis/types";
import { compact, finishAnalysis, hasAny } from "./shared";

export const technicalDocumentationAnalyzer: PackAnalyzer = (event) => {
  const input = event.rawInput;
  const hasBoundary = hasAny(input, [/system|service|component|api|database|boundary|architecture/i]);
  const hasDependencies = hasAny(input, [/depend|consumer|upstream|downstream|integration|requires/i]);
  const hasQuality = hasAny(input, [/slo|security|performance|availability|latency|privacy|reliability/i]);
  const hasFailure = hasAny(input, [/rollback|failure|error|recover|fallback|incident/i]);
  const missingInformation = compact([
    !hasBoundary && "System boundary and affected components",
    !hasDependencies && "Upstream, downstream and consumer dependencies",
    !hasQuality && "Reliability, security or performance constraints",
    !hasFailure && "Failure, recovery and rollback behavior",
  ]);
  const risks = compact([
    !hasDependencies && "A change may break consumers that are absent from the documented boundary",
    !hasQuality && "Implementation may satisfy function while violating operational constraints",
    !hasFailure && "Teams may be unable to recover safely from a failed change",
  ]);
  return finishAnalysis(event, {
    summary: "The technical documentation was evaluated for boundaries, dependencies, quality constraints and recovery readiness.",
    probableIntent: `Enable safe technical action on “${event.title}” without relying on undocumented system knowledge.`,
    missingInformation,
    risks,
    criticalQuestions: ["Which consumer or dependency can invalidate the proposed change?", "What measurable condition triggers recovery or rollback?"],
    recommendedActions: ["Map system boundaries and dependencies", "Document quality constraints, failure modes and recovery ownership"],
    recommendedOutput: "technical-understanding-map",
    artifactTitle: `${event.title} — Technical Understanding Map`,
    claritySignals: [hasBoundary, hasDependencies, hasQuality, hasFailure].filter(Boolean).length * 3,
    scoreAdjustments: { technicalReadiness: 10 },
  });
};
