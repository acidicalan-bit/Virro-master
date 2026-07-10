import type { AnalysisResult, PackType, UnderstandingEvent } from "@/lib/types/understanding";
import type { Locale } from "@/lib/i18n/locale";
import type { PackAnalyzer } from "@/services/analysis/types";
import { productDeliveryAnalyzer } from "@/services/analysis/packAnalyzers/productDeliveryAnalyzer";
import { aiUnderstandingAnalyzer } from "@/services/analysis/packAnalyzers/aiUnderstandingAnalyzer";
import { handoffAnalyzer } from "@/services/analysis/packAnalyzers/handoffAnalyzer";
import { processAnalyzer } from "@/services/analysis/packAnalyzers/processAnalyzer";
import { onboardingAnalyzer } from "@/services/analysis/packAnalyzers/onboardingAnalyzer";
import { consultingAnalyzer } from "@/services/analysis/packAnalyzers/consultingAnalyzer";
import { technicalDocumentationAnalyzer } from "@/services/analysis/packAnalyzers/technicalDocumentationAnalyzer";
import { talentStaffingAnalyzer } from "@/services/analysis/packAnalyzers/talentStaffingAnalyzer";

const analyzers: Record<PackType, PackAnalyzer> = {
  "product-delivery": productDeliveryAnalyzer,
  "ai-understanding": aiUnderstandingAnalyzer,
  "handoff-intelligence": handoffAnalyzer,
  "process-understanding": processAnalyzer,
  onboarding: onboardingAnalyzer,
  "consulting-delivery": consultingAnalyzer,
  "talent-staffing": talentStaffingAnalyzer,
  "technical-documentation": technicalDocumentationAnalyzer,
};

export interface AnalysisEngine {
  analyze(event: UnderstandingEvent, locale?: Locale): Promise<AnalysisResult>;
}

export class MockAnalysisEngine implements AnalysisEngine {
  async analyze(event: UnderstandingEvent, locale: Locale = "en"): Promise<AnalysisResult> {
    await new Promise((resolve) => setTimeout(resolve, 450));
    const packResult = analyzers[event.packType](event);

    return {
      id: `AR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      eventId: event.id,
      ...packResult,
      meaningLossRisk: packResult.scores.meaningLossRisk,
      assumptions: locale === "es" ? [
        "El input original enviado es la fuente de verdad actual.",
        `El receptor esperado representa a ${event.targetRole} en ${event.targetTeam}.`,
        "Este motor mock no evaluó evidencia adicional del workspace.",
      ] : [
        "The submitted raw input is the current source of truth.",
        `The expected receiver represents ${event.targetRole} in ${event.targetTeam}.`,
        "No additional workspace evidence was evaluated by this mock engine.",
      ],
    };
  }
}

export const analysisEngine: AnalysisEngine = new MockAnalysisEngine();

export { analyzers as packAnalyzerRegistry };
