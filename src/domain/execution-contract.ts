import { z } from "zod";

import type { IntentContract } from "@/src/domain/intent-contract";

export const ExecutionContractSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    objective: z.string().min(1),
    userExpectation: z.string().min(1),
    relevantContext: z.array(z.string().min(1)),
    requirements: z.array(z.string().min(1)),
    preserve: z.array(z.string().min(1)),
    doNot: z.array(z.string().min(1)),
    authorizedAssumptions: z.array(z.string().min(1)),
    highImpactAmbiguities: z.array(z.string().min(1)),
    acceptanceTests: z.array(z.string().min(1)),
    definitionOfDone: z.array(z.string().min(1)),
  })
  .strict();

export type ExecutionContract = z.infer<typeof ExecutionContractSchema>;

export function generateExecutionContract(contract: IntentContract): ExecutionContract {
  const highImpactAmbiguities = contract.ambiguities
    .filter((item) => item.impact === "HIGH")
    .map((item) => `${item.topic}: ${item.resolution}`);

  return ExecutionContractSchema.parse({
    schemaVersion: "1.0.0",
    objective: contract.interpretedIntent,
    userExpectation: contract.interpretedMeaning,
    relevantContext: [
      `Dominio: ${contract.domain}`,
      ...(contract.context ? [`Contexto: ${contract.context}`] : []),
      ...contract.explicitFacts,
    ],
    requirements: [
      ...contract.implicitExpectations,
      `Siguiente acción: ${contract.nextAction}`,
      `Modo de interacción: ${contract.recommendedInteractionMode}`,
    ],
    preserve: contract.preservationConstraints,
    doNot: contract.prohibitedActions,
    authorizedAssumptions: contract.safeAssumptions.map(
      (item) => `${item.assumption} (${item.reversible ? "reversible" : "no reversible"})`,
    ),
    highImpactAmbiguities,
    acceptanceTests: [
      `El resultado cumple la intención: ${contract.interpretedIntent}`,
      ...contract.preservationConstraints.map((item) => `Se preserva: ${item}`),
      ...contract.prohibitedActions.map((item) => `No ocurre: ${item}`),
    ],
    definitionOfDone: [
      "La acción solicitada está completa y verificable.",
      "Las restricciones de preservación se respetaron.",
      "No se ejecutó ninguna acción prohibida.",
      ...(highImpactAmbiguities.length > 0
        ? ["Las ambigüedades de alto impacto se resolvieron antes de ejecutar."]
        : []),
    ],
  });
}
