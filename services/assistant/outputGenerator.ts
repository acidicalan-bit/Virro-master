import { getPackDefinition } from "@/lib/config/pack-registry";
import type { AssistantPackType, OutputRecommendation } from "@/lib/types/assistant";
import type { RecommendedOutputType } from "@/lib/types/understanding";
import type { Locale } from "@/lib/i18n/locale";

const defaultOutput: Record<AssistantPackType, RecommendedOutputType> = {
  "product-delivery": "acceptance-criteria", "ai-understanding": "context-pack", "handoff-intelligence": "handoff-brief", "process-understanding": "process-map", onboarding: "onboarding-card", "consulting-delivery": "consulting-delivery-brief", "talent-staffing": "role-understanding-pack", "technical-documentation": "technical-understanding-map", "critical-flow-discovery": "audit-recommendation",
};

export function generateOutputRecommendation(pack: AssistantPackType, locale: Locale = "en"): OutputRecommendation {
  const definition = getPackDefinition(pack);
  const name = locale === "es" ? definition.spanishName : definition.name;
  return { type: defaultOutput[pack], title: pack === "critical-flow-discovery" ? (locale === "es" ? "Meaning Loss Audit del flujo crítico" : "Critical Flow Meaning Loss Audit") : `${name} · ${locale === "es" ? "Pack operativo" : "Operational Pack"}`, purpose: locale === "es" ? "Convertir el análisis actual en un artefacto que el siguiente receptor pueda validar y usar para actuar." : "Turn the current analysis into an artifact the next receiver can validate and act on." };
}
