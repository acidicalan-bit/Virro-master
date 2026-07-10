export type EventStatus = "Needs context" | "Ready" | "In review" | "At risk";

export type PackId =
  | "product-delivery"
  | "ai-understanding"
  | "handoff-intelligence"
  | "process-understanding"
  | "onboarding"
  | "consulting-delivery"
  | "technical-documentation";

export interface UnderstandingScores {
  degreeOfUnderstanding: number;
  meaningLossRisk: number;
  handoffReadiness: number;
  automationReadiness: number;
  aiUnderstandingDebt: number;
  technicalReadiness: number;
  onboardingReadiness: number;
  virroScore: number;
}

export interface UnderstandingEvent {
  id: string;
  title: string;
  source: string;
  team: string;
  owner: string;
  pack: PackId;
  status: EventStatus;
  createdAt: string;
  summary: string;
  missingContext: string[];
  criticalQuestions: string[];
  scores: UnderstandingScores;
}

export interface AnalysisResult {
  inferredIntent: string;
  likelyReceiver: string;
  ambiguities: string[];
  missingContext: string[];
  criticalQuestions: string[];
  riskSignals: string[];
  scores: UnderstandingScores;
}
