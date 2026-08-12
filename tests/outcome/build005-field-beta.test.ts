import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { DeterministicPrecisionEditSpecCompiler } from "@/src/application/outcome/specification/deterministic-spec-compiler";
import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import { publishOutcomeBlueprint, type OutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { attachTaskSpecHash, type TaskSpec } from "@/src/domain/outcome/specification/task-spec";
import { FIELD_POLICY_DEFINITION, FIELD_POLICY_VERSION, PRECISION_EDIT_OUTCOME_SKU, RunFieldEditSchema, type FieldFeedback, type FieldOutcome } from "@/src/domain/outcome/media/field-beta";
import { calculateFieldMetrics } from "@/src/domain/outcome/media/field-beta";
import { InMemoryFieldBetaRepository } from "@/src/infrastructure/persistence/outcome/in-memory-field-beta-repository";
import { PreservationLadderEngine } from "@/src/infrastructure/preservation/preservation-ladder-engine";
import { decodePngToPixels, PNG_BETA_MAX_DECOMPRESSED_BYTES, PNG_BETA_MAX_HEIGHT, PNG_BETA_MAX_PIXELS, PNG_BETA_MAX_WIDTH } from "@/src/infrastructure/evidence/png-decoder";
import { encodePixelsToPng } from "@/src/infrastructure/evidence/png-encoder";
import { createFieldBetaService, isFieldBetaEnabled } from "@/src/server/field-beta-services";
import type { PixelGrid } from "@/src/infrastructure/evidence/image-diff-calculator";

const ids = {
  tx: "60000000-0000-4000-8000-000000000001",
  asset: "60000000-0000-4000-8000-000000000002",
  source: "60000000-0000-4000-8000-000000000003",
  raw: "60000000-0000-4000-8000-000000000004",
  delivered: "60000000-0000-4000-8000-000000000005",
};

function outcome(overrides: Partial<FieldOutcome> = {}): FieldOutcome {
  const blueprint = publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition(), "2026-08-11T20:00:00.000Z");
  const taskSpec = snapshotTaskSpec(blueprint);
  return {
    id: "60000000-0000-4000-8000-000000000006", transactionId: ids.tx, sourceVersionId: ids.source, instruction: "Cambia la chamarra", roi: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 }, topology: "LOCAL_INDEPENDENT", taskType: "COLOR_CHANGE", provider: "fixture", model: "fixture", rawCandidateId: ids.raw, deliveredCandidateId: ids.delivered, recommendedStrategy: "P3_HARD", strategyId: "P3_HARD", policyVersion: FIELD_POLICY_VERSION, overrideReason: null, providerLatencyMs: 12, preservationLatencyMs: 2, totalLatencyMs: 14, providerCostUsd: null, createdAt: "2026-08-11T20:00:00.000Z", tenantId: "internal-lab", outcomeSku: PRECISION_EDIT_OUTCOME_SKU, blueprintId: blueprint.id, blueprintVersion: blueprint.version, blueprintHash: blueprint.hash, taskSpecId: taskSpec.id, taskSpecVersion: taskSpec.version, taskSpecHash: taskSpec.hash, specCompilerName: "deterministic", specCompilerVersion: "0.1.0", sourceSha256: "b".repeat(64), machineVerificationStatus: "PASSED", sameSpecStatus: "BLOCKED", blueprintSnapshot: blueprint, taskSpecSnapshot: taskSpec, ...overrides,
  };
}

