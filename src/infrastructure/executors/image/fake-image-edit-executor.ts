import type {
  ImageEditContext,
  ImageEditExecutor,
  ImageEditResult,
} from "@/src/application/ports/outcome/image-edit-executor-port";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export class FakeImageEditExecutor implements ImageEditExecutor {
  readonly name = "fake-image-edit";
  readonly provider = "fake";

  constructor(private readonly storage: SupabaseClient) {}

  async execute(context: ImageEditContext): Promise<ImageEditResult> {
    const startedAt = Date.now();

    const { data: sourceData, error: downloadError } = await this.storage.storage
      .from("media")
      .download(context.sourceStorageKey);

    if (downloadError || !sourceData) {
      throw new Error("Failed to download source image: " + (downloadError?.message || "unknown"));
    }

    const sourceBuffer = Buffer.from(await sourceData.arrayBuffer());
    const candidateBuffer = await this.simulateEdit(sourceBuffer, context);

    const candidateKey = `candidates/${context.transactionId}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await this.storage.storage
      .from("media")
      .upload(candidateKey, candidateBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      throw new Error("Failed to upload candidate: " + uploadError.message);
    }

    const latencyMs = Date.now() - startedAt;

    return {
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

  private async simulateEdit(sourceBuffer: Buffer, _context: ImageEditContext): Promise<Buffer> {
    return sourceBuffer;
  }
}
