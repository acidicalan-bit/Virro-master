import { describe, expect, it } from "vitest";

import {
  BUILD002_DEPENDENCY_IDENTITIES,
  BUILD002_DEPENDENCY_SCHEMA_VERSION,
  BUILD002_EVALUATOR_SCHEMA_VERSION,
  BUILD002_REQUIREMENT_DEFINITION_SCHEMA_VERSION,
  BUILD002_SIGNAL_SCHEMA_VERSION,
  compileSignalRequirement,
  createDependencySnapshot,
  createSignal,
  evaluateDelegationReadiness,
  evaluateSignalQualification,
  verifyDependencySnapshotHash,
  verifyQualificationHash,
  verifyReadinessHash,
  verifySignalContentHash,
  verifySignalRequirementHash,
  type SignalQualification,
} from "@/src/domain/outcome/signal-readiness";
import { SupabaseBuild002PersistenceRepository } from "@/src/infrastructure/persistence/outcome/supabase-build002-persistence-repository";

type Row = Record<string, unknown>;

const TENANT = "10000000-0000-4000-8000-000000000001";
const TRANSACTION = "20000000-0000-4000-8000-000000000002";
const BLUEPRINT = "30000000-0000-4000-8000-000000000003";
const SIGNAL_ID = "40000000-0000-4000-8000-000000000004";
const QUALIFICATION_ID = "50000000-0000-4000-8000-000000000005";
const READINESS_ID = "60000000-0000-4000-8000-000000000006";
const DEPENDENCY_ID = "70000000-0000-4000-8000-000000000007";
const SOURCE_HASH = "a".repeat(64);
const BLUEPRINT_HASH = "b".repeat(64);
const POLICY_HASH = "c".repeat(64);
const EVALUATOR = { schemaVersion: BUILD002_EVALUATOR_SCHEMA_VERSION, version: "1.0.0", definitionHash: "d".repeat(64) };
const AT = "2026-08-18T12:00:00.000Z";

class FakeSupabaseClient {
  readonly tables: Record<string, Row[]> = {};
  readonly rpcCalls: Array<{ name: string; args: Row }> = [];

  from(table: string) {
    const tables = this.tables;
    const rows = () => tables[table] ?? (tables[table] = []);
    return {
      insert(payload: Row | Row[]) {
        const inserted = Array.isArray(payload) ? payload : [payload];
        const normalized = inserted.map((row) => ({ ...row }));
        rows().push(...normalized);
        return {
          select() {
            return {
              async single() { return { data: normalized[0] ?? null, error: null }; },
            };
          },
        };
      },
      select() {
        let selected = [...rows()];
        const chain = {
          select() { return chain; },
          eq(column: string, value: unknown) { selected = selected.filter((row) => String(row[column]) === String(value)); return chain; },
          order() { return chain; },
          async maybeSingle() { return { data: selected[0] ?? null, error: null }; },
          async single() { return { data: selected[0] ?? null, error: null }; },
        };
        return chain;
      },
    };
  }

  async rpc(name: string, args: Row) {
    this.rpcCalls.push({ name, args });
    if (name === "build002_insert_dependency_snapshot") {
      const payload = args.p_snapshot as Row;
      const row = {
        id: DEPENDENCY_ID,
        ...payload,
        created_at: AT,
      };
      this.tables.build002_dependency_snapshots = [...(this.tables.build002_dependency_snapshots ?? []), row];
      return { data: DEPENDENCY_ID, error: null };
    }
    if (name === "build002_insert_signal_qualification") {
      const payload = args.p_qualification as Row;
      const row = {
        id: payload.id,
        owner_tenant_id: payload.owner_tenant_id,
        outcome_transaction_id: payload.outcome_transaction_id,
        requirement_id: payload.requirement_id,
        requirement_definition_hash: payload.requirement_definition_hash,
        dependency_snapshot_hash: payload.dependency_snapshot_hash,
        signal_ids: payload.signalIds,
        signal_content_hashes: payload.signalContentHashes,
        evaluator: payload.evaluator,
        outcome: payload.outcome,
        reason_code: payload.reason_code,
        evidence_valid_until: payload.evidence_valid_until,
        qualified_at: payload.qualified_at,
        schema_version: payload.schema_version,
        qualification_content_hash: payload.qualification_content_hash,
        dependency_snapshot_id: DEPENDENCY_ID,
        created_at: AT,
      };
      this.tables.build002_signal_qualifications = [...(this.tables.build002_signal_qualifications ?? []), row];
      return { data: payload.id, error: null };
    }
    if (name === "build002_insert_delegation_readiness") {
      const payload = args.p_readiness as Row;
      const row = {
        id: payload.id,
        owner_tenant_id: payload.owner_tenant_id,
        outcome_transaction_id: payload.outcome_transaction_id,
        requirement_set_hash: payload.requirement_set_hash,
        qualification_set_hash: payload.qualification_set_hash,
        dependency_snapshot_hash: payload.dependency_snapshot_hash,
        task_spec_hash: payload.task_spec_hash,
        source_asset_version_hash: payload.source_asset_version_hash,
        blueprint_hash: payload.blueprint_hash,
        policy_hash: payload.policy_hash,
        evaluator: payload.evaluator,
        state: payload.state,
        blocking_codes: payload.blocking_codes,
        condition_codes: payload.condition_codes,
        created_at: payload.created_at,
        valid_until: payload.valid_until,
        schema_version: payload.schema_version,
        readiness_content_hash: payload.readiness_content_hash,
        dependency_snapshot_id: DEPENDENCY_ID,
      };
      this.tables.build002_delegation_readiness = [...(this.tables.build002_delegation_readiness ?? []), row];
      return { data: payload.id, error: null };
    }
    return { data: null, error: new Error(`unexpected rpc ${name}`) };
  }
}

