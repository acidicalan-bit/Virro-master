import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPrecisionEditBlueprintDefinition } from "@/src/application/outcome/specification/precision-edit-blueprint";
import { DeterministicPrecisionEditSpecCompiler } from "@/src/application/outcome/specification/deterministic-spec-compiler";
import { publishOutcomeBlueprint, type OutcomeBlueprint } from "@/src/domain/outcome/specification/outcome-blueprint";
import type { TaskSpec } from "@/src/domain/outcome/specification/task-spec";
import { SupabaseFieldBetaRepository } from "@/src/infrastructure/persistence/outcome/supabase-field-beta-repository";
import { DurableExecutionRecoveryContextLoader } from "@/src/application/outcome/recovery/execution-recovery-context-loader";
import { createRecoveryMetadata } from "@/src/application/outcome/recovery/execution-recovery-context";

const enabled = process.env.RUN_BUILD005_DB_INTEGRATION === "true";

describe.skipIf(!enabled)("BUILD 005-B real Supabase integration", () => {
  let admin: SupabaseClient;
  let anonymous: SupabaseClient;
  let internal: SupabaseFieldBetaRepository;
  let ids: { project: string; asset: string; version: string; transaction: string; foreignTransaction: string; corruptTransaction: string; execution: string; ladderExecution: string; rawCandidate: string; deliveredCandidate: string; ladderRaw: string; ladderRawDuplicate: string; p1: string; p2: string; p3: string; outcome: string; foreignOutcome: string; corruptOutcome: string; sample: string };
  let outcomeRow: Record<string, unknown>;
  let taskSpec: TaskSpec;
  let blueprint: OutcomeBlueprint;

  beforeAll(async () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_ANON_KEY) {
      throw new Error("RUN_BUILD005_DB_INTEGRATION requires Supabase server and anonymous credentials.");
    }
    admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    anonymous = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    internal = new SupabaseFieldBetaRepository(admin, "internal-lab");
    ids = { project: crypto.randomUUID(), asset: crypto.randomUUID(), version: crypto.randomUUID(), transaction: crypto.randomUUID(), foreignTransaction: crypto.randomUUID(), corruptTransaction: crypto.randomUUID(), execution: crypto.randomUUID(), ladderExecution: crypto.randomUUID(), rawCandidate: crypto.randomUUID(), deliveredCandidate: crypto.randomUUID(), ladderRaw: crypto.randomUUID(), ladderRawDuplicate: crypto.randomUUID(), p1: crypto.randomUUID(), p2: crypto.randomUUID(), p3: crypto.randomUUID(), outcome: crypto.randomUUID(), foreignOutcome: crypto.randomUUID(), corruptOutcome: crypto.randomUUID(), sample: crypto.randomUUID() };
    blueprint = publishOutcomeBlueprint(createPrecisionEditBlueprintDefinition(), "2026-08-12T00:00:00.000Z");
    taskSpec = await new DeterministicPrecisionEditSpecCompiler(
      () => crypto.randomUUID(),
      () => "2026-08-12T00:00:00.000Z",
    ).compile({
      blueprint,
      transactionId: ids.transaction,
      source: { assetId: ids.asset, versionId: ids.version, sha256: "a".repeat(64), mimeType: "image/png", byteSize: 4 },
      customerInstruction: "cambia el color dentro del ROI",
      roi: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
      customerParameters: { topology: "LOCAL_INDEPENDENT", coupledBand: 0 },
      runtimeCapabilities: ["READ_SOURCE", "CALL_IMAGE_PROVIDER", "WRITE_CANDIDATE", "APPLY_PRESERVATION"],
      requestedCapabilities: ["APPLY_PRESERVATION"],
    });
    await insert("projects", { id: ids.project, name: `INTEGRATION_TEST_FIXTURE ${ids.project}` });
    await insert("assets", { id: ids.asset, project_id: ids.project, name: "INTEGRATION_TEST_FIXTURE asset" });
    await insert("asset_versions", { id: ids.version, asset_id: ids.asset, version_number: 1, state: { media: { storageKey: `integration/${ids.version}.png`, sha256: "a".repeat(64), width: 1, height: 1 } } });
    await update("assets", ids.asset, { current_version_id: ids.version });
    await insert("outcome_transactions", { id: ids.transaction, project_id: ids.project, asset_id: ids.asset, base_version_id: ids.version, raw_request: "INTEGRATION_TEST_FIXTURE", status: "VERIFIED" });
    await insert("outcome_transactions", { id: ids.foreignTransaction, project_id: ids.project, asset_id: ids.asset, base_version_id: ids.version, raw_request: "INTEGRATION_TEST_FIXTURE foreign", status: "VERIFIED" });
    await insert("outcome_transactions", { id: ids.corruptTransaction, project_id: ids.project, asset_id: ids.asset, base_version_id: ids.version, raw_request: "INTEGRATION_TEST_FIXTURE corrupt", status: "VERIFIED" });
    await insert("execution_runs", { id: ids.execution, transaction_id: ids.transaction, status: "SUCCESS", executor: "INTEGRATION_TEST_FIXTURE", started_at: "2026-08-12T00:00:00.000Z", completed_at: "2026-08-12T00:00:00.001Z", latency_ms: 1, cost_usd: 0, metadata: { integrationFixture: true } });
    const rawExecution = crypto.randomUUID();
    const preservedExecution = crypto.randomUUID();
    await insertExecution(rawExecution);
    await insertExecution(preservedExecution);
    await insertExecution(ids.ladderExecution);
    await insertCandidate(ids.rawCandidate, "raw", rawExecution, "RAW_PROVIDER");
    await insertCandidate(ids.deliveredCandidate, "delivered", preservedExecution, "PRESERVED");
    const common = { id: ids.outcome, tenant_id: "internal-lab", transaction_id: ids.transaction, source_version_id: ids.version, source_sha256: "a".repeat(64), instruction: "cambia el color dentro del ROI", roi: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }, topology: "LOCAL_INDEPENDENT", task_type: "COLOR_CHANGE", provider: "integration-fixture", model: "integration-fixture", raw_candidate_id: ids.rawCandidate, delivered_candidate_id: ids.deliveredCandidate, recommended_strategy: "P3_HARD", strategy_id: "P3_HARD", policy_version: "preservation-policy-v0.1", outcome_sku: "precision-edit-v0", blueprint_id: blueprint.id, blueprint_version: blueprint.version, blueprint_hash: blueprint.hash, blueprint_snapshot: blueprint, task_spec_id: taskSpec.id, task_spec_version: taskSpec.version, task_spec_hash: taskSpec.hash, task_spec_snapshot: taskSpec, spec_compiler_name: taskSpec.compiler.name, spec_compiler_version: taskSpec.compiler.version, machine_verification_status: "PASSED", same_spec_status: "PASSED", provider_latency_ms: 1, preservation_latency_ms: 1, total_latency_ms: 2, provider_cost_usd: null };
    outcomeRow = common;
    await insert("field_outcomes", common);
  }, 60_000);

  afterAll(async () => {
    // Field Beta rows are append-only by design. Fixtures remain explicitly labeled
    // INTEGRATION_TEST_FIXTURE in the disposable project; base rows are removable.
    if (!admin || !ids) return;
    for (const [table, column, value] of [["candidate_assets", "id", ids.p3], ["candidate_assets", "id", ids.p2], ["candidate_assets", "id", ids.p1], ["candidate_assets", "id", ids.ladderRawDuplicate], ["candidate_assets", "id", ids.ladderRaw], ["candidate_assets", "id", ids.deliveredCandidate], ["candidate_assets", "id", ids.rawCandidate], ["field_outcomes", "id", ids.outcome], ["field_outcomes", "id", ids.foreignOutcome], ["field_outcomes", "id", ids.corruptOutcome], ["execution_runs", "id", ids.ladderExecution], ["execution_runs", "transaction_id", ids.transaction], ["execution_runs", "transaction_id", ids.foreignTransaction], ["execution_runs", "transaction_id", ids.corruptTransaction], ["outcome_transactions", "id", ids.transaction], ["outcome_transactions", "id", ids.foreignTransaction], ["outcome_transactions", "id", ids.corruptTransaction], ["asset_versions", "id", ids.version], ["assets", "id", ids.asset], ["projects", "id", ids.project]] as const) {
      await admin.from(table).delete().eq(column, value);
    }
  });

  it("reads only the authoritative tenant and rejects foreign records", async () => {
    const found = await internal.findOutcome(ids.outcome);
    expect(found?.tenantId).toBe("internal-lab");
    expect(await internal.findOutcome(ids.foreignOutcome)).toBeNull();
    const foreignInsert = { ...outcomeRow, id: ids.foreignOutcome, tenant_id: "foreign-test-tenant", transaction_id: ids.foreignTransaction };
    const foreignResult = await admin.from("field_outcomes").insert(foreignInsert);
    expect(foreignResult.error).toBeNull();
    expect(await internal.findOutcome(ids.foreignOutcome)).toBeNull();
  }, 60_000);

  it("rejects cross-tenant writes before persistence", async () => {
    await expect(internal.createFeedback({ tenantId: "internal-lab", fieldOutcomeId: ids.foreignOutcome, humanAccepted: false, failureTags: [], humanCorrection: null, acceptanceSource: "HUMAN_EVALUATOR", recordedBy: "internal-evaluator" })).rejects.toThrow("Tenant boundary violation");
    const { count } = await admin.from("field_feedback").select("id", { count: "exact", head: true }).eq("field_outcome_id", ids.foreignOutcome);
    expect(count).toBe(0);
  }, 60_000);

  it("keeps anonymous access denied while service role can read the fixture", async () => {
    const serviceRead = await admin.from("field_outcomes").select("id").eq("id", ids.outcome);
    expect(serviceRead.error).toBeNull();
    const anonymousRead = await anonymous.from("field_outcomes").select("id").eq("id", ids.outcome);
    expect(anonymousRead.error).not.toBeNull();
    const anonymousWrite = await anonymous.from("field_feedback").insert({ field_outcome_id: ids.outcome, human_accepted: false, failure_tags: [], acceptance_source: "HUMAN_EVALUATOR", recorded_by: "anonymous" });
    expect(anonymousWrite.error).not.toBeNull();
  }, 60_000);

  it("rejects a deliberately corrupted snapshot on repository read", async () => {
    const corrupted = { ...outcomeRow, id: ids.corruptOutcome, transaction_id: ids.corruptTransaction, blueprint_snapshot: { ...blueprint, hash: "b".repeat(64) } };
    const inserted = await admin.from("field_outcomes").insert(corrupted);
    expect(inserted.error).toBeNull();
    await expect(internal.findOutcome(String(corrupted.id))).rejects.toThrow(/snapshot failed hash verification/);
  }, 60_000);

  it("enforces one RAW and permits the P1/P2/P3 preserved ladder on one execution", async () => {
    await insertCandidate(ids.ladderRaw, "ladder-raw", ids.ladderExecution, "RAW_PROVIDER");
    const duplicateRaw = await admin.from("candidate_assets").insert({
      id: ids.ladderRawDuplicate, transaction_id: ids.transaction, execution_run_id: ids.ladderExecution,
      source_version_id: ids.version, raw_candidate_id: null, preservation_run_id: null, candidate_type: "RAW_PROVIDER",
      storage_key: `integration/${ids.ladderRawDuplicate}.png`, mime_type: "image/png", width: 1, height: 1, byte_size: 4,
      sha256: "a".repeat(64), roi: { x: 0, y: 0, width: 1, height: 1 }, instruction: "INTEGRATION_TEST_FIXTURE duplicate raw",
      provider: "integration-fixture", model: "integration-fixture", cost_usd: null, committed: false,
    });
    expect(duplicateRaw.error?.code).toBe("23505");
    await insertCandidate(ids.p1, "p1", ids.ladderExecution, "PRESERVED", ids.ladderRaw);
    await insertCandidate(ids.p2, "p2", ids.ladderExecution, "PRESERVED", ids.ladderRaw);
    await insertCandidate(ids.p3, "p3", ids.ladderExecution, "PRESERVED", ids.ladderRaw);
    const ladderRows = await admin.from("candidate_assets").select("id,candidate_type").eq("execution_run_id", ids.ladderExecution);
    expect(ladderRows.error).toBeNull();
    expect(ladderRows.data?.filter((row) => row.candidate_type === "RAW_PROVIDER")).toHaveLength(1);
    expect(ladderRows.data?.filter((row) => row.candidate_type === "PRESERVED")).toHaveLength(3);
  }, 60_000);

  it("reconstructs a durable recovery context after the process boundary", async () => {
    const metadata = createRecoveryMetadata({
      schemaVersion: "field-recovery-context-v0.1", tenantId: "internal-lab", transactionId: ids.transaction,
      executionRunId: ids.execution, sourceVersionId: ids.version, instruction: "cambia el color dentro del ROI",
      roi: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }, topology: "LOCAL_INDEPENDENT", taskType: "COLOR_CHANGE",
      policyVersion: "preservation-policy-v0.1", blueprint, taskSpec, rawCandidateId: ids.rawCandidate, recoveryEligibility: "REDRIVABLE",
    });
    const updated = await admin.from("execution_runs").update({ metadata: { fieldRecoveryContext: metadata } }).eq("id", ids.execution);
    expect(updated.error).toBeNull();
    const loader = new DurableExecutionRecoveryContextLoader({
      create: async () => { throw new Error("not used"); },
      updateMetadata: async () => { throw new Error("not used"); },
      findById: async (id) => {
        const result = await admin.from("execution_runs").select("*").eq("id", id).maybeSingle();
        if (result.error || !result.data) return null;
        return { id: String(result.data.id), transactionId: String(result.data.transaction_id), status: result.data.status as "SUCCESS" | "FAILURE", executor: String(result.data.executor), startedAt: String(result.data.started_at), completedAt: String(result.data.completed_at), latencyMs: Number(result.data.latency_ms), costUsd: result.data.cost_usd === null ? null : Number(result.data.cost_usd), errorMessage: result.data.error_message ? String(result.data.error_message) : null, metadata: result.data.metadata as Record<string, unknown> };
      },
      findByTransactionId: async () => [],
    });
    const loaded = await loader.load(ids.execution, { tenantId: "internal-lab" });
    expect(loaded.status, loaded.status === "REDRIVABLE" ? "" : loaded.reason).toBe("REDRIVABLE");
    if (loaded.status === "REDRIVABLE") expect(loaded.context.taskSpec.hash).toBe(taskSpec.hash);
  }, 60_000);

  async function insert(table: string, row: Record<string, unknown>): Promise<void> { const result = await admin.from(table).insert(row); if (result.error) throw new Error(`${table}: ${result.error.message}`); }
  async function update(table: string, id: string, row: Record<string, unknown>): Promise<void> { const result = await admin.from(table).update(row).eq("id", id); if (result.error) throw new Error(`${table}: ${result.error.message}`); }
  async function insertExecution(id: string): Promise<void> { await insert("execution_runs", { id, transaction_id: ids.transaction, status: "SUCCESS", executor: "INTEGRATION_TEST_FIXTURE", started_at: "2026-08-12T00:00:00.000Z", completed_at: "2026-08-12T00:00:00.001Z", latency_ms: 1, cost_usd: 0, metadata: { integrationFixture: true } }); }
  async function insertCandidate(id: string, label: string, executionRunId: string, candidateType: "RAW_PROVIDER" | "PRESERVED", rawCandidateId: string | null = null): Promise<void> { await insert("candidate_assets", { id, transaction_id: ids.transaction, execution_run_id: executionRunId, source_version_id: ids.version, raw_candidate_id: candidateType === "RAW_PROVIDER" ? null : (rawCandidateId ?? ids.rawCandidate), preservation_run_id: null, candidate_type: candidateType, storage_key: `integration/${id}.png`, mime_type: "image/png", width: 1, height: 1, byte_size: 4, sha256: "a".repeat(64), roi: { x: 0, y: 0, width: 1, height: 1 }, instruction: `INTEGRATION_TEST_FIXTURE ${label}`, provider: "integration-fixture", model: "integration-fixture", cost_usd: null, committed: false }); }
});
