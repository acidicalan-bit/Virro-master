import type { Locale } from "./locale";

const spanishOperationalCopy: Record<string, string> = {
  "Outreach without valid consent": "Contacto sin consentimiento válido",
  "Different channel-sequencing interpretations": "Interpretaciones distintas de la secuencia de canales",
  "Incompatible consumers": "Consumidores incompatibles",
  "Rollback decision delayed by unclear ownership": "Decisión de rollback retrasada por ownership poco claro",
  "Session renewal scope may expand delivery": "El alcance de renovación de sesión podría ampliar la entrega",
  "Rollback owner": "Responsable de rollback",
  "Consumer inventory": "Inventario de consumidores",
  "SLO impact": "Impacto en SLO",
  "Consent policy": "Política de consentimiento",
  "Channel priority": "Prioridad de canales",
  "Success threshold": "Umbral de éxito",
  "Checkout recovery handoff": "Handoff de recuperación de checkout",
  "Resolve rollback owner in UE-2479.": "Resolver el responsable de rollback en UE-2479.",
  "Clarify ownership and completion boundaries for Checkout recovery handoff.": "Aclarar ownership y límites de finalización del handoff de recuperación de checkout.",
  "Run a focused Technical Documentation understanding review.": "Ejecutar una revisión focalizada de entendimiento de documentación técnica.",
  "Review these estimates with accountable teams before changing operational policy.": "Revisar estas estimaciones con los equipos responsables antes de cambiar la política operativa.",
  "Technical Documentation · 61/100 risk": "Documentación técnica · riesgo 61/100",
  "Resolve “Rollback owner” across 1 affected event.": "Resolver “Responsable de rollback” en 1 evento afectado.",
};

export function operationalText(locale: Locale, value: string) {
  return locale === "es" ? (spanishOperationalCopy[value] ?? value) : value;
}
