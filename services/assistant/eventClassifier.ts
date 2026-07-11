import { packRegistry } from "@/lib/config/pack-registry";
import type { Locale } from "@/lib/i18n/locale";
import type { AssistantInput, ClassificationResult } from "@/lib/types/assistant";
import type { PackType } from "@/lib/types/understanding";

export function classifyEvent(input: AssistantInput, locale: Locale = "en"): ClassificationResult {
  if (input.selectedPack) {
    const pack = packRegistry[input.selectedPack];
    return { pack: input.selectedPack, confidence: 96, reason: locale === "es" ? `El usuario seleccionó ${pack.spanishName} y el evento será validado con ese pack.` : `The user selected ${pack.name} and the event will be validated against that pack.`, signals: ["explicit-pack-selection"] };
  }

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

  if (!best || best.score === 0) return { pack: "critical-flow-discovery", confidence: 48, reason: locale === "es" ? "El dolor muestra posible pérdida de significado, pero aún no hay evidencia suficiente para asignar un pack especializado." : "The pain shows possible meaning loss, but there is not enough evidence to force a specialist pack.", signals: ["unclassified-operational-pain"] };
  const confidence = Math.min(94, 58 + best.score * 11);
  const definition = packRegistry[best.pack as PackType];
  const name = locale === "es" ? definition.spanishName : definition.name;
  return { pack: best.pack, confidence, reason: locale === "es" ? `Este evento coincide con ${name} porque el dolor contiene señales relacionadas con ${best.signals.slice(0, 3).join(", ")}.` : `This event matches ${name} because the pain contains signals related to ${best.signals.slice(0, 3).join(", ")}.`, signals: best.signals };
}
