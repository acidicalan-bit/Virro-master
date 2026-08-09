import { z } from "zod";

export const INTENT_SCHEMA_VERSION = "1.0.0" as const;

export const InteractionModeSchema = z.enum([
  "ASSUME",
  "SHOW_OPTIONS",
  "ASK",
  "EXECUTE",
  "EXPLORE",
]);

export const CreativeFreedomSchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const SafeAssumptionSchema = z
  .object({
    assumption: z.string().min(1),
    reason: z.string().min(1),
    reversible: z.boolean(),
  })
  .strict();

export const ProvisionalDecisionSchema = z
  .object({
    decision: z.string().min(1),
    rationale: z.string().min(1),
  })
  .strict();

export const AmbiguitySchema = z
  .object({
    topic: z.string().min(1),
    impact: z.enum(["LOW", "MEDIUM", "HIGH"]),
    resolution: z.string().min(1),
  })
  .strict();

export const ClarificationRequirementSchema = z
  .object({
    question: z.string().min(1),
    reason: z.string().min(1),
    blocking: z.boolean(),
  })
  .strict();

export const IntentContractSchema = z
  .object({
    schemaVersion: z.literal(INTENT_SCHEMA_VERSION),
    rawInput: z.string().min(1),
    context: z.string().nullable(),
    domain: z.string().min(1),
    interpretedIntent: z.string().min(1),
    interpretedMeaning: z.string().min(1),
    explicitFacts: z.array(z.string().min(1)),
    implicitExpectations: z.array(z.string().min(1)),
    safeAssumptions: z.array(SafeAssumptionSchema),
    provisionalDecisions: z.array(ProvisionalDecisionSchema),
    ambiguities: z.array(AmbiguitySchema),
    clarificationRequirements: z.array(ClarificationRequirementSchema),
    prohibitedQuestions: z.array(z.string().min(1)),
    preservationConstraints: z.array(z.string().min(1)),
    prohibitedActions: z.array(z.string().min(1)),
    recommendedInteractionMode: InteractionModeSchema,
    creativeFreedom: CreativeFreedomSchema,
    confidence: z.number().min(0).max(1),
    nextAction: z.string().min(1),
  })
  .strict();

export const CompileIntentInputSchema = z
  .object({
    rawInput: z.string().trim().min(1).max(8_000),
    context: z.string().trim().max(4_000).nullable().default(null),
  })
  .strict();

export type InteractionMode = z.infer<typeof InteractionModeSchema>;
export type IntentContract = z.infer<typeof IntentContractSchema>;
export type CompileIntentInput = z.infer<typeof CompileIntentInputSchema>;

export const intentContractJsonSchema = z.toJSONSchema(IntentContractSchema, {
  target: "draft-7",
});
