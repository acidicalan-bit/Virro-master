import { describe, expect, it } from "vitest";
import { ControlledFieldBetaImageEditExecutor } from "@/src/infrastructure/executors/image/controlled-field-beta-image-edit-executor";
import { createPrecisionEditFinalFixture } from "@/tests/fixtures/precision-edit-final-fixture";
import { decodePngToPixels } from "@/src/infrastructure/evidence/png-decoder";
import { createFieldBetaService, resetFieldBetaServiceForTests } from "@/src/server/field-beta-services";

describe("controlled Field Beta executor", () => {
  it("returns a deterministic localized edit without network/provider SDK", async () => {
    const executor = new ControlledFieldBetaImageEditExecutor();
    const source = createPrecisionEditFinalFixture();
    const result = await executor.execute({ transactionId: "60000000-0000-4000-8000-000000000001", sourceStorageKey: "fixture", sourceMimeType: "image/png", sourceWidth: 1024, sourceHeight: 1024, sourceBytes: source, roi: { x: 0.4, y: 0.4, width: 0.2, height: 0.2 }, instruction: "Change only the marker" });
    expect(executor.invocations).toBe(1);
    expect(result.providerMetadata).toMatchObject({ controlled: true, fixture: "CONTROLLED_E2E_FIXTURE" });
    expect(result.candidateWidth).toBe(1024);
    expect(result.candidateHeight).toBe(1024);
    expect(result.costUsd).toBeNull();
    const before = decodePngToPixels(source);
    const after = decodePngToPixels(Buffer.from(result.candidateBytes));
    expect(after.data.slice(0, 4)).toEqual(before.data.slice(0, 4));
    expect(after.data.slice((512 * 1024 + 512) * 4, (512 * 1024 + 512) * 4 + 4)).not.toEqual(before.data.slice((512 * 1024 + 512) * 4, (512 * 1024 + 512) * 4 + 4));
  });

  it("fails before provider construction when the provider configuration is missing", () => {
    const previous = { enabled: process.env.FIELD_BETA_INTERNAL_ENABLED, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY, provider: process.env.IMAGE_EDIT_PROVIDER };
    process.env.FIELD_BETA_INTERNAL_ENABLED = "true";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.IMAGE_EDIT_PROVIDER = "openai";
    delete process.env.OPENAI_API_KEY;
    resetFieldBetaServiceForTests();
    expect(() => createFieldBetaService()).toThrow(/OPENAI_API_KEY/i);
    if (previous.enabled === undefined) delete process.env.FIELD_BETA_INTERNAL_ENABLED; else process.env.FIELD_BETA_INTERNAL_ENABLED = previous.enabled;
    if (previous.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.key;
    if (previous.provider === undefined) delete process.env.IMAGE_EDIT_PROVIDER; else process.env.IMAGE_EDIT_PROVIDER = previous.provider;
    resetFieldBetaServiceForTests();
  });
});
