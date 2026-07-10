import { getPackDefinition } from "@/lib/config/pack-registry";
import type { AssistantPackType, AuditOpportunity } from "@/lib/types/assistant";
import type { Locale } from "@/lib/i18n/locale";

export function buildAuditOpportunity(pack: AssistantPackType, pain: string, confidence: number, locale: Locale = "en"): AuditOpportunity {
  const definition = getPackDefinition(pack);
  const name = locale === "es" ? definition.spanishName : definition.name;
  return { title: locale === "es" ? "Siguiente paso recomendado" : "Recommended next step", detectedPain: pain, recommendedPack: pack, recommendedAudit: definition.recommendedAudit, expectedValue: locale === "es" ? "Validar de 3 a 5 eventos reales, estimar la exposición a Meaning Loss y resolver las brechas de contexto de mayor impacto antes de escalar." : "Validate 3 to 5 real events, quantify meaning-loss exposure and resolve the highest-impact context gaps before scaling.", reason: pack === "critical-flow-discovery" ? (locale === "es" ? "El dolor aún no está completamente clasificado, pero muestra pérdida de entendimiento entre receptores operativos." : "The pain is not fully classified yet, but it shows meaning loss between operational receivers.") : (locale === "es" ? `El dolor detectado coincide con ${name} y puede validarse mediante un piloto enfocado.` : `The detected pain aligns with ${name} and can be tested through a focused pilot.`), confidence };
}
