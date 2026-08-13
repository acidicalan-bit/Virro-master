import { describe, expect, it, vi } from "vitest";

import { validateOpenAIImageGeometry } from "@/src/infrastructure/executors/image/openai-image-geometry";
import { OpenAIImageEditExecutor } from "@/src/infrastructure/executors/image/openai-image-edit-executor";
import OpenAI from "openai";
import { createPrecisionEditFinalFixture } from "@/tests/fixtures/precision-edit-final-fixture";

describe("gpt-image-2 geometry preflight", () => {
  it("rejects the previous 256x256 request", () => {
    expect(validateOpenAIImageGeometry({ sourceWidth: 256, sourceHeight: 256 })).toMatchObject({ status: "UNSUPPORTED", code: "SOURCE_GEOMETRY_UNSUPPORTED_BY_CURRENT_PROVIDER" });
  });

  it("accepts a valid 1024x1024 square", () => {
    expect(validateOpenAIImageGeometry({ sourceWidth: 1024, sourceHeight: 1024 })).toEqual({ status: "SUPPORTED", requestedWidth: 1024, requestedHeight: 1024, requestedSize: "1024x1024" });
  });

  it("accepts a valid geometry at the minimum pixel boundary", () => {
    expect(validateOpenAIImageGeometry({ sourceWidth: 800, sourceHeight: 832 })).toMatchObject({ status: "SUPPORTED", requestedSize: "800x832" });
  });

  it.each([
    [1023, 1024, "divisible"],
    [3200, 1024, "aspect ratio"],
    [3856, 1024, "maximum edge"],
    [2896, 2896, "maximum pixels"],
  ])("rejects %sx%s for %s", (width, height) => {
    expect(validateOpenAIImageGeometry({ sourceWidth: width, sourceHeight: height })).toMatchObject({ status: "UNSUPPORTED" });
  });

  it("does not invoke the provider for invalid geometry", async () => {
    const edit = vi.fn();
    const executor = new OpenAIImageEditExecutor({ images: { edit } } as unknown as OpenAI);
    await expect(executor.execute({ transactionId: "tx", sourceStorageKey: "source", sourceMimeType: "image/png", sourceWidth: 256, sourceHeight: 256, roi: { x: 0, y: 0, width: 1, height: 1 }, instruction: "test", sourceBytes: new Uint8Array() })).rejects.toMatchObject({ code: "SOURCE_GEOMETRY_UNSUPPORTED_BY_CURRENT_PROVIDER" });
    expect(edit).not.toHaveBeenCalled();
  });

  it("permits a valid adapter invocation and records same-geometry output", async () => {
    const edit = vi.fn().mockResolvedValue({ data: [{ b64_json: createPrecisionEditFinalFixture().toString("base64") }] });
    const executor = new OpenAIImageEditExecutor({ images: { edit } } as unknown as OpenAI);
    const result = await executor.execute({ transactionId: "tx", sourceStorageKey: "source", sourceMimeType: "image/png", sourceWidth: 1024, sourceHeight: 1024, roi: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 }, instruction: "Change only the central marker", sourceBytes: createPrecisionEditFinalFixture() });
    expect(edit).toHaveBeenCalledWith(expect.objectContaining({ size: "1024x1024" }));
    expect(result.candidateWidth).toBe(1024);
    expect(result.candidateHeight).toBe(1024);
    expect(result.providerMetadata).toMatchObject({ requestedWidth: 1024, requestedHeight: 1024, actualWidth: 1024, actualHeight: 1024 });
  });
});