function fixture() {
  const requirement = compileSignalRequirement({
    requirementId: "source.intent",
    subjectKind: "OUTCOME_TRANSACTION",
    semanticType: "INTENT",
    critical: true,
    acceptedProvenance: ["OBSERVED"],
    qualificationRule: { version: "1", cardinality: "SINGLE_VALUED", humanReviewRequired: false },
    dependencySelectors: [{ identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, required: true }],
    blueprintId: BLUEPRINT,
    blueprintVersion: 1,
    blueprintHash: BLUEPRINT_HASH,
    policyId: "policy.default",
    policyHash: POLICY_HASH,
    definitionSchemaVersion: BUILD002_REQUIREMENT_DEFINITION_SCHEMA_VERSION,
  }, AT);
  const signal = createSignal({
    signalId: SIGNAL_ID,
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementId: requirement.requirementId,
    payload: { nested: ["value", 3], enabled: true },
    source: { identity: "capture.fixture", version: "1", hash: SOURCE_HASH },
    provenance: "OBSERVED",
    capturedAt: AT,
    validUntil: null,
    dependency: { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: SOURCE_HASH },
    schemaVersion: BUILD002_SIGNAL_SCHEMA_VERSION,
  });
  const dependency = createDependencySnapshot({
    schemaVersion: BUILD002_DEPENDENCY_SCHEMA_VERSION,
    ownerTenantId: TENANT,
    transactionId: TRANSACTION,
    requirementDefinitionHashes: [requirement.requirementDefinitionHash],
    signalReferences: [{ requirementId: requirement.requirementId, signalId: signal.signalId, contentHash: signal.contentHash }],
    dependencyBindings: [
      { identity: BUILD002_DEPENDENCY_IDENTITIES.SOURCE_ASSET_VERSION, hash: SOURCE_HASH },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.BLUEPRINT, hash: BLUEPRINT_HASH },
      { identity: BUILD002_DEPENDENCY_IDENTITIES.POLICY, hash: POLICY_HASH },
    ],
    blueprintHash: BLUEPRINT_HASH,
    policyHash: POLICY_HASH,
    taskSpecHash: null,
    transactionSemanticHash: null,
    sourceAssetVersionHash: SOURCE_HASH,
    contextLensHash: null,
  });
  const qualification = evaluateSignalQualification({ requirement, signals: [signal], currentDependencySnapshot: dependency, evaluator: EVALUATOR, evaluationTime: AT, idFactory: () => QUALIFICATION_ID });
  const readiness = evaluateDelegationReadiness({
    subject: { kind: "OUTCOME_TRANSACTION", ownerTenantId: TENANT, transactionId: TRANSACTION },
    requirements: [requirement],
    qualifications: [qualification],
    dependencySnapshot: dependency,
    evaluator: EVALUATOR,
    evaluationTime: AT,
    idFactory: () => READINESS_ID,
  });
  return { requirement, signal, dependency, qualification, readiness };
}

