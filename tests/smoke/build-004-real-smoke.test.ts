// @vitest-environment node

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { PreservationVerificationService } from "@/src/application/outcome/media/preservation-verification-service";
import { createDefaultPreservationPolicy } from "@/src/domain/outcome/media/preservation";
import { encodePixelsToPng } from "@/src/infrastructure/evidence/png-encoder";
import { OpenAIImageEditExecutor } from "@/src/infrastructure/executors/image/openai-image-edit-executor";
import { createTenantSupabaseRepositories } from "@/src/infrastructure/persistence/supabase-repositories";
import { CompositingImagePreservationEngine } from "@/src/infrastructure/preservation/compositing-image-preservation-engine";
import { SupabaseMediaObjectStore } from "@/src/infrastructure/storage/supabase-media-object-store";

const enabled = process.env.RUN_REAL_BUILD_004_SMOKE === "1";

describe.skipIf(!enabled)("BUILD 004 real OpenAI + Supabase smoke", () => {
  it("persists one raw generation, derives preserved, and stops before human approval", async () => {
    const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    expect(url, "SUPABASE_URL is required").toBeTruthy();
    expect(key, "SUPABASE_SERVICE_ROLE_KEY is required").toBeTruthy();
    expect(process.env.OPENAI_API_KEY, "OPENAI_API_KEY is required").toBeTruthy();
    const client = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
    const repositories = createTenantSupabaseRepositories(process.env.BUILD004_OWNER_TENANT_ID?.trim() || "internal-lab");
    const store = new SupabaseMediaObjectStore(client, "media", process.env.BUILD004_OWNER_TENANT_ID?.trim() || "internal-lab");
    const service = new PreservationVerificationService(
      repositories,
      new OpenAIImageEditExecutor(),
      new CompositingImagePreservationEngine(),
      store,
    );
    const roi = { x: 0.35, y: 0.35, width: 0.3, height: 0.3 };
    const instruction = "Cambia únicamente el cuadrado azul del centro a rojo sólido. Conserva exactamente todo lo demás.";
    const result = await service.runExperiment({
      projectName: `BUILD 004 real smoke ${new Date().toISOString()}`,
      assetName: "Blue square source",
      sourceBytes: new Uint8Array(encodePixelsToPng(realSmokeFixture())),
      sourceMimeType: "image/png",
      instruction,
      policy: createDefaultPreservationPolicy(roi, 0.05),
    });

    expect(result.rawCandidateId).not.toBe(result.preservedCandidateId);
    expect(result.machineVerification.status).toBe("PASSED");
    expect(result.preservedEvidence.changedPixelRatioLockedOutside).toBe(0);
    const [sourceReadBack, rawReadBack, preservedReadBack] = await Promise.all([
      store.get(result.source.storageKey),
      store.get(result.raw.storageKey),
      store.get(result.preserved.storageKey),
    ]);
    expect(rawReadBack).not.toEqual(preservedReadBack);
    expect(await repositories.stateCommits.findByTransactionId(result.transactionId)).toBeNull();

    const report = {
      createdAt: new Date().toISOString(),
      instruction,
      roi,
      coupledBand: result.policy.coupledBand,
      transactionId: result.transactionId,
      executionRunId: result.executionRunId,
      preservationRunId: result.preservationRunId,
      assetId: result.assetId,
      sourceVersionId: result.sourceVersionId,
      rawCandidateId: result.rawCandidateId,
      rawHash: result.raw.sha256,
      rawStorageKey: result.raw.storageKey,
      rawUrl: result.raw.url,
      preservedCandidateId: result.preservedCandidateId,
      preservedHash: result.preserved.sha256,
      preservedStorageKey: result.preserved.storageKey,
      preservedUrl: result.preserved.url,
      sourceHash: result.source.sha256,
      sourceStorageKey: result.source.storageKey,
      sourceUrl: result.source.url,
      provider: result.provider,
      model: result.model,
      providerLatencyMs: result.providerLatencyMs,
      preservationLatencyMs: result.preservationLatencyMs,
      verificationLatencyMs: result.verificationLatencyMs,
      costUsd: result.costUsd,
      rawMetrics: result.rawEvidence,
      preservedMetrics: result.preservedEvidence,
      outsideChangeReduction: result.outsideChangeReduction,
      totalChangeReduction: result.totalChangeReduction,
      creativeAssertions: result.machineVerification.assertions,
      machineVerification: result.machineVerification.status,
      humanPreference: null,
      humanAccepted: null,
      commitResult: "AWAITING_HUMAN",
    };
    writeFileSync(resolve(".build-004-smoke-report.json"), JSON.stringify(report, null, 2), "utf8");
    writeFileSync(resolve(".build-004-smoke-source.png"), sourceReadBack);
    writeFileSync(resolve(".build-004-smoke-raw.png"), rawReadBack);
    writeFileSync(resolve(".build-004-smoke-preserved.png"), preservedReadBack);
    console.log("BUILD_004_REAL_SMOKE", JSON.stringify(report));
  }, 180_000);
});

function realSmokeFixture() {
  const width = 1024;
  const height = 1024;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const inSquare = x >= 400 && x < 624 && y >= 400 && y < 624;
      const inGround = y >= 720;
      const color = inSquare ? [42, 92, 190] : inGround ? [188, 166, 128] : [239, 232, 214];
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = 255;
    }
  }
  return { width, height, data };
}
