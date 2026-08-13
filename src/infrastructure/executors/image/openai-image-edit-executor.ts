import { ImageEditExecutionError } from "@/src/application/ports/outcome/image-edit-executor-port";
import type {
  ImageEditContext,
  ImageEditExecutor,
  ImageEditResult,
  ImageEditPreflightContext,
  ImageEditPreflightResult,
} from "@/src/application/ports/outcome/image-edit-executor-port";

import OpenAI from "openai";
import { createHash } from "node:crypto";
import { decodePngToPixels } from "@/src/infrastructure/evidence/png-decoder";
import { validateOpenAIImageGeometry } from "@/src/infrastructure/executors/image/openai-image-geometry";

export class OpenAIImageEditExecutor implements ImageEditExecutor {
  readonly name = "openai-image-edit";
  readonly provider = "openai";

  private readonly client: OpenAI;
  private readonly model: string;

  constructor(client?: OpenAI) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAIImageEditExecutor but was not provided.");
    }
    this.client = client ?? new OpenAI({ apiKey });
    this.model = process.env.OPENAI_IMAGE_EDIT_MODEL?.trim() || "gpt-image-2";
  }

  preflight(context: ImageEditPreflightContext): ImageEditPreflightResult {
    return validateOpenAIImageGeometry(context);
  }

  async execute(context: ImageEditContext): Promise<ImageEditResult> {
    const startedAt = Date.now();

    const preflight = this.preflight(context);
    if (preflight.status !== "SUPPORTED") {
      throw new ImageEditExecutionError(preflight.code, preflight.reason);
    }

    const sourceBuffer = context.sourceBytes
      ? Buffer.from(context.sourceBytes)
      : await this.downloadSource(context.sourceStorageKey);

    const prompt = this.buildPrompt(context);
    const sourceFileBytes = new Uint8Array(sourceBuffer.byteLength);
    sourceFileBytes.set(sourceBuffer);

    let response;
    try {
      response = await this.client.images.edit({
        model: this.model,
        image: new File([sourceFileBytes], "source.png", { type: context.sourceMimeType }),
        prompt,
        size: preflight.requestedSize,
      });
    } catch {
      throw new ImageEditExecutionError("PROVIDER_REQUEST_FAILED", "The image provider request failed.");
    }

    const latencyMs = Date.now() - startedAt;

    if (!response.data || response.data.length === 0) {
      throw new Error("OpenAI returned no image data");
    }

    const imageData = response.data[0];
    let candidateBuffer: Buffer;

    if (imageData.b64_json) {
      candidateBuffer = Buffer.from(imageData.b64_json, "base64");
    } else if (imageData.url) {
      const candidateResponse = await fetch(imageData.url);
      if (!candidateResponse.ok) {
        throw new Error(`Failed to download candidate image: ${candidateResponse.status}`);
      }
      candidateBuffer = Buffer.from(await candidateResponse.arrayBuffer());
    } else {
      throw new Error("OpenAI response contains no image data");
    }

    const candidateKey = `candidates/${context.transactionId}/${crypto.randomUUID()}.png`;
    const decodedCandidate = decodePngToPixels(candidateBuffer);
    if (decodedCandidate.width !== preflight.requestedWidth || decodedCandidate.height !== preflight.requestedHeight) {
      throw new ImageEditExecutionError("PROVIDER_OUTPUT_CONTRACT_VIOLATION", "Provider output geometry did not match the requested same-geometry execution.");
    }

    return {
      candidateBytes: new Uint8Array(candidateBuffer),
      candidateStorageKey: candidateKey,
      candidateMimeType: "image/png",
      candidateWidth: decodedCandidate.width,
      candidateHeight: decodedCandidate.height,
      candidateByteSize: candidateBuffer.length,
      candidateSha256: createHash("sha256").update(candidateBuffer).digest("hex"),
      provider: this.provider,
      model: this.model,
      latencyMs,
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens ?? null,
            outputTokens: response.usage.output_tokens ?? null,
            totalTokens: (response.usage.input_tokens ?? 0) + (response.usage.output_tokens ?? 0),
          }
        : null,
      costUsd: null,
      providerMetadata: {
        model: this.model,
        requestedWidth: preflight.requestedWidth,
        requestedHeight: preflight.requestedHeight,
        actualWidth: decodedCandidate.width,
        actualHeight: decodedCandidate.height,
        revisedPrompt: imageData.revised_prompt ?? null,
      },
    };
  }

  private async downloadSource(sourceStorageKey: string): Promise<Buffer> {
    const sourceResponse = await fetch(sourceStorageKey);
    if (!sourceResponse.ok) {
      throw new Error(`Failed to fetch source image from ${sourceStorageKey}: ${sourceResponse.status}`);
    }
    return Buffer.from(await sourceResponse.arrayBuffer());
  }

  private buildPrompt(context: ImageEditContext): string {
    return `${context.instruction}. Only modify the region at coordinates (${context.roi.x}, ${context.roi.y}) with size (${context.roi.width}, ${context.roi.height}). Preserve everything outside that region exactly as-is.`;
  }

}
