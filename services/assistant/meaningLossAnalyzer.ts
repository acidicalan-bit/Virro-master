import type { AssistantPackType, MeaningLossRisk, MissingContextItem } from "@/lib/types/assistant";
import type { Locale } from "@/lib/i18n/locale";

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

const spanishPackGaps: Record<AssistantPackType, string[]> = {
  "product-delivery": ["Límite observable de aceptación", "Actor principal y resultado de negocio", "Comportamiento prioritario ante fallos"],
  "ai-understanding": ["Fuente de contexto autorizada", "Suposiciones prohibidas", "Responsable de revisión humana"],
  "handoff-intelligence": ["Receptor responsable", "Dependencias y bloqueos", "Definición medible de terminado"],
  "process-understanding": ["Disparador del proceso", "Autoridad de decisión", "Ruta de excepciones y escalamiento"],
  onboarding: ["Contexto inicial del rol objetivo", "Accesos y prerrequisitos", "Evidencia observable de readiness"],
  "consulting-delivery": ["Decisión del cliente que debe habilitarse", "Exclusiones de alcance", "Evidencia y responsable de aprobación"],
  "talent-staffing": ["Resultados esperados del rol más allá de palabras clave", "Límite de autonomía y seniority", "Evidencia para screening y handoff del candidato"],
  "technical-documentation": ["Límites del sistema y sus consumidores", "Justificación de decisiones no documentadas", "Responsabilidad de recuperación y rollback"],
  "critical-flow-discovery": ["Dónde comienza y termina el flujo", "Receptor que hoy no puede actuar", "Evidencia de demora, retrabajo o fallo"],
};

export function analyzeMeaningLoss(pack: AssistantPackType, receiver: string, locale: Locale = "en") {
  const gaps = locale === "es" ? spanishPackGaps : packGaps;
  const missingContext: MissingContextItem[] = gaps[pack].map((label, index) => ({ id: `MC-${index + 1}`, label, reason: locale === "es" ? "Este contexto cambia materialmente lo que el siguiente receptor puede hacer." : "This context materially changes what the next receiver can do.", blocking: index < 2 }));
  const meaningLossRisks: MeaningLossRisk[] = [
    { id: "ML-1", title: locale === "es" ? "El receptor reconstruye la intención" : "Receiver reconstructs intent", description: locale === "es" ? "El siguiente receptor podría completar el contexto faltante con supuestos distintos a la intención original." : "The next receiver may fill missing context with assumptions that differ from the source intent.", affectedReceiver: receiver, severity: "high" },
    { id: "ML-2", title: locale === "es" ? "Se confunde envío con readiness" : "Readiness is mistaken for delivery", description: locale === "es" ? "La información puede avanzar porque fue enviada, aunque el receptor todavía no pueda ejecutar de forma segura." : "Information may advance because it was sent, even though the receiver cannot execute safely.", affectedReceiver: receiver, severity: "medium" },
  ];
  return { missingContext, meaningLossRisks };
}
