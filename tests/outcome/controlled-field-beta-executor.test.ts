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
    const previous = { enabled: process.env.FIELD_BETA_INTERNAL_ENABLED, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY, provider: process.env.IMAGE_EDIT_PROVIDER, controlled: process.env.FIELD_BETA_CONTROLLED_EXECUTOR, nodeEnv: process.env.NODE_ENV };
    process.env.FIELD_BETA_INTERNAL_ENABLED = "true";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.IMAGE_EDIT_PROVIDER = "openai";
    process.env.FIELD_BETA_CONTROLLED_EXECUTOR = "false";
    delete process.env.OPENAI_API_KEY;
    resetFieldBetaServiceForTests();
    expect(() => createFieldBetaService()).toThrow(/OPENAI_API_KEY/i);
    setEnv("FIELD_BETA_INTERNAL_ENABLED", previous.enabled);
    setEnv("SUPABASE_URL", previous.url); setEnv("SUPABASE_SERVICE_ROLE_KEY", previous.key); setEnv("IMAGE_EDIT_PROVIDER", previous.provider); setEnv("FIELD_BETA_CONTROLLED_EXECUTOR", previous.controlled); setEnv("NODE_ENV", previous.nodeEnv);
    resetFieldBetaServiceForTests();
  });

  it("requires explicit controlled authorization and rejects production mode", () => {
    const previous = { enabled: process.env.FIELD_BETA_INTERNAL_ENABLED, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY, provider: process.env.IMAGE_EDIT_PROVIDER, controlled: process.env.FIELD_BETA_CONTROLLED_EXECUTOR, nodeEnv: process.env.NODE_ENV };
    process.env.FIELD_BETA_INTERNAL_ENABLED = "true"; process.env.SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"; process.env.IMAGE_EDIT_PROVIDER = "controlled"; process.env.FIELD_BETA_CONTROLLED_EXECUTOR = "false"; setEnv("NODE_ENV", "test"); resetFieldBetaServiceForTests();
    expect(() => createFieldBetaService()).toThrow(/explicit non-production authorization/i);
    process.env.FIELD_BETA_CONTROLLED_EXECUTOR = "true"; setEnv("NODE_ENV", "production"); resetFieldBetaServiceForTests();
    expect(() => createFieldBetaService()).toThrow(/explicit non-production authorization/i);
    setEnv("FIELD_BETA_INTERNAL_ENABLED", previous.enabled); setEnv("SUPABASE_URL", previous.url); setEnv("SUPABASE_SERVICE_ROLE_KEY", previous.key); setEnv("IMAGE_EDIT_PROVIDER", previous.provider); setEnv("FIELD_BETA_CONTROLLED_EXECUTOR", previous.controlled); setEnv("NODE_ENV", previous.nodeEnv);
    resetFieldBetaServiceForTests();
  });
});

function setEnv(key: string, value: string | undefined): void { const env = process.env as Record<string, string | undefined>; if (value === undefined) delete env[key]; else env[key] = value; }
