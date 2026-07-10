import type {
  AnalysisResult,
  PackType,
  RecommendedOutputType,
  UnderstandingEvent,
  UnderstandingScores,
} from "./understanding";

export type AssistantPackType = PackType | "critical-flow-discovery";
export type AssistantMode = "new-event" | "critical-flow-discovery";

export interface MeaningLossRisk {
  id: string;
  title: string;
  description: string;
  affectedReceiver: string;
  severity: "low" | "medium" | "high";
}

export interface MissingContextItem {
  id: string;
  label: string;
  reason: string;
  blocking: boolean;
}

export interface CriticalQuestion {
  id: string;
  question: string;
  rationale: string;
  priority: number;
}

export interface OutputRecommendation {
  type: RecommendedOutputType;
  title: string;
  purpose: string;
}

export interface AuditOpportunity {
  title: string;
  detectedPain: string;
  recommendedPack: AssistantPackType;
  recommendedAudit: string;
  expectedValue: string;
  reason: string;
  confidence: number;
}

export interface ClassificationResult {
  pack: AssistantPackType;
  confidence: number;
  reason: string;
  signals: string[];
}

export interface AnalysisTraceStep {
  loop: "intake" | "classification" | "clarification" | "analysis" | "scoring" | "output" | "self-check" | "human-confirmation";
  status: "completed" | "awaiting-human";
  evidence: string;
  createdAt: string;
}

export interface AnalysisTrace {
  id: string;
  eventId: string;
  version: "assistant-mvp-v1";
  steps: AnalysisTraceStep[];
  assumptions: string[];
  humanValidationRequired: boolean;
  rawInputRetained: false;
}

export interface AssistantInput {
  mode: AssistantMode;
  title: string;
  rawInput: string;
  sourceRole?: string;
  expectedReceiver?: string;
  selectedPack?: PackType;
  workspaceId: string;
}

export interface AssistantResult {
  event: UnderstandingEvent;
  analysis: AnalysisResult;
  classification: ClassificationResult;
  meaningLossRisks: MeaningLossRisk[];
  missingContext: MissingContextItem[];
  criticalQuestions: CriticalQuestion[];
  outputRecommendation: OutputRecommendation;
  auditOpportunity: AuditOpportunity;
  scores: UnderstandingScores;
  trace: AnalysisTrace;
  selfCheck: string[];
}
