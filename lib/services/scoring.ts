import type { UnderstandingScores } from "@/lib/types/understanding";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function estimateScores(input: string): UnderstandingScores {
  const words = input.trim().split(/\s+/).filter(Boolean);
  const hasOwner = /owner|owns|owned by|accountable|responsable|equipo|team|dueño/i.test(input);
  const hasConstraint = /must|debe|cannot|no puede|constraint|límite/i.test(input);
  const hasOutcome = /result|resultado|objetivo|goal|success|éxito/i.test(input);
  const hasQuestion = input.includes("?");
  const contextSignal = Math.min(words.length / 1.5, 34) + (hasOwner ? 13 : 0) + (hasConstraint ? 12 : 0) + (hasOutcome ? 14 : 0);
  const degreeOfUnderstanding = clamp(28 + contextSignal - (hasQuestion ? 4 : 0));
  const meaningLossRisk = clamp(100 - degreeOfUnderstanding + (words.length < 20 ? 12 : 0));
  const handoffReadiness = clamp(degreeOfUnderstanding + (hasOwner ? 8 : -8));
  const automationReadiness = clamp(degreeOfUnderstanding + (hasConstraint ? 6 : -12));
  const aiUnderstandingDebt = clamp(meaningLossRisk + (hasConstraint ? -5 : 8));
  const technicalReadiness = clamp(degreeOfUnderstanding - 4);
  const onboardingReadiness = clamp(degreeOfUnderstanding + (hasOutcome ? 5 : -4));
  const virroScore = clamp((degreeOfUnderstanding + handoffReadiness + automationReadiness + technicalReadiness + onboardingReadiness + (100 - meaningLossRisk) + (100 - aiUnderstandingDebt)) / 7);

  return { degreeOfUnderstanding, meaningLossRisk, handoffReadiness, automationReadiness, aiUnderstandingDebt, technicalReadiness, onboardingReadiness, virroScore };
}
