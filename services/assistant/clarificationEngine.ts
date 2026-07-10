import type { CriticalQuestion, MissingContextItem } from "@/lib/types/assistant";
import type { Locale } from "@/lib/i18n/locale";

export function buildCriticalQuestions(items: MissingContextItem[], locale: Locale = "en"): CriticalQuestion[] {
  return items.slice(0, 3).map((item, index) => ({ id: `CQ-${index + 1}`, question: locale === "es" ? `¿Qué evidencia o decisión define “${item.label}”?` : `What evidence or decision defines “${item.label}”?`, rationale: item.reason, priority: index + 1 }));
}
