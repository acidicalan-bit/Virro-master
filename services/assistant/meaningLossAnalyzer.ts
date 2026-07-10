import type { AssistantPackType, MeaningLossRisk, MissingContextItem } from "@/lib/types/assistant";

const packGaps: Record<AssistantPackType, string[]> = {
  "product-delivery": ["Observable acceptance boundary", "Primary actor and business outcome", "Priority failure behavior"],
  "ai-understanding": ["Authoritative context source", "Prohibited assumptions", "Human review owner"],
  "handoff-intelligence": ["Accountable receiver", "Dependencies and blockers", "Measurable definition of done"],
  "process-understanding": ["Process trigger", "Decision authority", "Exception and escalation path"],
  onboarding: ["Target role starting context", "Access and prerequisites", "Observable readiness evidence"],
  "consulting-delivery": ["Client decision to enable", "Scope exclusions", "Evidence and approval owner"],
  "talent-staffing": ["Expected role outcomes beyond keywords", "Autonomy and seniority boundary", "Screening and candidate-handoff evidence"],
  "technical-documentation": ["System and consumer boundaries", "Undocumented decision rationale", "Recovery and rollback ownership"],
  "critical-flow-discovery": ["Where the flow begins and ends", "Receiver who cannot act today", "Evidence of delay, rework or failure"],
};

export function analyzeMeaningLoss(pack: AssistantPackType, receiver: string) {
  const missingContext: MissingContextItem[] = packGaps[pack].map((label, index) => ({ id: `MC-${index + 1}`, label, reason: "This context materially changes what the next receiver can do.", blocking: index < 2 }));
  const meaningLossRisks: MeaningLossRisk[] = [
    { id: "ML-1", title: "Receiver reconstructs intent", description: "The next receiver may fill missing context with assumptions that differ from the source intent.", affectedReceiver: receiver, severity: "high" },
    { id: "ML-2", title: "Readiness is mistaken for delivery", description: "Information may advance because it was sent, even though the receiver cannot execute safely.", affectedReceiver: receiver, severity: "medium" },
  ];
  return { missingContext, meaningLossRisks };
}
