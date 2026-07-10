export type EntityId = string;
export type ISODateString = string;

export type InputType =
  | "user-story"
  | "bug"
  | "meeting-notes"
  | "ai-instruction"
  | "process"
  | "handoff"
  | "technical-documentation"
  | "onboarding-material"
  | "consulting-brief";

export type PackType =
  | "product-delivery"
  | "ai-understanding"
  | "handoff-intelligence"
  | "process-understanding"
  | "onboarding"
  | "consulting-delivery"
  | "technical-documentation";

/** Backwards-compatible name used by the analysis pack registry. */
export type PackId = PackType;

export type EventStatus = "Needs context" | "Ready" | "In review" | "At risk";

export type RecommendedOutputType =
  | "user-story"
  | "acceptance-criteria"
  | "qa-matrix"
  | "bug-report"
  | "handoff-brief"
  | "context-pack"
  | "process-map"
  | "technical-understanding-map"
  | "onboarding-card"
  | "consulting-delivery-brief"
  | "executive-report";

export type ReportType =
  | "meaning-loss-audit"
  | "product-delivery-understanding"
  | "ai-understanding-audit"
  | "handoff-readiness"
  | "process-understanding"
  | "onboarding-understanding"
  | "consulting-delivery"
  | "technical-documentation-understanding"
  | "executive-virro-score";

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

export interface Team {
  id: EntityId;
  workspaceId: EntityId;
  name: string;
  description: string;
  responsibilities: string[];
}

export interface CompanyWorkspace {
  id: EntityId;
  name: string;
  industry: string;
  description: string;
  tools: string[];
  teams: Team[];
  createdAt: ISODateString;
}

export interface RoleCard {
  id: EntityId;
  workspaceId: EntityId;
  teamId: EntityId;
  roleName: string;
  needsToUnderstand: string[];
  commonMisunderstandings: string[];
  requiredInputs: string[];
  expectedOutputs: string[];
  blockingQuestions: string[];
}

export interface Workflow {
  id: EntityId;
  workspaceId: EntityId;
  name: string;
  sourceTeam: string;
  targetTeam: string;
  description: string;
  commonRisks: string[];
}

export interface UnderstandingEvent {
  id: EntityId;
  workspaceId: EntityId;
  title: string;
  rawInput: string;
  inputType: InputType;
  sourceRole: string;
  targetRole: string;
  targetTeam: string;
  expectedReceiver: string;
  packType: PackType;
  probableIntent: string;
  missingContext: string[];
  risks: string[];
  criticalQuestions: string[];
  recommendedOutput: RecommendedOutputType;
  status: EventStatus;
  scores: UnderstandingScores;
  createdAt: ISODateString;
}

export interface GeneratedArtifact {
  id: EntityId;
  type: RecommendedOutputType;
  title: string;
  status: "draft" | "ready";
}

export interface AnalysisResult {
  id: EntityId;
  eventId: EntityId;
  summary: string;
  probableIntent: string;
  targetReceiver: string;
  meaningLossRisk: number;
  missingInformation: string[];
  assumptions: string[];
  risks: string[];
  criticalQuestions: string[];
  recommendedActions: string[];
  recommendedOutput: RecommendedOutputType;
  generatedArtifacts: GeneratedArtifact[];
  scores: UnderstandingScores;
}

/** Non-persisted response returned by an AnalysisService implementation. */
export interface AnalysisOutcome {
  inferredIntent: string;
  likelyReceiver: string;
  ambiguities: string[];
  missingContext: string[];
  criticalQuestions: string[];
  riskSignals: string[];
  scores: UnderstandingScores;
}

export interface Report {
  id: EntityId;
  workspaceId: EntityId;
  reportType: ReportType;
  title: string;
  summary: string;
  findings: string[];
  recommendations: string[];
  createdAt: ISODateString;
}

export interface EnterpriseReport extends Report {
  whatWasAnalyzed: string[];
  scores: Partial<UnderstandingScores>;
  missingContext: string[];
  criticalQuestions: string[];
  understandingDebtBacklog: string[];
  suggestedNextPilot: string;
}

export interface VirroSeedData {
  workspace: CompanyWorkspace;
  roleCards: RoleCard[];
  workflows: Workflow[];
  events: UnderstandingEvent[];
  analysisResults: AnalysisResult[];
  reports: Report[];
}
