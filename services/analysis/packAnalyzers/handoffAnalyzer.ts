import type { PackAnalyzer } from "@/services/analysis/types";
import { compact, finishAnalysis, hasAny } from "./shared";

export const handoffAnalyzer: PackAnalyzer = (event) => {
  const input = event.rawInput;
  const hasOwner = hasAny(input, [/owner|owns|accountable|responsible|responsable|dueño/i]);
  const hasDependencies = hasAny(input, [/depend|requires|blocked|after|before|dependency|depende|bloque/i]);
  const hasTiming = hasAny(input, [/deadline|date|today|tomorrow|monday|tuesday|wednesday|thursday|friday|Q[1-4]|fecha|lunes|viernes/i]);
  const hasDone = hasAny(input, [/done|complete|accept|success|ready|finished|terminado|éxito/i]);
  const missingInformation = compact([
    !hasOwner && "Explicit accountable owner",
    !hasDependencies && "Dependencies and blockers",
    !hasTiming && "Decision or delivery horizon",
    !hasDone && "Definition of done for the receiver",
  ]);
  const risks = compact([
    !hasOwner && "The handoff can arrive without accountable follow-through",
    !hasDependencies && "The receiver may discover blockers after accepting ownership",
    !hasDone && "Source and receiver may disagree on completion",
  ]);
  return finishAnalysis(event, {
    summary: "The handoff was evaluated for receiver fit, ownership, dependencies, timing and completion boundaries.",
    probableIntent: `Transfer responsibility for “${event.title}” without losing operational meaning.`,
    missingInformation,
    risks,
    criticalQuestions: ["What must the receiver be able to do immediately after accepting this handoff?", "Which dependency can block the next action?"],
    recommendedActions: ["Name one accountable receiver", "Attach dependencies, timing and a measurable definition of done"],
    recommendedOutput: "handoff-brief",
    artifactTitle: `${event.title} — Handoff Brief`,
    claritySignals: [hasOwner, hasDependencies, hasTiming, hasDone].filter(Boolean).length * 3,
    scoreAdjustments: { handoffReadiness: 8 },
  });
};
