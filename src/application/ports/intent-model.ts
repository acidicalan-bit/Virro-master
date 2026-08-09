import type { PragmaticAnalysis } from "@/src/domain/human-pragmatics";
import type { CompileIntentInput, IntentContract } from "@/src/domain/intent-contract";

export type ModelUsage = {
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
};

export type IntentModelDescriptor = {
  provider: string;
  modelName: string;
  modelVersion: string | null;
  systemInstructionVersion: string;
};

export type ModelCompilation = {
  contract: IntentContract;
  provider: string;
  modelName: string;
  modelVersion: string | null;
  usage: ModelUsage | null;
  providerLatencyMs?: number | null;
  systemInstructionVersion?: string;
};

export interface IntentModel {
  readonly descriptor?: IntentModelDescriptor;
  compile(input: CompileIntentInput, pragmatics: PragmaticAnalysis): Promise<ModelCompilation>;
}
