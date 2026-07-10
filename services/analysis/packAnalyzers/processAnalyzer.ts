import type { PackAnalyzer } from "@/services/analysis/types";
import { compact, finishAnalysis, hasAny } from "./shared";

export const processAnalyzer: PackAnalyzer = (event) => {
  const input = event.rawInput;
  const hasTrigger = hasAny(input, [/when|trigger|starts|request|event|cuando|inicia/i]);
  const hasSequence = hasAny(input, [/then|next|after|before|step|first|finally|después|paso/i]);
  const hasDecision = hasAny(input, [/if|decision|approve|reject|otherwise|si |decisión|aprobar/i]);
  const hasExceptions = hasAny(input, [/exception|error|fail|escalat|fallback|excepción|falla/i]);
  const missingInformation = compact([
    !hasTrigger && "Process trigger and entry condition",
    !hasSequence && "Ordered operational steps",
    !hasDecision && "Decision rules and authority",
    !hasExceptions && "Exception and escalation paths",
  ]);
  const risks = compact([
    !hasDecision && "Teams may apply different decision logic to the same case",
    !hasExceptions && "Non-standard cases may stall without an escalation path",
    !hasSequence && "Tool automation may execute steps in the wrong order",
  ]);
  return finishAnalysis(event, {
    summary: "The process was evaluated for trigger, sequence, decisions, ownership and exception handling.",
    probableIntent: `Make “${event.title}” repeatable across people, teams and tools.`,
    missingInformation,
    risks,
    criticalQuestions: ["Which event starts this process?", "Who decides when the standard path no longer applies?"],
    recommendedActions: ["Define the trigger and ordered path", "Make decision rights and exception handling explicit"],
    recommendedOutput: "process-map",
    artifactTitle: `${event.title} — Process Map`,
    claritySignals: [hasTrigger, hasSequence, hasDecision, hasExceptions].filter(Boolean).length * 3,
    scoreAdjustments: { automationReadiness: 7 },
  });
};
