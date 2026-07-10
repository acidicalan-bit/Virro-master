import { getPackDefinition } from "@/lib/config/pack-registry";
import type { AssistantPackType, AuditOpportunity } from "@/lib/types/assistant";

export function buildAuditOpportunity(pack: AssistantPackType, pain: string, confidence: number): AuditOpportunity {
  const definition = getPackDefinition(pack);
  return { title: "Recommended next step", detectedPain: pain, recommendedPack: pack, recommendedAudit: definition.recommendedAudit, expectedValue: "Validate 3 to 5 real events, quantify meaning-loss exposure and resolve the highest-impact context gaps before scaling.", reason: pack === "critical-flow-discovery" ? "The pain is not fully classified yet, but it shows meaning loss between operational receivers." : `The detected pain aligns with ${definition.name} and can be tested through a focused pilot.`, confidence };
}
