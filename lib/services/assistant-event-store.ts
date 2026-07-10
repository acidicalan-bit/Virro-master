import type { AssistantResult } from "@/lib/types/assistant";
import type { UnderstandingEvent } from "@/lib/types/understanding";

const STORAGE_KEY = "virro-assistant-events-v1";
const STORE_EVENT = "virro:assistant-events-updated";

export interface StoredAssistantEvidence {
  event: UnderstandingEvent;
  classification: AssistantResult["classification"];
  trace: AssistantResult["trace"];
  auditOpportunity: AssistantResult["auditOpportunity"];
  meaningLossRisks: AssistantResult["meaningLossRisks"];
}

export function listStoredAssistantEvidence(): StoredAssistantEvidence[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as StoredAssistantEvidence[]; } catch { return []; }
}

export function saveAssistantResult(result: AssistantResult) {
  const current = listStoredAssistantEvidence();
  const evidence: StoredAssistantEvidence = {
    event: { ...result.event, rawInput: "[Raw input not retained — Private Mode]" },
    classification: result.classification,
    trace: result.trace,
    auditOpportunity: { ...result.auditOpportunity, detectedPain: "[Pain pattern minimized after analysis]" },
    meaningLossRisks: result.meaningLossRisks,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([evidence, ...current.filter((item) => item.event.id !== evidence.event.id)].slice(0, 20)));
  window.dispatchEvent(new Event(STORE_EVENT));
  return evidence;
}

export function subscribeAssistantEvents(listener: () => void) {
  window.addEventListener(STORE_EVENT, listener);
  return () => window.removeEventListener(STORE_EVENT, listener);
}
