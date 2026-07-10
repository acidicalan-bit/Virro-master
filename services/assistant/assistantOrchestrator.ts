import { createUnderstandingEvent, statusFromScores } from "@/lib/domain/understanding-event";
import type { Locale } from "@/lib/i18n/locale";
import type { AnalysisTrace, AssistantInput, AssistantResult } from "@/lib/types/assistant";
import type { InputType, PackType } from "@/lib/types/understanding";
import { EMPTY_SCORES } from "@/services/analysis/scoringEngine";
import { analysisEngine } from "@/services/analysis/analysisEngine";
import { classifyEvent } from "./eventClassifier";
import { analyzeMeaningLoss } from "./meaningLossAnalyzer";
import { buildCriticalQuestions } from "./clarificationEngine";
import { generateOutputRecommendation } from "./outputGenerator";
import { buildAuditOpportunity } from "./auditOpportunityEngine";
import { runVirroSelfCheck } from "./selfCheckEngine";

const inputTypeByPack: Record<PackType, InputType> = {
  "product-delivery": "user-story", "ai-understanding": "ai-instruction", "handoff-intelligence": "handoff", "process-understanding": "process", onboarding: "onboarding-material", "consulting-delivery": "consulting-brief", "talent-staffing": "talent-requirement", "technical-documentation": "technical-documentation",
};

export const assistantOrchestrator = {
  async analyze(input: AssistantInput, locale: Locale = "es"): Promise<AssistantResult> {
    const startedAt = new Date().toISOString();
    const classification = classifyEvent(input);
    const routedPack: PackType = classification.pack === "critical-flow-discovery" ? "process-understanding" : classification.pack;
    const receiver = input.expectedReceiver?.trim() || (locale === "es" ? "Equipo receptor por confirmar" : "Receiver team to be confirmed");
    const { missingContext, meaningLossRisks } = analyzeMeaningLoss(classification.pack, receiver);
    const criticalQuestions = buildCriticalQuestions(missingContext);
    const outputRecommendation = generateOutputRecommendation(classification.pack);
    const pendingEvent = createUnderstandingEvent({
      workspaceId: input.workspaceId,
      title: input.title.trim(),
      rawInput: input.rawInput.trim(),
      inputType: input.mode === "critical-flow-discovery" ? "critical-flow" : inputTypeByPack[routedPack],
      sourceRole: input.sourceRole?.trim() || (locale === "es" ? "Emisor por confirmar" : "Source to be confirmed"),
      targetRole: receiver,
      targetTeam: receiver,
      expectedReceiver: receiver,
      packType: routedPack,
      probableIntent: locale === "es" ? "Detectar dónde se pierde entendimiento antes de que el flujo avance." : "Detect where understanding is lost before the flow advances.",
      missingContext: missingContext.map((item) => item.label),
      risks: meaningLossRisks.map((risk) => risk.title),
      criticalQuestions: criticalQuestions.map((question) => question.question),
      recommendedOutput: outputRecommendation.type,
      scores: EMPTY_SCORES,
    });
    const analysis = await analysisEngine.analyze(pendingEvent, locale);
    const event = { ...pendingEvent, probableIntent: analysis.probableIntent, missingContext: missingContext.map((item) => item.label), risks: meaningLossRisks.map((risk) => risk.title), criticalQuestions: criticalQuestions.map((question) => question.question), recommendedOutput: outputRecommendation.type, scores: analysis.scores, status: statusFromScores(analysis.scores) };
    const selfCheck = runVirroSelfCheck();
    const now = new Date().toISOString();
    const trace: AnalysisTrace = {
      id: `TRACE-${event.id.replace(/[^a-z0-9]/gi, "")}`,
      eventId: event.id,
      version: "assistant-mvp-v1",
      assumptions: analysis.assumptions,
      humanValidationRequired: true,
      rawInputRetained: false,
      steps: [
        { loop: "intake", status: "completed", evidence: "One operational input captured for the current session.", createdAt: startedAt },
        { loop: "classification", status: "completed", evidence: `${classification.pack} · ${classification.confidence}/100 · ${classification.reason}`, createdAt: now },
        { loop: "clarification", status: "completed", evidence: `${criticalQuestions.length} critical questions generated; maximum is 3.`, createdAt: now },
        { loop: "analysis", status: "completed", evidence: `${meaningLossRisks.length} meaning-loss risks and ${missingContext.length} context gaps detected.`, createdAt: now },
        { loop: "scoring", status: "completed", evidence: `Estimated Virro Score ${analysis.scores.virroScore}/100.`, createdAt: now },
        { loop: "output", status: "completed", evidence: outputRecommendation.title, createdAt: now },
        { loop: "self-check", status: "completed", evidence: `${selfCheck.length} Virro category safeguards passed.`, createdAt: now },
        { loop: "human-confirmation", status: "awaiting-human", evidence: "Save, adjust or discard before the event enters the mock workspace store.", createdAt: now },
      ],
    };
    return { event, analysis, classification, meaningLossRisks, missingContext, criticalQuestions, outputRecommendation, auditOpportunity: buildAuditOpportunity(classification.pack, input.rawInput.trim(), classification.confidence), scores: analysis.scores, trace, selfCheck };
  },
};
