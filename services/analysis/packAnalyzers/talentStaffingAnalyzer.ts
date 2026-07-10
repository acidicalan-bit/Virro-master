import type { PackAnalyzer } from "@/services/analysis/types";
import { compact, finishAnalysis, hasAny } from "./shared";

export const talentStaffingAnalyzer: PackAnalyzer = (event) => {
  const input = event.rawInput;
  const hasOutcome = hasAny(input, [/outcome|deliver|expected|resultado|entrega|expectativa/i]);
  const hasAutonomy = hasAny(input, [/autonom|ownership|senior|lead|independent|autonomía|responsab/i]);
  const hasStack = hasAny(input, [/selenium|cypress|playwright|api|ci\/cd|stack|tool|herramient/i]);
  const hasContext = hasAny(input, [/domain|client|team|language|project|dominio|cliente|equipo|idioma|proyecto/i]);
  const missingInformation = compact([
    !hasOutcome && "Expected role outcomes and delivery evidence",
    !hasAutonomy && "Required autonomy, ownership and decision boundaries",
    !hasStack && "Real tools, testing scope and technical constraints",
    !hasContext && "Client, team, domain and communication context",
  ]);
  const risks = compact([
    !hasOutcome && "Candidates may be filtered by keywords instead of operational fit",
    !hasAutonomy && "Seniority expectations may differ between recruiter and hiring manager",
    !hasContext && "A capable candidate may be rejected because the handoff lacks context",
  ]);
  const candidateHandoff = event.inputType === "candidate-handoff";
  return finishAnalysis(event, {
    summary: "The talent requirement was evaluated for role outcomes, autonomy, technical context, screening alignment and candidate handoff readiness.",
    probableIntent: candidateHandoff ? `Present “${event.title}” with enough operational context for a fair receiver decision.` : `Turn “${event.title}” into a role requirement that recruiters and hiring managers understand consistently.`,
    missingInformation,
    risks,
    criticalQuestions: ["What must this person be able to deliver independently?", "Which evidence demonstrates fit beyond tool keywords?", "Which expectation would cause the client to reject an otherwise capable candidate?"],
    recommendedActions: ["Align role outcomes and autonomy before activating search", "Create explicit screening and candidate-handoff criteria"],
    recommendedOutput: candidateHandoff ? "candidate-handoff-pack" : "role-understanding-pack",
    artifactTitle: `${event.title} — ${candidateHandoff ? "Candidate Handoff Pack" : "Role Understanding Pack"}`,
    claritySignals: [hasOutcome, hasAutonomy, hasStack, hasContext].filter(Boolean).length * 3,
    scoreAdjustments: { handoffReadiness: 5, onboardingReadiness: 4 },
  });
};
