import { z } from "zod";

import { InteractionModeSchema, IntentContractSchema } from "@/src/domain/intent-contract";

export const BenchmarkCaseSchema = z
  .object({
    id: z.string().uuid().optional(),
    slug: z.string().min(1),
    input: z.string().min(1),
    context: z.string().nullable(),
    expectedConcepts: z.array(z.string().min(1)),
    forbiddenInterpretations: z.array(z.string().min(1)),
    expectedInteractionMode: InteractionModeSchema,
    expectedAssumptions: z.array(z.string().min(1)),
    forbiddenQuestions: z.array(z.string().min(1)),
    notes: z.string().nullable(),
    active: z.boolean(),
  })
  .strict();

export const BenchmarkEvaluationSchema = z
  .object({
    passed: z.boolean(),
    interactionModeMatch: z.boolean(),
    forbiddenQuestionViolations: z.array(z.string()),
    forbiddenInterpretationViolations: z.array(z.string()),
    expectedConceptsFound: z.array(z.string()),
    expectedConceptsMissing: z.array(z.string()),
    expectedAssumptionsFound: z.array(z.string()),
    assumptionViolations: z.array(z.string()),
    manualReview: z.boolean(),
  })
  .strict();

export const BenchmarkRunResultSchema = z
  .object({
    benchmarkCase: BenchmarkCaseSchema,
    contract: IntentContractSchema,
    evaluation: BenchmarkEvaluationSchema,
  })
  .strict();

export type BenchmarkCase = z.infer<typeof BenchmarkCaseSchema>;
export type BenchmarkEvaluation = z.infer<typeof BenchmarkEvaluationSchema>;
export type BenchmarkRunResult = z.infer<typeof BenchmarkRunResultSchema>;

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX");

export function evaluateBenchmark(
  benchmarkCase: BenchmarkCase,
  contract: z.infer<typeof IntentContractSchema>,
): BenchmarkEvaluation {
  const contractText = normalize(JSON.stringify(contract));
  const assertedInterpretationText = normalize(
    JSON.stringify({
      domain: contract.domain,
      interpretedIntent: contract.interpretedIntent,
      interpretedMeaning: contract.interpretedMeaning,
      explicitFacts: contract.explicitFacts,
      implicitExpectations: contract.implicitExpectations,
      safeAssumptions: contract.safeAssumptions,
      provisionalDecisions: contract.provisionalDecisions,
      ambiguities: contract.ambiguities,
      clarificationRequirements: contract.clarificationRequirements,
      preservationConstraints: contract.preservationConstraints,
      nextAction: contract.nextAction,
    }),
  );
  const questionText = normalize(
    contract.clarificationRequirements.map((item) => item.question).join(" "),
  );
  const assumptionText = normalize(
    contract.safeAssumptions.map((item) => item.assumption).join(" "),
  );
  const contains = (haystack: string, needle: string) => haystack.includes(normalize(needle));

  const expectedConceptsFound = benchmarkCase.expectedConcepts.filter((item) =>
    contains(contractText, item),
  );
  const expectedConceptsMissing = benchmarkCase.expectedConcepts.filter(
    (item) => !contains(contractText, item),
  );
  const forbiddenQuestionViolations = benchmarkCase.forbiddenQuestions.filter((item) =>
    contains(questionText, item),
  );
  const forbiddenInterpretationViolations = benchmarkCase.forbiddenInterpretations.filter((item) =>
    containsAsAssertion(assertedInterpretationText, item),
  );
  const expectedAssumptionsFound = benchmarkCase.expectedAssumptions.filter((item) =>
    contains(assumptionText, item),
  );
  const assumptionViolations = benchmarkCase.forbiddenInterpretations.filter((item) =>
    contains(assumptionText, item),
  );
  const interactionModeMatch =
    contract.recommendedInteractionMode === benchmarkCase.expectedInteractionMode;

  const passed =
    interactionModeMatch &&
    expectedConceptsMissing.length === 0 &&
    forbiddenQuestionViolations.length === 0 &&
    forbiddenInterpretationViolations.length === 0 &&
    assumptionViolations.length === 0;

  return BenchmarkEvaluationSchema.parse({
    passed,
    interactionModeMatch,
    forbiddenQuestionViolations,
    forbiddenInterpretationViolations,
    expectedConceptsFound,
    expectedConceptsMissing,
    expectedAssumptionsFound,
    assumptionViolations,
    manualReview: expectedConceptsMissing.length > 0,
  });
}

function containsAsAssertion(haystack: string, needle: string): boolean {
  const normalizedNeedle = normalize(needle);
  let offset = 0;

  while (offset < haystack.length) {
    const index = haystack.indexOf(normalizedNeedle, offset);
    if (index === -1) return false;

    const prefix = haystack.slice(Math.max(0, index - 90), index);
    const isNegated = /\b(?:no|sin|evitar|nunca|prohibid[oa]s?|rechazar)\b[^.!?;]{0,80}$/.test(prefix);
    if (!isNegated) return true;
    offset = index + normalizedNeedle.length;
  }

  return false;
}
