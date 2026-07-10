import { packRegistry } from "@/lib/config/pack-registry";
import type { AssistantInput, ClassificationResult } from "@/lib/types/assistant";
import type { PackType } from "@/lib/types/understanding";

export function classifyEvent(input: AssistantInput): ClassificationResult {
  if (input.selectedPack) return { pack: input.selectedPack, confidence: 96, reason: `The user selected ${packRegistry[input.selectedPack].name} and the event will be validated against that pack.`, signals: ["explicit-pack-selection"] };

  const text = `${input.title} ${input.rawInput}`.toLowerCase();
  const ranked = Object.values(packRegistry).map((pack) => {
    const signals = pack.painSignals.filter((signal) => {
      const normalized = signal.toLowerCase();
      if (normalized.length > 3 || normalized.includes(" ")) return text.includes(normalized);
      return new RegExp(`\\b${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
    });
    return { pack: pack.id, signals, score: signals.length };
  }).sort((a, b) => b.score - a.score);
  const best = ranked[0];

  if (!best || best.score === 0) return { pack: "critical-flow-discovery", confidence: 48, reason: "The pain shows possible meaning loss, but there is not enough evidence to force a specialist pack.", signals: ["unclassified-operational-pain"] };
  const confidence = Math.min(94, 58 + best.score * 11);
  const name = packRegistry[best.pack as PackType].name;
  return { pack: best.pack, confidence, reason: `This event matches ${name} because the pain contains signals related to ${best.signals.slice(0, 3).join(", ")}.`, signals: best.signals };
}
