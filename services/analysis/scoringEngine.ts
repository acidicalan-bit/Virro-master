import { calculateVirroScore, clampScore } from "@/lib/domain/understanding-event";
import type { UnderstandingEvent, UnderstandingScores } from "@/lib/types/understanding";
import type { ScoringContext } from "@/services/analysis/types";

const outcomePattern = /accept|success|done|result|outcome|objective|goal|expected|criteri|éxito|resultado|objetivo/i;
const constraintPattern = /must|cannot|should|constraint|limit|only|never|debe|no puede|límite/i;
const technicalPattern = /api|service|system|database|schema|slo|security|performance|rollback|architecture/i;
const onboardingPattern = /onboard|new hire|first day|training|learn|role|access|responsibilit/i;

export const EMPTY_SCORES: UnderstandingScores = {
  degreeOfUnderstanding: 0,
  meaningLossRisk: 0,
  handoffReadiness: 0,
  automationReadiness: 0,
  aiUnderstandingDebt: 0,
  technicalReadiness: 0,
  onboardingReadiness: 0,
  virroScore: 0,
};

export const scoringEngine = {
  score(event: UnderstandingEvent, context: ScoringContext): UnderstandingScores {
    const input = event.rawInput.trim();
    const words = input.split(/\s+/).filter(Boolean).length;
    const lengthSignal = Math.min(24, words / 2.5);
    const receiverSignal = event.expectedReceiver && event.targetRole && event.targetTeam ? 14 : 0;
    const outcomeSignal = outcomePattern.test(input) ? 12 : 0;
    const constraintSignal = constraintPattern.test(input) ? 9 : 0;
    const missingPenalty = context.missingInformation.length * 7;
    const riskPenalty = context.risks.length * 3;
    const claritySignals = context.claritySignals ?? 0;

    const degreeOfUnderstanding = clampScore(
      32 + lengthSignal + receiverSignal + outcomeSignal + constraintSignal + claritySignals - missingPenalty - riskPenalty,
    );
    const meaningLossRisk = clampScore(
      100 - degreeOfUnderstanding + context.risks.length * 5 + context.missingInformation.length * 2,
    );
    const handoffReadiness = clampScore(
      degreeOfUnderstanding + receiverSignal / 2 - context.missingInformation.length * 3,
    );
    const automationReadiness = clampScore(
      degreeOfUnderstanding + (constraintPattern.test(input) ? 6 : -8) - context.missingInformation.length * 4,
    );
    const aiUnderstandingDebt = clampScore(
      meaningLossRisk + context.missingInformation.length * 3 - (constraintPattern.test(input) ? 5 : 0),
    );
    const technicalReadiness = clampScore(
      degreeOfUnderstanding + (technicalPattern.test(input) ? 8 : -3) - context.missingInformation.length * 2,
    );
    const onboardingReadiness = clampScore(
      degreeOfUnderstanding + (onboardingPattern.test(input) ? 7 : -2) - context.missingInformation.length * 2,
    );

    const base = {
      degreeOfUnderstanding,
      meaningLossRisk,
      handoffReadiness,
      automationReadiness,
      aiUnderstandingDebt,
      technicalReadiness,
      onboardingReadiness,
    };
    const adjusted = Object.fromEntries(
      Object.entries(base).map(([key, value]) => [
        key,
        clampScore(value + (context.adjustments?.[key as keyof typeof base] ?? 0)),
      ]),
    ) as Omit<UnderstandingScores, "virroScore">;

    return { ...adjusted, virroScore: calculateVirroScore(adjusted) };
  },
};
