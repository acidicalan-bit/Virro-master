import { getPackDefinition } from "@/lib/config/pack-registry";
import type { AssistantPackType, OutputRecommendation } from "@/lib/types/assistant";
import type { RecommendedOutputType } from "@/lib/types/understanding";

const defaultOutput: Record<AssistantPackType, RecommendedOutputType> = {
  "product-delivery": "acceptance-criteria", "ai-understanding": "context-pack", "handoff-intelligence": "handoff-brief", "process-understanding": "process-map", onboarding: "onboarding-card", "consulting-delivery": "consulting-delivery-brief", "talent-staffing": "role-understanding-pack", "technical-documentation": "technical-understanding-map", "critical-flow-discovery": "audit-recommendation",
};

export function generateOutputRecommendation(pack: AssistantPackType): OutputRecommendation {
  const definition = getPackDefinition(pack);
  return { type: defaultOutput[pack], title: pack === "critical-flow-discovery" ? "Critical Flow Meaning Loss Audit" : `${definition.name} Operational Pack`, purpose: "Turn the current analysis into an artifact the next receiver can validate and act on." };
}
