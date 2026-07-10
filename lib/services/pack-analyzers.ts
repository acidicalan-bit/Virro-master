import type { PackId, RecommendedOutputType } from "@/lib/types/understanding";

export interface PackDefinition {
  id: PackId;
  outputTypes: string[];
  focusSignals: string[];
}

export const packAnalyzers: Record<PackId, PackDefinition> = {
  "product-delivery": { id: "product-delivery", outputTypes: ["User Story", "Acceptance Criteria", "QA Matrix", "Bug Report"], focusSignals: ["scope", "behavior", "edge cases"] },
  "ai-understanding": { id: "ai-understanding", outputTypes: ["Context Pack", "AI Boundary Map"], focusSignals: ["context integrity", "constraints", "understanding debt"] },
  "handoff-intelligence": { id: "handoff-intelligence", outputTypes: ["Handoff Brief", "Dependency Map"], focusSignals: ["receiver", "ownership", "meaning loss"] },
  "process-understanding": { id: "process-understanding", outputTypes: ["Process Map", "Decision Map"], focusSignals: ["sequence", "decision rights", "exceptions"] },
  onboarding: { id: "onboarding", outputTypes: ["Onboarding Card", "Context Pack"], focusSignals: ["role context", "learning sequence", "readiness"] },
  "consulting-delivery": { id: "consulting-delivery", outputTypes: ["Consulting Delivery Brief", "Executive Report"], focusSignals: ["client intent", "evidence", "decision trace"] },
  "technical-documentation": { id: "technical-documentation", outputTypes: ["Technical Understanding Map", "Architecture Gap Report"], focusSignals: ["system boundaries", "decision rationale", "operational risk"] },
};

export const recommendedOutputByPack: Record<PackId, RecommendedOutputType> = {
  "product-delivery": "acceptance-criteria",
  "ai-understanding": "context-pack",
  "handoff-intelligence": "handoff-brief",
  "process-understanding": "process-map",
  onboarding: "onboarding-card",
  "consulting-delivery": "consulting-delivery-brief",
  "technical-documentation": "technical-understanding-map",
};
