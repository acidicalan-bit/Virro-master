import type {
  ExecutionRun,
  EvidenceReceipt,
  SemanticPatch,
  AssetVersion,
} from "@/src/domain/outcome";

export type ExecutionContext = {
  transactionId: string;
  patch: SemanticPatch;
  baseVersion: AssetVersion;
};

export type ExecutionResult = {
  run: ExecutionRun;
  evidence: EvidenceReceipt;
  newState: Record<string, unknown>;
};

export interface ExecutorPort {
  readonly name: string;
  execute(context: ExecutionContext): Promise<ExecutionResult>;
}
