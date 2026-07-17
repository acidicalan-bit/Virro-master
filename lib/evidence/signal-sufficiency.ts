export type SignalSufficiencyState = "ready" | "ready_with_conditions" | "needs_context" | "insufficient_signal" | "human_review_required" | "not_applicable";

export const signalSufficiencyStates: Array<{ id: SignalSufficiencyState; en: string; es: string; description: { en: string; es: string } }> = [
  { id: "ready", en: "Ready", es: "Listo", description: { en: "The available evidence supports the expected action.", es: "La evidencia disponible sostiene la acción esperada." } },
  { id: "ready_with_conditions", en: "Ready with conditions", es: "Listo con condiciones", description: { en: "Execution is possible if the visible conditions are respected.", es: "La ejecución es posible si se respetan las condiciones visibles." } },
  { id: "needs_context", en: "Needs context", es: "Necesita contexto", description: { en: "A bounded clarification can make the transfer evaluable.", es: "Una aclaración acotada puede hacer evaluable la transferencia." } },
  { id: "insufficient_signal", en: "Insufficient signal", es: "Señal insuficiente", description: { en: "The available information cannot reliably determine whether the work was ready.", es: "La información disponible no permite determinar de forma confiable si este trabajo estaba listo." } },
  { id: "human_review_required", en: "Human review required", es: "Revisión humana requerida", description: { en: "The evidence is material or ambiguous and needs accountable review.", es: "La evidencia es relevante o ambigua y necesita revisión responsable." } },
  { id: "not_applicable", en: "Not applicable", es: "No aplica", description: { en: "This check does not apply to the evaluated transfer.", es: "Esta verificación no aplica a la transferencia evaluada." } },
];

export function getSignalSufficiencyState(id: SignalSufficiencyState) {
  const state = signalSufficiencyStates.find(item => item.id === id);
  if (!state) throw new Error(`Unknown signal sufficiency state: ${id}`);
  return state;
}

