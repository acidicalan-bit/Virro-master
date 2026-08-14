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

export type ImageEditPreflightContext = Pick<ImageEditContext, "sourceWidth" | "sourceHeight">;

export type ImageEditPreflightResult =
  | {
      status: "SUPPORTED";
      requestedWidth: number;
      requestedHeight: number;
      requestedSize: string;
    }
  | {
      status: "UNSUPPORTED";
      code: "SOURCE_GEOMETRY_UNSUPPORTED_BY_CURRENT_PROVIDER" | "UNSUPPORTED_OUTPUT_GEOMETRY";
      reason: string;
    };

export type ImageEditExecutionErrorCode =
  | "UNSUPPORTED_OUTPUT_GEOMETRY"
  | "SOURCE_GEOMETRY_UNSUPPORTED_BY_CURRENT_PROVIDER"
  | "PROVIDER_OUTPUT_CONTRACT_VIOLATION"
  | "PROVIDER_REQUEST_FAILED";

export class ImageEditExecutionError extends Error {
  constructor(readonly code: ImageEditExecutionErrorCode, message: string, readonly retryable = false) {
    super(message);
    this.name = "ImageEditExecutionError";
  }
}

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
  preflight(context: ImageEditPreflightContext): ImageEditPreflightResult;
  execute(context: ImageEditContext): Promise<ImageEditResult>;
}