describe("BUILD 002-B production repository contract", () => {
  it("requires trusted tenant scope", () => {
    expect(() => new SupabaseBuild002PersistenceRepository({} as never, " ")).toThrow("TRUST_TENANT_SCOPE_REQUIRED");
  });

  it("round-trips all five domain objects and preserves BUILD002-A hashes", async () => {
    const db = new FakeSupabaseClient();
    const repository = new SupabaseBuild002PersistenceRepository(db as never, TENANT);
    const { requirement, signal, dependency, qualification, readiness } = fixture();
    const scope = { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION };

    db.tables.build002_signal_requirements = [{
      owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: requirement.requirementId,
      semantic_type: requirement.semanticType, critical: requirement.critical, accepted_provenance: requirement.acceptedProvenance,
      qualification_rule: requirement.qualificationRule, dependency_selectors: requirement.dependencySelectors,
      blueprint_id: requirement.blueprintId, blueprint_version: requirement.blueprintVersion, blueprint_hash: requirement.blueprintHash,
      policy_id: requirement.policyId, policy_hash: requirement.policyHash, schema_version: requirement.definitionSchemaVersion,
      requirement_definition_hash: requirement.requirementDefinitionHash, created_at: requirement.createdAt,
    }];
    const requirementRead = await repository.findRequirementSnapshot(scope, requirement.requirementDefinitionHash);
    expect(requirementRead).not.toBeNull();
    expect(verifySignalRequirementHash(requirementRead!)).toBe(true);
    await repository.insertSignal(scope, requirement.requirementDefinitionHash, signal);
    const signalRead = await repository.findSignal(scope, SIGNAL_ID);
    expect(signalRead).not.toBeNull();
    expect(verifySignalContentHash(signalRead!)).toBe(true);
    await repository.insertDependencySnapshot(scope, dependency);
    const dependencyRead = await repository.findDependencySnapshot(scope, dependency.dependencySnapshotHash);
    expect(dependencyRead).not.toBeNull();
    expect(verifyDependencySnapshotHash(dependencyRead!)).toBe(true);
    await repository.insertQualification(scope, requirement.requirementDefinitionHash, DEPENDENCY_ID, qualification);
    const qualificationRead = await repository.findQualification(scope, QUALIFICATION_ID);
    expect(qualificationRead).not.toBeNull();
    expect(verifyQualificationHash(qualificationRead!)).toBe(true);
    await repository.insertReadiness(scope, DEPENDENCY_ID, readiness, [{ qualificationId: QUALIFICATION_ID, qualificationContentHash: qualification.qualificationContentHash }]);
    const readinessRead = await repository.findReadiness(scope, READINESS_ID);
    expect(readinessRead).not.toBeNull();
    expect(verifyReadinessHash(readinessRead!)).toBe(true);
    expect(db.rpcCalls.map((call) => call.name)).toEqual([
      "build002_insert_dependency_snapshot",
      "build002_insert_signal_qualification",
      "build002_insert_delegation_readiness",
    ]);
  });

  it("rejects independent requirement arguments and non-paired signal sets", async () => {
    const db = new FakeSupabaseClient();
    const repository = new SupabaseBuild002PersistenceRepository(db as never, TENANT);
    const { requirement, signal, dependency, qualification } = fixture();
    const scope = { ownerTenantId: TENANT, outcomeTransactionId: TRANSACTION };
    db.tables.build002_signal_requirements = [{ owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: requirement.requirementId, semantic_type: requirement.semanticType, critical: requirement.critical, accepted_provenance: requirement.acceptedProvenance, qualification_rule: requirement.qualificationRule, dependency_selectors: requirement.dependencySelectors, blueprint_id: requirement.blueprintId, blueprint_version: requirement.blueprintVersion, blueprint_hash: requirement.blueprintHash, policy_id: requirement.policyId, policy_hash: requirement.policyHash, schema_version: requirement.definitionSchemaVersion, requirement_definition_hash: requirement.requirementDefinitionHash, created_at: requirement.createdAt }];
    db.tables.build002_signals = [{ signal_id: signal.signalId, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_id: requirement.requirementId, requirement_definition_hash: requirement.requirementDefinitionHash, payload: signal.payload, source: signal.source, provenance: signal.provenance, captured_at: signal.capturedAt, valid_until: null, dependency_identity: signal.dependency.identity, dependency_hash: signal.dependency.hash, schema_version: signal.schemaVersion, content_hash: signal.contentHash }];
    db.tables.build002_dependency_snapshots = [{ id: DEPENDENCY_ID, owner_tenant_id: TENANT, outcome_transaction_id: TRANSACTION, requirement_definition_hashes: dependency.requirementDefinitionHashes, signal_references: dependency.signalReferences, dependency_bindings: dependency.dependencyBindings, blueprint_hash: dependency.blueprintHash, policy_hash: dependency.policyHash, task_spec_hash: null, transaction_semantic_hash: null, source_asset_version_hash: dependency.sourceAssetVersionHash, context_lens_hash: null, schema_version: dependency.schemaVersion, dependency_snapshot_hash: dependency.dependencySnapshotHash }];
    await expect(repository.insertQualification(scope, "f".repeat(64), DEPENDENCY_ID, qualification)).rejects.toThrow("BUILD002_QUALIFICATION_REQUIREMENT_BINDING_MISMATCH");
    const nonPaired = { ...qualification, signalContentHashes: ["e".repeat(64)] } as SignalQualification;
    await expect(repository.insertQualification(scope, requirement.requirementDefinitionHash, DEPENDENCY_ID, nonPaired)).rejects.toThrow("BUILD002_QUALIFICATION_HASH_INVALID");
  });
});
