import type {
  ImageEditContext,
  ImageEditExecutor,
  ImageEditResult,
  ImageEditPreflightContext,
  ImageEditPreflightResult,
} from "@/src/application/ports/outcome/image-edit-executor-port";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export class FakeImageEditExecutor implements ImageEditExecutor {
  readonly name = "fake-image-edit";
  readonly provider = "fake";

  constructor(private readonly storage: SupabaseClient) {}

  preflight(context: ImageEditPreflightContext): ImageEditPreflightResult {
    return { status: "SUPPORTED", requestedWidth: context.sourceWidth, requestedHeight: context.sourceHeight, requestedSize: `${context.sourceWidth}x${context.sourceHeight}` };
  }

  async execute(context: ImageEditContext): Promise<ImageEditResult> {
    const startedAt = Date.now();
    const sourceBuffer = context.sourceBytes
      ? Buffer.from(context.sourceBytes)
      : await this.downloadSource(context.sourceStorageKey);
    const candidateBuffer = await this.simulateEdit(sourceBuffer);

    const candidateKey = `candidates/${context.transactionId}/${crypto.randomUUID()}.png`;

    const latencyMs = Date.now() - startedAt;

    return {
      candidateBytes: new Uint8Array(candidateBuffer),
      candidateStorageKey: candidateKey,
      candidateMimeType: "image/png",
      candidateWidth: context.sourceWidth,
      candidateHeight: context.sourceHeight,
      candidateByteSize: candidateBuffer.length,
      candidateSha256: createHash("sha256").update(candidateBuffer).digest("hex"),
      provider: this.provider,
      model: "fake-image-v1",
      latencyMs,
      usage: null,
      costUsd: null,
      providerMetadata: { simulated: true, roi: context.roi },
    };
  }

  private async downloadSource(sourceStorageKey: string): Promise<Buffer> {
    const { data, error } = await this.storage.storage.from("media").download(sourceStorageKey);
    if (error || !data) {
      throw new Error("Failed to download source image: " + (error?.message || "unknown"));
    }
    return Buffer.from(await data.arrayBuffer());
  }

  private async simulateEdit(sourceBuffer: Buffer): Promise<Buffer> {
    return sourceBuffer;
  }
}
