import type { PackAnalyzer } from "@/services/analysis/types";
import { compact, finishAnalysis, hasAny } from "./shared";

export const onboardingAnalyzer: PackAnalyzer = (event) => {
  const input = event.rawInput;
  const hasAudience = hasAny(input, [/new hire|new team|role|audience|starter|nuevo|rol/i]);
  const hasAccess = hasAny(input, [/access|permission|account|tool|credential|acceso|permiso/i]);
  const hasResponsibilities = hasAny(input, [/responsib|owns|accountable|expected|responsable|debe/i]);
  const hasReadiness = hasAny(input, [/complete|ready|demonstrate|assessment|success|listo|complet/i]);
  const missingInformation = compact([
    !hasAudience && "Target role and starting knowledge",
    !hasAccess && "Required tools, access and prerequisites",
    !hasResponsibilities && "Role responsibilities and decision boundaries",
    !hasReadiness && "Observable onboarding completion condition",
  ]);
  const risks = compact([
    !hasAccess && "The new role may understand the work but remain unable to perform it",
    !hasResponsibilities && "Ownership boundaries may be learned through inconsistent tribal knowledge",
    !hasReadiness && "Completion may measure content consumption instead of operational readiness",
  ]);
  return finishAnalysis(event, {
    summary: "The material was evaluated for audience fit, prerequisites, role context and observable readiness.",
    probableIntent: `Enable the target receiver to perform “${event.title}” with the right context and boundaries.`,
    missingInformation,
    risks,
    criticalQuestions: ["What should the person be able to do without assistance?", "Which access or prerequisite blocks real execution?"],
    recommendedActions: ["Sequence role context before procedural detail", "Define access needs and an observable readiness checkpoint"],
    recommendedOutput: "onboarding-card",
    artifactTitle: `${event.title} — Onboarding Card`,
    claritySignals: [hasAudience, hasAccess, hasResponsibilities, hasReadiness].filter(Boolean).length * 3,
    scoreAdjustments: { onboardingReadiness: 9 },
  });
};
