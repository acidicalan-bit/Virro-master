import type {
  EnterpriseReport,
  PackType,
  ReportType,
  UnderstandingEvent,
  UnderstandingScores,
} from "@/lib/types/understanding";
import { buildWorkspaceStats } from "@/lib/domain/understanding-event";
import type { Locale } from "@/lib/i18n/locale";

export const reportDefinitions: Array<{ type: ReportType; label: string; pack?: PackType }> = [
  { type: "meaning-loss-audit", label: "Meaning Loss Audit Report" },
  { type: "product-delivery-understanding", label: "Product Delivery Understanding Report", pack: "product-delivery" },
  { type: "ai-understanding-audit", label: "AI Understanding Audit", pack: "ai-understanding" },
  { type: "handoff-readiness", label: "Handoff Readiness Report", pack: "handoff-intelligence" },
  { type: "process-understanding", label: "Process Understanding Report", pack: "process-understanding" },
  { type: "onboarding-understanding", label: "Onboarding Understanding Report", pack: "onboarding" },
  { type: "consulting-delivery", label: "Consulting Delivery Report", pack: "consulting-delivery" },
  { type: "technical-documentation-understanding", label: "Technical Documentation Understanding Report", pack: "technical-documentation" },
  { type: "executive-virro-score", label: "Executive Virro Score Report" },
];

const average = (events: UnderstandingEvent[], key: keyof UnderstandingScores) => events.length
  ? Math.round(events.reduce((total, event) => total + event.scores[key], 0) / events.length)
  : 0;

export const reportBuilder = {
  buildReport(workspaceId: string, events: UnderstandingEvent[], reportType: ReportType, createdAt = new Date().toISOString(), locale: Locale = "en"): EnterpriseReport {
    const definition = reportDefinitions.find((item) => item.type === reportType) ?? reportDefinitions[8];
    const scopedEvents = definition.pack ? events.filter((event) => event.packType === definition.pack) : events;
    const analyzed = scopedEvents.length ? scopedEvents : events;
    const stats = buildWorkspaceStats(analyzed);
    const risks = [...new Set(analyzed.flatMap((event) => event.risks))];
    const missingContext = [...new Set(analyzed.flatMap((event) => event.missingContext))];
    const criticalQuestions = [...new Set(analyzed.flatMap((event) => event.criticalQuestions))];

    return {
      id: `VR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      workspaceId,
      reportType,
      title: definition.label,
      summary: locale === "es"
        ? `Se analizaron ${analyzed.length} Understanding Event${analyzed.length === 1 ? "" : "s"}. El Virro Score estimado es ${stats.virroScore}/100, con un Meaning Loss Risk promedio de ${average(analyzed, "meaningLossRisk")}/100. ${missingContext.length} brechas de contexto requieren revisión operativa.`
        : `${analyzed.length} Understanding Event${analyzed.length === 1 ? " was" : "s were"} analyzed. The estimated Virro Score is ${stats.virroScore}/100, with average Meaning Loss Risk of ${average(analyzed, "meaningLossRisk")}/100. ${missingContext.length} context gaps require operational review.`,
      findings: risks.slice(0, 6),
      recommendations: locale === "es" ? [
        missingContext[0] ? `Resolver “${missingContext[0]}” antes del siguiente handoff operativo.` : "Mantener la práctica actual de validación de contexto.",
        "Asignar un responsable a cada elemento de Understanding Debt de alta exposición.",
        "Ejecutar nuevamente el Analysis Pack cuando se respondan las preguntas bloqueantes.",
      ] : [
        missingContext[0] ? `Resolve ${missingContext[0].toLowerCase()} before the next operational handoff.` : "Maintain the current context validation practice.",
        "Assign an accountable owner to each high-exposure understanding debt item.",
        "Re-run the relevant Analysis Pack after blocking questions are answered.",
      ],
      whatWasAnalyzed: analyzed.map((event) => `${event.id} · ${event.title} · ${event.packType}`),
      scores: {
        degreeOfUnderstanding: average(analyzed, "degreeOfUnderstanding"),
        meaningLossRisk: average(analyzed, "meaningLossRisk"),
        handoffReadiness: average(analyzed, "handoffReadiness"),
        automationReadiness: average(analyzed, "automationReadiness"),
        aiUnderstandingDebt: average(analyzed, "aiUnderstandingDebt"),
        technicalReadiness: average(analyzed, "technicalReadiness"),
        onboardingReadiness: average(analyzed, "onboardingReadiness"),
        virroScore: stats.virroScore,
      },
      missingContext: missingContext.slice(0, 8),
      criticalQuestions: criticalQuestions.slice(0, 8),
      understandingDebtBacklog: missingContext.map((gap, index) => `${index < 2 ? "High" : "Medium"} · ${gap}`).slice(0, 8),
      suggestedNextPilot: locale === "es"
        ? (definition.pack ? "Ejecutar un piloto enfocado de entendimiento durante 2 semanas con el equipo responsable y comparar el readiness antes y después de resolver el contexto." : "Seleccionar el área de mayor riesgo y ejecutar un piloto de entendimiento de 2 semanas sobre un flujo real entre equipos.")
        : (definition.pack ? `Run a 2-week ${definition.label.replace(" Report", "")} pilot with the accountable team and compare readiness before and after context resolution.` : "Select the highest-risk area and run a focused 2-week understanding pilot across one live cross-team workflow."),
      createdAt,
    };
  },

  buildExecutiveReport(workspaceId: string, events: UnderstandingEvent[], createdAt = new Date().toISOString(), locale: Locale = "en") {
    return this.buildReport(workspaceId, events, "executive-virro-score", createdAt, locale);
  },
};
