import { scoringEngine } from "@/services/analysis/scoringEngine";
import type { PackAnalysis } from "@/services/analysis/types";
import type {
  RecommendedOutputType,
  UnderstandingEvent,
} from "@/lib/types/understanding";

export const hasAny = (input: string, patterns: RegExp[]) => patterns.some((pattern) => pattern.test(input));

export const compact = (items: Array<string | false | null | undefined>): string[] =>
  items.filter((item): item is string => Boolean(item));

export interface AnalysisDraft {
  summary: string;
  probableIntent: string;
  missingInformation: string[];
  risks: string[];
  criticalQuestions: string[];
  recommendedActions: string[];
  recommendedOutput: RecommendedOutputType;
  artifactTitle: string;
  claritySignals?: number;
  scoreAdjustments?: Parameters<typeof scoringEngine.score>[1]["adjustments"];
}

export function finishAnalysis(event: UnderstandingEvent, draft: AnalysisDraft): PackAnalysis {
  const generatedArtifacts = [
    {
      id: `OA-${event.id.replace(/[^a-z0-9]/gi, "").toUpperCase()}-${draft.recommendedOutput}`,
      type: draft.recommendedOutput,
      title: draft.artifactTitle,
      status: "draft" as const,
    },
  ];
  return {
    summary: draft.summary,
    probableIntent: draft.probableIntent,
    targetReceiver: event.expectedReceiver || `${event.targetRole} in ${event.targetTeam}`,
    missingInformation: draft.missingInformation,
    risks: draft.risks,
    criticalQuestions: draft.criticalQuestions,
    recommendedActions: draft.recommendedActions,
    recommendedOutput: draft.recommendedOutput,
    generatedArtifacts,
    scores: scoringEngine.score(event, {
      missingInformation: draft.missingInformation,
      risks: draft.risks,
      claritySignals: draft.claritySignals,
      adjustments: draft.scoreAdjustments,
    }),
  };
}
