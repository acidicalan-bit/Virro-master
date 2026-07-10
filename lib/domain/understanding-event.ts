import type {
  AnalysisOutcome,
  EventStatus,
  UnderstandingEvent,
  UnderstandingScores,
} from "@/lib/types/understanding";

const scoreKeys: (keyof Omit<UnderstandingScores, "virroScore">)[] = [
  "degreeOfUnderstanding",
  "handoffReadiness",
  "automationReadiness",
  "technicalReadiness",
  "onboardingReadiness",
];

export const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export type CreateUnderstandingEventInput = Omit<UnderstandingEvent, "id" | "createdAt" | "status"> & {
  id?: string;
  createdAt?: string;
  status?: EventStatus;
};

export function createUnderstandingEvent(input: CreateUnderstandingEventInput): UnderstandingEvent {
  return {
    ...input,
    id: input.id ?? `UE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    createdAt: input.createdAt ?? new Date().toISOString(),
    status: input.status ?? statusFromScores(input.scores),
  };
}

export function calculateVirroScore(scores: Omit<UnderstandingScores, "virroScore">): number {
  const positiveSignals = scoreKeys.reduce((total, key) => total + scores[key], 0);
  const protectedSignals = 100 - scores.meaningLossRisk + (100 - scores.aiUnderstandingDebt);
  return clampScore((positiveSignals + protectedSignals) / (scoreKeys.length + 2));
}

export function statusFromScores(scores: UnderstandingScores): EventStatus {
  if (scores.meaningLossRisk >= 55 || scores.virroScore < 50) return "At risk";
  if (scores.virroScore >= 80 && scores.handoffReadiness >= 75) return "Ready";
  if (scores.virroScore >= 65) return "In review";
  return "Needs context";
}

export function validateUnderstandingEvent(event: UnderstandingEvent): string[] {
  const issues: string[] = [];
  if (!event.workspaceId.trim()) issues.push("workspaceId is required.");
  if (!event.title.trim()) issues.push("title is required.");
  if (event.rawInput.trim().length < 12) issues.push("rawInput must contain enough context to analyze.");
  if (!event.sourceRole.trim()) issues.push("sourceRole is required.");
  if (!event.targetRole.trim()) issues.push("targetRole is required.");
  if (!event.targetTeam.trim()) issues.push("targetTeam is required.");
  if (!event.expectedReceiver.trim()) issues.push("expectedReceiver is required.");
  for (const [name, value] of Object.entries(event.scores)) {
    if (!Number.isFinite(value) || value < 0 || value > 100) issues.push(`${name} must be between 0 and 100.`);
  }
  return issues;
}

export function eventSourceLabel(event: UnderstandingEvent): string {
  const inputLabel = event.inputType.replaceAll("-", " ");
  return `${inputLabel} · ${event.sourceRole}`;
}

export function formatRelativeTime(date: string, now = new Date()): string {
  const elapsed = now.getTime() - new Date(date).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

export function analysisOutcomeToResult(
  event: UnderstandingEvent,
  outcome: AnalysisOutcome,
): Omit<import("@/lib/types/understanding").AnalysisResult, "id"> {
  return {
    eventId: event.id,
    summary: `${outcome.inferredIntent}. Intended receiver: ${outcome.likelyReceiver}.`,
    meaningLossRisk: outcome.scores.meaningLossRisk,
    missingInformation: outcome.missingContext,
    assumptions: outcome.ambiguities,
    criticalQuestions: outcome.criticalQuestions,
    recommendedActions: [
      "Resolve the highest-impact missing context",
      `Prepare the recommended ${event.recommendedOutput.replaceAll("-", " ")}`,
    ],
    generatedArtifacts: [],
    scores: outcome.scores,
  };
}

export interface WorkspaceStats {
  virroScore: number;
  openEvents: number;
  atRisk: number;
  readyForAction: number;
  needsContext: number;
}

export function buildWorkspaceStats(events: UnderstandingEvent[]): WorkspaceStats {
  const open = events.filter((event) => event.status !== "Ready");
  const virroScore = events.length
    ? Math.round(events.reduce((total, event) => total + event.scores.virroScore, 0) / events.length)
    : 0;
  const readyCount = events.filter((event) => event.status === "Ready").length;
  return {
    virroScore,
    openEvents: open.length,
    atRisk: events.filter((event) => event.status === "At risk").length,
    readyForAction: events.length ? Math.round((readyCount / events.length) * 100) : 0,
    needsContext: events.filter((event) => event.status === "Needs context").length,
  };
}
