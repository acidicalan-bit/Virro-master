import type {
  ImageEditContext,
  ImageEditExecutor,
  ImageEditResult,
} from "@/src/application/ports/outcome/image-edit-executor-port";

import OpenAI from "openai";
import { createHash } from "node:crypto";

export class OpenAIImageEditExecutor implements ImageEditExecutor {
  readonly name = "openai-image-edit";
  readonly provider = "openai";

  private readonly client: OpenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAIImageEditExecutor but was not provided.");
    }
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_IMAGE_EDIT_MODEL?.trim() || "gpt-image-2";
  }

  async execute(context: ImageEditContext): Promise<ImageEditResult> {
    const startedAt = Date.now();

    const sourceResponse = await fetch(context.sourceStorageKey);
    if (!sourceResponse.ok) {
      throw new Error(`Failed to fetch source image from ${context.sourceStorageKey}: ${sourceResponse.status}`);
    }
    const sourceBuffer = Buffer.from(await sourceResponse.arrayBuffer());
    const sourceBase64 = sourceBuffer.toString("base64");

    const prompt = this.buildPrompt(context);

    const response = await this.client.images.edit({
      model: this.model,
      image: new File([sourceBuffer], "source.png", { type: context.sourceMimeType }),
      prompt,
      size: this.resolveSize(context.sourceWidth, context.sourceHeight),
    });

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

    return {
      candidateStorageKey: candidateKey,
      candidateMimeType: "image/png",
      candidateWidth: context.sourceWidth,
      candidateHeight: context.sourceHeight,
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
        revisedPrompt: imageData.revised_prompt ?? null,
      },
    };
  }

  private buildPrompt(context: ImageEditContext): string {
    return `${context.instruction}. Only modify the region at coordinates (${context.roi.x}, ${context.roi.y}) with size (${context.roi.width}, ${context.roi.height}). Preserve everything outside that region exactly as-is.`;
  }

  private resolveSize(width: number, height: number): "256x256" | "512x512" | "1024x1024" | "1536x1536" | "1792x1024" | "1024x1792" {
    const maxDim = Math.max(width, height);
    if (maxDim <= 256) return "256x256";
    if (maxDim <= 512) return "512x512";
    if (maxDim <= 1024) return "1024x1024";
    if (maxDim <= 1536) return "1536x1536";
    return width > height ? "1792x1024" : "1024x1792";
  }
}
