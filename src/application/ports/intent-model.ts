import type { PragmaticAnalysis } from "@/src/domain/human-pragmatics";
import type { CompileIntentInput, IntentContract } from "@/src/domain/intent-contract";

export type ModelUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type ModelCompilation = {
  contract: IntentContract;
  provider: string;
  modelName: string;
  modelVersion: string | null;
  usage: ModelUsage | null;
};

export interface IntentModel {
  compile(input: CompileIntentInput, pragmatics: PragmaticAnalysis): Promise<ModelCompilation>;
}
