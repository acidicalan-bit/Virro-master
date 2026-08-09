import { BenchmarkCaseSchema, type BenchmarkCase } from "@/src/domain/benchmark";
import type { CreateIntentRun, IntentRunRecord } from "@/src/application/ports/repositories";
import { IntentContractSchema } from "@/src/domain/intent-contract";

export type IntentRunRow = {
  id: string;
  raw_input: string;
  context: string | null;
  compiled_contract: unknown;
  compiler_version: string;
  model_provider: string;
  model_name: string;
  model_version: string | null;
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  created_at: string;
};

export function toIntentRunInsert(input: CreateIntentRun) {
  return {
    raw_input: input.rawInput,
    context: input.context,
    compiled_contract: input.compiledContract,
    compiler_version: input.compilerVersion,
    model_provider: input.modelProvider,
    model_name: input.modelName,
    model_version: input.modelVersion,
    latency_ms: input.latencyMs,
    input_tokens: input.usage?.inputTokens ?? null,
    output_tokens: input.usage?.outputTokens ?? null,
    total_tokens: input.usage?.totalTokens ?? null,
  };
}

export function fromIntentRunRow(row: IntentRunRow): IntentRunRecord {
  return {
    id: row.id,
    rawInput: row.raw_input,
    context: row.context,
    compiledContract: IntentContractSchema.parse(row.compiled_contract),
    compilerVersion: row.compiler_version,
    modelProvider: row.model_provider,
    modelName: row.model_name,
    modelVersion: row.model_version,
    latencyMs: row.latency_ms,
    usage:
      row.input_tokens === null && row.output_tokens === null && row.total_tokens === null
        ? null
        : { inputTokens: row.input_tokens, outputTokens: row.output_tokens, totalTokens: row.total_tokens },
    createdAt: row.created_at,
  };
}

export type BenchmarkCaseRow = {
  id: string;
  slug: string;
  input: string;
  context: string | null;
  expected_concepts: unknown;
  forbidden_interpretations: unknown;
  expected_interaction_mode: string;
  expected_assumptions: unknown;
  forbidden_questions: unknown;
  notes: string | null;
  active: boolean;
};

export function fromBenchmarkCaseRow(row: BenchmarkCaseRow): BenchmarkCase {
  return BenchmarkCaseSchema.parse({
    id: row.id,
    slug: row.slug,
    input: row.input,
    context: row.context,
    expectedConcepts: row.expected_concepts,
    forbiddenInterpretations: row.forbidden_interpretations,
    expectedInteractionMode: row.expected_interaction_mode,
    expectedAssumptions: row.expected_assumptions,
    forbiddenQuestions: row.forbidden_questions,
    notes: row.notes,
    active: row.active,
  });
}
