import type { ROI } from "@/src/domain/outcome/media/media-asset-version";

export type ImageEditOperation = "EDIT_REGION";

export type ImageEditContext = {
  transactionId: string;
  sourceStorageKey: string;
  sourceMimeType: string;
  sourceWidth: number;
  sourceHeight: number;
  sourceBytes?: Uint8Array;
  roi: ROI;
  instruction: string;
};

export type ImageEditResult = {
  candidateBytes: Uint8Array;
  candidateStorageKey: string;
  candidateMimeType: string;
  candidateWidth: number;
  candidateHeight: number;
  candidateByteSize: number;
  candidateSha256: string;
  provider: string;
  model: string;
  latencyMs: number;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  } | null;
  costUsd: number | null;
  providerMetadata: Record<string, unknown>;
};

export interface ImageEditExecutor {
  readonly name: string;
  readonly provider: string;
  execute(context: ImageEditContext): Promise<ImageEditResult>;
}
