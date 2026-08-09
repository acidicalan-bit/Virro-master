import { z } from "zod";

import { IntentContractSchema } from "@/src/domain/intent-contract";

export const BLIND_EVALUATION_IMPORT_SCHEMA_VERSION = "1.0.0" as const;

export const BlindEvaluationImportCaseSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    raw_input: z.string().trim().min(1).max(8_000),
    context: z.string().trim().max(4_000).nullable().default(null),
    domain: z.string().trim().max(200).nullable().optional().default(null),
    private_evaluator_notes: z.string().trim().max(8_000).nullable().optional().default(null),
    expected_high_level_behavior: z.string().trim().max(4_000).nullable().optional().default(null),
  })
  .strict();

export const BlindEvaluationSetImportSchema = z
  .object({
    schema_version: z.literal(BLIND_EVALUATION_IMPORT_SCHEMA_VERSION),
    slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2_000).nullable().optional().default(null),
    source_label: z.string().trim().min(1).max(200),
    is_demo: z.boolean().optional().default(false),
    cases: z.array(BlindEvaluationImportCaseSchema).min(1).max(500),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = new Set<string>();
    value.cases.forEach((item, index) => {
      if (ids.has(item.id)) {
        context.addIssue({
          code: "custom",
          path: ["cases", index, "id"],
          message: "Cada id de caso debe ser único dentro del set.",
        });
      }
      ids.add(item.id);
    });
  });

export const BlindPreferenceSchema = z.enum([
  "A_CLEARLY_BETTER",
  "A_SLIGHTLY_BETTER",
  "TIE",
  "B_SLIGHTLY_BETTER",
  "B_CLEARLY_BETTER",
  "BOTH_BAD",
]);

export const BlindRatingDimensionSchema = z.enum([
  "intendedMeaning",
  "contextualUnderstanding",
  "implicitExpectations",
  "assumptionSafety",
  "clarificationQuality",
  "interactionMode",
  "preservationIntent",
  "overallUsefulness",
]);

export const BlindRatingsSchema = z
  .object({
    intendedMeaning: z.number().int().min(0).max(2),
    contextualUnderstanding: z.number().int().min(0).max(2),
    implicitExpectations: z.number().int().min(0).max(2),
    assumptionSafety: z.number().int().min(0).max(2),
    clarificationQuality: z.number().int().min(0).max(2),
    interactionMode: z.number().int().min(0).max(2),
    preservationIntent: z.number().int().min(0).max(2),
    overallUsefulness: z.number().int().min(0).max(2),
  })
  .strict();

export const BlindEvaluationErrorTagSchema = z.enum([
  "literalism",
  "context_miss",
  "slang_miss",
  "sarcasm_miss",
  "implicit_constraint_miss",
  "over_assumption",
  "under_assumption",
  "unnecessary_question",
  "missing_question",
  "wrong_interaction_mode",
  "preservation_failure",
  "overcomplication",
  "other",
]);

export const BlindJudgmentInputSchema = z
  .object({
    comparisonId: z.uuid(),
    preference: BlindPreferenceSchema,
    ratingsA: BlindRatingsSchema,
    ratingsB: BlindRatingsSchema,
    evaluatorNotes: z.string().trim().max(8_000).nullable().default(null),
    errorTags: z.array(BlindEvaluationErrorTagSchema).max(13).default([]),
    correctedIntent: z.string().trim().max(8_000).nullable().default(null),
  })
  .strict();

export const BlindResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("SUCCESS"), contract: IntentContractSchema }).strict(),
  z.object({ status: z.literal("PROVIDER_FAILURE"), message: z.string().min(1) }).strict(),
]);

export type BlindEvaluationSetImport = z.infer<typeof BlindEvaluationSetImportSchema>;
export type BlindRatings = z.infer<typeof BlindRatingsSchema>;
export type BlindPreference = z.infer<typeof BlindPreferenceSchema>;
export type BlindEvaluationErrorTag = z.infer<typeof BlindEvaluationErrorTagSchema>;
export type BlindJudgmentInput = z.infer<typeof BlindJudgmentInputSchema>;
export type BlindResponse = z.infer<typeof BlindResponseSchema>;