function snapshotTaskSpec(blueprint: OutcomeBlueprint): TaskSpec {
  return attachTaskSpecHash({ schemaVersion: "task-spec-v0.1", id: "60000000-0000-4000-8000-000000000007", version: 1, previousVersionHash: null, status: "READY", transactionId: ids.tx, blueprint: { id: blueprint.id, version: blueprint.version, hash: blueprint.hash }, source: { assetId: ids.asset, versionId: ids.source, sha256: "b".repeat(64), mimeType: "image/png", byteSize: 100 }, values: [
    { id: "instruction", provenance: "CUSTOMER_STATED", critical: true, visibility: ["IMAGE_EXECUTOR"], value: "Cambia la chamarra" },
    { id: "roi", provenance: "CUSTOMER_STATED", critical: true, visibility: ["IMAGE_EXECUTOR"], value: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 } },
    { id: "providerGenerationCount", provenance: "APPROVED", critical: true, visibility: ["IMAGE_EXECUTOR"], value: 1 },
  ], constraints: [], capabilityGrant: ["READ_SOURCE"], criteria: blueprint.qualityProfile.criteria, verificationPolicy: blueprint.verificationPolicy, securityProfile: { promptInjectionPolicy: "TREAT_AS_DATA", embeddedSecretPolicy: "FORBID", unknownInputPolicy: "REQUIRE_INPUT" }, compiler: { name: "deterministic", version: "0.1.0" }, inputRequirements: [], rejectionReasons: [], createdAt: "2026-08-11T20:00:00.000Z" });
}

function feedback(fieldOutcomeId: string, overrides: Partial<FieldFeedback> = {}): FieldFeedback {
  return { tenantId: "internal-lab", fieldOutcomeId, humanAccepted: true, failureTags: [], humanCorrection: null, acceptanceSource: "HUMAN_EVALUATOR", recordedBy: "internal-evaluator", id: "60000000-0000-4000-8000-000000000008", createdAt: "2026-08-11T20:01:00.000Z", ...overrides };
}

