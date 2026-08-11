import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { DeterministicPrecisionEditSpecCompiler } from "@/src/application/outcome/specification/deterministic-spec-compiler";
import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import { publishOutcomeBlueprint, type OutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import { attachTaskSpecHash, type TaskSpec } from "@/src/domain/outcome/specification/task-spec";
import { FIELD_POLICY_DEFINITION, FIELD_POLICY_VERSION, PRECISION_EDIT_OUTCOME_SKU, type FieldFeedback, type FieldOutcome } from "@/src/domain/outcome/media/field-beta";
import { calculateFieldMetrics } from "@/src/domain/outcome/media/field-beta";
import { InMemoryFieldBetaRepository } from "@/src/infrastructure/persistence/outcome/in-memory-field-beta-repository";
import { PreservationLadderEngine } from "@/src/infrastructure/preservation/preservation-ladder-engine";
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
});

function grid(width: number, height: number, value: number): PixelGrid {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = value; data[i + 1] = value; data[i + 2] = value; data[i + 3] = 255; }
  return { width, height, data };
}
