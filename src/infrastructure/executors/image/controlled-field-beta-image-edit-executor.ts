import { createHash } from "node:crypto";
import type { ImageEditContext, ImageEditExecutor, ImageEditPreflightContext, ImageEditPreflightResult, ImageEditResult } from "@/src/application/ports/outcome/image-edit-executor-port";
import { decodePngToPixels } from "@/src/infrastructure/evidence/png-decoder";
import { encodePixelsToPng } from "@/src/infrastructure/evidence/png-encoder";

/** Deterministic, network-free executor for the internal readiness harness. */
export class ControlledFieldBetaImageEditExecutor implements ImageEditExecutor {
  readonly name = "controlled-field-beta-fixture";
  readonly provider = "controlled-fixture";
  private invocationCount = 0;
  get invocations(): number { return this.invocationCount; }
  preflight(context: ImageEditPreflightContext): ImageEditPreflightResult { return { status: "SUPPORTED", requestedWidth: context.sourceWidth, requestedHeight: context.sourceHeight, requestedSize: `${context.sourceWidth}x${context.sourceHeight}` }; }
  async execute(context: ImageEditContext): Promise<ImageEditResult> {
    this.invocationCount += 1;
    if (!context.sourceBytes) throw new Error("Controlled fixture requires source bytes.");
    const source = decodePngToPixels(Buffer.from(context.sourceBytes));
    const data = new Uint8ClampedArray(source.data);
    const left = Math.floor(context.roi.x * source.width), top = Math.floor(context.roi.y * source.height);
    const right = Math.min(source.width, Math.ceil((context.roi.x + context.roi.width) * source.width)), bottom = Math.min(source.height, Math.ceil((context.roi.y + context.roi.height) * source.height));
    for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) { const offset = (y * source.width + x) * 4; data[offset] = 32; data[offset + 1] = 116; data[offset + 2] = 224; data[offset + 3] = 255; }
    const candidateBytes = new Uint8Array(encodePixelsToPng({ width: source.width, height: source.height, data }));
    return { candidateBytes, candidateStorageKey: `candidates/${context.transactionId}/controlled-raw.png`, candidateMimeType: "image/png", candidateWidth: source.width, candidateHeight: source.height, candidateByteSize: candidateBytes.byteLength, candidateSha256: createHash("sha256").update(candidateBytes).digest("hex"), provider: this.provider, model: "controlled-field-beta-v0.1", latencyMs: 0, usage: null, costUsd: null, providerMetadata: { controlled: true, fixture: "CONTROLLED_E2E_FIXTURE", requestedGeometry: `${source.width}x${source.height}`, actualGeometry: `${source.width}x${source.height}`, invocation: this.invocationCount } };
  }
}
