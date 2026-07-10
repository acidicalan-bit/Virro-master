import type {
  GeneratedArtifact,
  RecommendedOutputType,
  UnderstandingEvent,
  UnderstandingScores,
} from "@/lib/types/understanding";

export interface PackAnalysis {
  summary: string;
  probableIntent: string;
  targetReceiver: string;
  missingInformation: string[];
  risks: string[];
  criticalQuestions: string[];
  recommendedActions: string[];
  recommendedOutput: RecommendedOutputType;
  generatedArtifacts: GeneratedArtifact[];
  scores: UnderstandingScores;
}

export interface ScoringContext {
  missingInformation: string[];
  risks: string[];
  claritySignals?: number;
  adjustments?: Partial<Omit<UnderstandingScores, "virroScore">>;
}

export type PackAnalyzer = (event: UnderstandingEvent) => PackAnalysis;