describe("BUILD 005 recovery invariants", () => {
  it("fails closed for every feature-flag value except exact true", () => {
    expect(isFieldBetaEnabled(undefined)).toBe(false);
    expect(isFieldBetaEnabled("false")).toBe(false);
    expect(isFieldBetaEnabled("TRUE")).toBe(false);
    expect(isFieldBetaEnabled("true ")).toBe(false);
    expect(isFieldBetaEnabled("true")).toBe(true);
    const previous = process.env.FIELD_BETA_INTERNAL_ENABLED;
    delete process.env.FIELD_BETA_INTERNAL_ENABLED;
    expect(() => createFieldBetaService()).toThrow(/disabled/i);
    if (previous === undefined) delete process.env.FIELD_BETA_INTERNAL_ENABLED; else process.env.FIELD_BETA_INTERNAL_ENABLED = previous;
  });

  it("re-checks the feature flag before returning a cached service", () => {
    const previous = { enabled: process.env.FIELD_BETA_INTERNAL_ENABLED, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY, provider: process.env.IMAGE_EDIT_PROVIDER };
    process.env.FIELD_BETA_INTERNAL_ENABLED = "true";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.IMAGE_EDIT_PROVIDER = "fake";
    expect(createFieldBetaService()).toBeDefined();
    process.env.FIELD_BETA_INTERNAL_ENABLED = "false";
    expect(() => createFieldBetaService()).toThrow(/disabled/i);
    if (previous.enabled === undefined) delete process.env.FIELD_BETA_INTERNAL_ENABLED; else process.env.FIELD_BETA_INTERNAL_ENABLED = previous.enabled;
    if (previous.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.key;
    if (previous.provider === undefined) delete process.env.IMAGE_EDIT_PROVIDER; else process.env.IMAGE_EDIT_PROVIDER = previous.provider;
  });

  it("does not accept client tenant authority in the domain request schemas", () => {
    const parsed = RunFieldEditSchema.safeParse({ tenantId: "attacker-tenant", projectName: "p", assetName: "a", sourceBytes: new Uint8Array([1]), sourceMimeType: "image/png", instruction: "edit", roi: { x: 0, y: 0, width: 1, height: 1 }, topology: "LOCAL_INDEPENDENT", taskType: "OTHER" });
    expect(parsed.success).toBe(false);
  });
  it("compiles the existing Blueprint into a hashable immutable Task Spec", async () => {
    const blueprint = publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition(), "2026-08-11T20:00:00.000Z");
    const spec = await new DeterministicPrecisionEditSpecCompiler(() => "60000000-0000-4000-8000-000000000009", () => "2026-08-11T20:00:00.000Z").compile({
      blueprint, transactionId: ids.tx, source: { assetId: ids.asset, versionId: ids.source, sha256: "b".repeat(64), mimeType: "image/png", byteSize: 100 }, customerInstruction: "Cambia la chamarra", roi: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 }, customerParameters: { topology: "LOCAL_INDEPENDENT", coupledBand: 0.05 }, runtimeCapabilities: ["READ_SOURCE", "CALL_IMAGE_PROVIDER", "WRITE_CANDIDATE", "APPLY_PRESERVATION"], requestedCapabilities: ["APPLY_PRESERVATION"],
    });
    expect(spec.status).toBe("READY");
    expect(spec.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(spec.blueprint.hash).toBe(blueprint.hash);
  });

  it("keeps unknown provider cost nullable and never fabricates zero", () => {
    const item = outcome();
    const metrics = calculateFieldMetrics([item], []);
    expect(item.providerCostUsd).toBeNull();
    expect(metrics.averageProviderCostUsd).toBeNull();
    expect(metrics.costCoverage).toEqual({ known: 0, total: 1 });
  });

  it("records acceptance as separate immutable human evidence", async () => {
    const repo = new InMemoryFieldBetaRepository();
    const saved = await repo.createOutcome(outcome());
    const accepted = await repo.createFeedback(feedback(saved.id));
    expect(accepted.acceptanceSource).toBe("HUMAN_EVALUATOR");
    await expect(repo.createFeedback(feedback(saved.id))).rejects.toThrow(/immutable/i);
  });

  it("rejects corrupted Blueprint or Task Spec snapshots before persistence", async () => {
    const repo = new InMemoryFieldBetaRepository();
    const item = outcome();
    await expect(repo.createOutcome({ ...item, blueprintSnapshot: { ...item.blueprintSnapshot, seller: { ...item.blueprintSnapshot.seller, displayName: "tampered" } } })).rejects.toThrow(/snapshot/i);
    await expect(repo.createOutcome({ ...item, taskSpecSnapshot: { ...item.taskSpecSnapshot, taskSpecHash: undefined } as never })).rejects.toThrow();
  });

  it("enforces tenant boundaries in the repository", async () => {
    const internal = new InMemoryFieldBetaRepository("internal-lab");
    await expect(internal.createOutcome(outcome({ tenantId: "other-tenant" }))).rejects.toThrow(/tenant/i);
    await internal.createOutcome(outcome());
    const other = new InMemoryFieldBetaRepository("other-tenant");
    expect(await other.findOutcome(ids.tx)).toBeNull();
  });

  it("derives P1-P3 from one RAW and does not call a provider", () => {
    const source = grid(8, 8, 10);
    const raw = grid(8, 8, 200);
    const engine = new PreservationLadderEngine();
    const result = engine.derive({ strategyId: "P2_MODERATE", parameters: FIELD_POLICY_DEFINITION.strategies.P2_MODERATE, source, rawCandidate: raw, roi: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 } });
    expect(result.strategyId).toBe("P2_MODERATE");
    expect(result.pixels.width).toBe(source.width);
    expect(result.metrics).toBeDefined();
  });

  it("distinguishes an exact strategy retry from a different immutable identity", async () => {
    const repo = new InMemoryFieldBetaRepository();
    const item = outcome();
    const strategy = { id: "60000000-0000-4000-8000-000000000010", transactionId: ids.tx, executionRunId: "60000000-0000-4000-8000-000000000011", rawCandidateId: ids.raw, candidateId: ids.delivered, policyVersion: FIELD_POLICY_VERSION, strategyId: "P3_HARD" as const, parameters: FIELD_POLICY_DEFINITION.strategies.P3_HARD, role: "DELIVERED" as const, machineMetrics: {} as never, preservationLatencyMs: 1, tenantId: "internal-lab", outcomeSku: PRECISION_EDIT_OUTCOME_SKU, blueprintId: item.blueprintId, blueprintVersion: item.blueprintVersion, blueprintHash: item.blueprintHash, taskSpecId: item.taskSpecId, taskSpecVersion: item.taskSpecVersion, taskSpecHash: item.taskSpecHash, specCompilerVersion: item.specCompilerVersion, createdAt: "2026-08-11T20:00:00.000Z" };
    await repo.createStrategyRun(strategy);
    expect(await repo.findStrategyRunByKey(ids.tx, "P3_HARD")).toMatchObject({ taskSpecHash: item.taskSpecHash });
    expect(await repo.findStrategyRun({ transactionId: ids.tx, strategyId: "P3_HARD", taskSpecHash: "f".repeat(64), policyVersion: FIELD_POLICY_VERSION })).toBeNull();
  });

  it("migration is server-write-only, tenant-labelled, and keeps cost nullable", () => {
    const sql = readFileSync("supabase/migrations/20260812110000_build_005_precision_edit_field_beta_spec_learning.sql", "utf8");
    expect(sql).toContain("task_spec_hash text not null");
    expect(sql).toContain("blueprint_snapshot jsonb not null");
    expect(sql).toContain("task_spec_snapshot jsonb not null");
    expect(sql).toContain("tenant_id text not null");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("provider_cost_usd numeric");
    expect(sql).not.toMatch(/provider_cost_usd[^\n]*default\s+0/i);
    expect(sql).toContain("revoke all on table");
  });

  it("guards upgrades from the pre-snapshot schema without fabricating provenance", () => {
    const sql = readFileSync("supabase/migrations/20260812120000_build_005b_security_hardening_legacy_guard.sql", "utf8");
    expect(sql.trimStart().startsWith("-- BUILD 005-B")).toBe(true);
    expect(sql).toContain("begin;");
    expect(sql).toContain("BUILD_005_LEGACY_SCHEMA_REQUIRES_REVIEW");
    expect(sql).toContain("blueprint_snapshot");
    expect(sql).toContain("task_spec_snapshot");
    expect(sql).not.toMatch(/insert\s+into[\s\S]*(blueprint|task_spec)_snapshot/i);
    expect(sql).toContain("commit;");
  });

  it("keeps the repository aligned to tenant-scoped migration tables", () => {
    const source = readFileSync("src/infrastructure/persistence/outcome/supabase-field-beta-repository.ts", "utf8");
    expect(source).toContain('from("field_regression_candidates")');
    expect(source).toContain('from("field_golden_cases")');
    expect(source).not.toContain('from("regression_candidates")');
    expect(source).not.toContain('from("golden_cases")');
    expect(source.match(/\.eq\("tenant_id", this\.tenantId\)/g)?.length).toBeGreaterThanOrEqual(12);
  });

  it("enforces the internal PNG dimensions and resource envelope before inflation", () => {
    expect(PNG_BETA_MAX_WIDTH).toBe(2048);
    expect(PNG_BETA_MAX_HEIGHT).toBe(2048);
    expect(PNG_BETA_MAX_PIXELS).toBe(4_194_304);
    expect(PNG_BETA_MAX_DECOMPRESSED_BYTES).toBe(32 * 1024 * 1024);
    const valid = encodePixelsToPng({ width: 1, height: 1, data: new Uint8ClampedArray([1, 2, 3, 255]) });
    const oversized = Buffer.from(valid);
    oversized.writeUInt32BE(2049, 16);
    oversized.writeUInt32BE(2049, 20);
    expect(() => decodePngToPixels(oversized)).toThrow(/safety envelope/i);
    expect(() => decodePngToPixels(valid.subarray(0, 20))).toThrow();
    expect(() => decodePngToPixels(valid)).not.toThrow();
  });
});

function grid(width: number, height: number, value: number): PixelGrid {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = value; data[i + 1] = value; data[i + 2] = value; data[i + 3] = 255; }
  return { width, height, data };
}
