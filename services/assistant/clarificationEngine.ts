import type { CriticalQuestion, MissingContextItem } from "@/lib/types/assistant";

export function buildCriticalQuestions(items: MissingContextItem[]): CriticalQuestion[] {
  return items.slice(0, 3).map((item, index) => ({ id: `CQ-${index + 1}`, question: `What evidence or decision defines “${item.label}”?`, rationale: item.reason, priority: index + 1 }));
}
