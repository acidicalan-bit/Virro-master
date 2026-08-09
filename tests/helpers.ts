import type { IntentContract } from "@/src/domain/intent-contract";

export function validContract(overrides: Partial<IntentContract> = {}): IntentContract {
  return {
    schemaVersion: "1.0.0",
    rawInput: "Hazlo más limpio.",
    context: "diseño",
    domain: "diseño gráfico",
    interpretedIntent: "Simplificar el diseño.",
    interpretedMeaning: "Reducir ruido y mejorar la jerarquía.",
    explicitFacts: ["La persona pide más limpieza."],
    implicitExpectations: ["Preservar el contenido principal."],
    safeAssumptions: [{ assumption: "Reducir ruido secundario.", reason: "Es reversible.", reversible: true }],
    provisionalDecisions: [{ decision: "Usar más espacio.", rationale: "Es un primer ajuste moderado." }],
    ambiguities: [],
    clarificationRequirements: [],
    prohibitedQuestions: ["No preguntar por parámetros técnicos."],
    preservationConstraints: ["Contenido principal."],
    prohibitedActions: ["No rehacer el concepto."],
    recommendedInteractionMode: "EXECUTE",
    creativeFreedom: "LOW",
    confidence: 0.9,
    nextAction: "Aplicar una simplificación moderada.",
    ...overrides,
  };
}
