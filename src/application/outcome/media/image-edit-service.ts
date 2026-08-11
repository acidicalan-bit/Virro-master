import type { RepositoryBundle } from "@/src/application/ports/repositories";
import type { ImageEditExecutor } from "@/src/application/ports/outcome/image-edit-executor-port";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export type UploadImageInput = {
  projectId: string;
  assetName: string;
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
};

export type UploadImageResult = {
  asset: { id: string; projectId: string; name: string; currentVersionId: string | null };
  version: { id: string; versionNumber: number; media: { storageKey: string; sha256: string } };
};

export type ExecuteImageEditInput = {
  transactionId: string;
  sourceStorageKey: string;
  sourceMimeType: string;
  sourceWidth: number;
  sourceHeight: number;
  roi: { x: number; y: number; width: number; height: number };
  instruction: string;
};

export type ExecuteImageEditResult = {
  candidateStorageKey: string;
  candidateSha256: string;
  candidateWidth: number;
  candidateHeight: number;
  candidateByteSize: number;
  provider: string;
  model: string;
  latencyMs: number;
  costUsd: number | null;
};

export class ImageEditService {
  constructor(
    private readonly repositories: Pick<
      RepositoryBundle,
      "assets" | "assetVersions" | "outcomeTransactions" | "semanticPatches" | "evidenceReceipts" | "executionRuns" | "costRecords"
    >,
    private readonly executor: ImageEditExecutor,
    private readonly storage: SupabaseClient,
  ) {}

  async uploadSourceImage(input: UploadImageInput): Promise<UploadImageResult> {
    const sha256 = createHash("sha256").update(input.buffer).digest("hex");
    const storageKey = `sources/${input.projectId}/${crypto.randomUUID()}.png`;

    const { error: uploadError } = await this.storage.storage
      .from("media")
      .upload(storageKey, input.buffer, {
        contentType: input.mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error("Failed to upload source image: " + uploadError.message);
    }

    const asset = await this.repositories.assets.create({
      projectId: input.projectId,
      name: input.assetName,
      description: null,
    });

    const version = await this.repositories.assetVersions.create({
      assetId: asset.id,
      versionNumber: 1,
      state: { media: { storageKey, mimeType: input.mimeType, width: input.width, height: input.height, byteSize: input.buffer.length, sha256 } },
      parentVersionId: null,
    });

    await this.repositories.assets.update(asset.id, { currentVersionId: version.id });

    return {
      asset,
      version: { id: version.id, versionNumber: version.versionNumber, media: { storageKey, sha256 } },
    };
  }

  async executeImageEdit(input: ExecuteImageEditInput): Promise<ExecuteImageEditResult> {
    const result = await this.executor.execute({
      transactionId: input.transactionId,
      sourceStorageKey: input.sourceStorageKey,
      sourceMimeType: input.sourceMimeType,
      sourceWidth: input.sourceWidth,
      sourceHeight: input.sourceHeight,
      roi: input.roi,
      instruction: input.instruction,
    });

    const { error: uploadError } = await this.storage.storage
      .from("media")
      .upload(result.candidateStorageKey, Buffer.from([]), {
        contentType: result.candidateMimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error("Failed to store candidate: " + uploadError.message);
    }

    return {
      candidateStorageKey: result.candidateStorageKey,
      candidateSha256: result.candidateSha256,
      candidateWidth: result.candidateWidth,
      candidateHeight: result.candidateHeight,
      candidateByteSize: result.candidateByteSize,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      costUsd: result.costUsd,
    };
  }
}
