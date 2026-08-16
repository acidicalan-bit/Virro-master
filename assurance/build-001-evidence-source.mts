import {
  createCriterionDefinitionHash,
  type AssuranceBoundaryId,
  type AssuranceClaim,
  type AssuranceControlId,
  type AssuranceManifestSource,
  type AssuranceSubjectId,
  type DevelopmentEvidenceReceipt,
  type EvidenceEnvironmentClass,
  type EvidenceLevel,
  type EvidenceResult,
} from "../src/assurance/development-evidence.mts";

const PRE_F1_SHA = "7cc0e3b9951f276dbaf4f74f73662e430b9960c9";
const F1_SHA = "bc2cc7179979b4fccd892d265bedf8d7b3ab7bf1";
const F2_SHA = "33556d8dcb4f1542cb80706f10068aa77fef1006";
const SPEC_ID = "virro-vnext-build-001-trust-foundation";

const claims: AssuranceClaim[] = [
  claim("BUILD-001-F1-BEFORE", "atomic-commit", "CANONICAL_COMMIT", "POSTGRES_ATOMIC_COMMIT", "PGLITE_POSTGRES", "LOCAL_REAL_BOUNDARY", "E3_LOCAL_REAL_BOUNDARY", "Canonical commit before F1", "Atomic PostgreSQL RPC transition", "HISTORICAL"),
  claim("BUILD-001", "atomic-commit", "CANONICAL_COMMIT", "POSTGRES_ATOMIC_COMMIT", "PGLITE_POSTGRES", "LOCAL_REAL_BOUNDARY", "E3_LOCAL_REAL_BOUNDARY", "Canonical commit", "Atomic PostgreSQL RPC transition"),
  claim("BUILD-001", "candidate-immutability", "CANDIDATE_ASSET", "POSTGRES_CANDIDATE_IMMUTABILITY", "PGLITE_POSTGRES", "LOCAL_REAL_BOUNDARY", "E3_LOCAL_REAL_BOUNDARY", "CandidateAsset", "Database immutability"),
  claim("BUILD-001", "asset-version-immutability", "ASSET_VERSION", "POSTGRES_ASSET_VERSION_IMMUTABILITY", "PGLITE_POSTGRES", "LOCAL_REAL_BOUNDARY", "E3_LOCAL_REAL_BOUNDARY", "AssetVersion", "Database immutability"),
  claim("BUILD-001", "stale-head", "CANONICAL_HEAD", "POSTGRES_STALE_HEAD_CAS", "PGLITE_POSTGRES", "LOCAL_REAL_BOUNDARY", "E3_LOCAL_REAL_BOUNDARY", "Canonical head", "Stale-head compare-and-set rejection"),
  claim("BUILD-001", "commit-idempotency", "CANONICAL_COMMIT", "POSTGRES_COMMIT_IDEMPOTENCY", "PGLITE_POSTGRES", "LOCAL_REAL_BOUNDARY", "E3_LOCAL_REAL_BOUNDARY", "Canonical commit", "Idempotent retry"),
  claim("BUILD-001-F2", "legacy-route-isolation", "LEGACY_PRECISION_EDIT_ROUTE", "NEXT_LEGACY_ROUTE_ISOLATION", "NEXT_ROUTE_HANDLER", "LOCAL_APPLICATION", "E2_APPLICATION", "/api/precision-edit", "Privileged legacy service is unreachable"),
  claim("BUILD-001-F2", "f1-sql-regression", "CANONICAL_COMMIT", "POSTGRES_F1_REGRESSION", "PGLITE_POSTGRES", "LOCAL_REAL_BOUNDARY", "E3_LOCAL_REAL_BOUNDARY", "Canonical trust after F2", "F1 PostgreSQL invariants remain intact"),
  claim("BUILD-001-F2", "deployed-cache-retirement", "DEPLOYED_LEGACY_PRECISION_EDIT_ROUTE", "DEPLOYED_CACHE_RETIREMENT", "DEPLOYED_CDN_ROUTING", "REMOTE_STAGING", "E4_REMOTE_STAGING", "Deployed /api/precision-edit", "CDN and routing cannot serve stale success"),
  claim("BUILD-001", "deployed-rls", "TENANT_DATA", "SUPABASE_RLS_TENANT_READ", "SUPABASE_REMOTE_RLS", "REMOTE_STAGING", "E4_REMOTE_STAGING", "Tenant data", "Deployed RLS prevents cross-tenant access"),
  claim("BUILD-001", "supabase-auth", "REQUEST_IDENTITY", "SUPABASE_AUTH_MEMBERSHIP", "SUPABASE_REMOTE_AUTH", "REMOTE_STAGING", "E4_REMOTE_STAGING", "Request identity", "Supabase Auth resolves real principals and memberships"),
  claim("BUILD-001", "rpc-acl", "CANONICAL_COMMIT_RPC", "SUPABASE_RPC_ACL", "SUPABASE_REMOTE_RPC", "REMOTE_STAGING", "E4_REMOTE_STAGING", "Canonical commit RPC", "Deployed function ACL and authenticated execution"),
  claim("BUILD-001", "storage-policy", "TENANT_STORAGE", "STORAGE_TENANT_ISOLATION", "SUPABASE_REMOTE_STORAGE", "REMOTE_STAGING", "E4_REMOTE_STAGING", "Tenant Storage", "Storage policy prevents cross-tenant object access"),
  claim("BUILD-001", "service-role-storage", "PRIVILEGED_STORAGE", "SERVICE_ROLE_STORAGE_ISOLATION", "SUPABASE_REMOTE_SERVICE_ROLE_STORAGE", "REMOTE_STAGING", "E4_REMOTE_STAGING", "Privileged Storage", "Service-role paths preserve tenant isolation"),
  claim("BUILD-001", "remote-concurrency", "CANONICAL_HEAD", "POSTGRES_REMOTE_CONCURRENCY", "SUPABASE_REMOTE_POSTGRES_CONCURRENCY", "REMOTE_STAGING", "E4_REMOTE_STAGING", "Canonical head", "Remote concurrent commits preserve locking semantics"),
];

const evidence: DevelopmentEvidenceReceipt[] = [
  receipt("71000000-0000-4000-8000-000000000001", "BUILD-001-F1-BEFORE", "atomic-commit", "E1_MODEL", "PASS", PRE_F1_SHA, {
    boundaryId: "TRUST_HARNESS_MODEL",
    environmentClass: "LOCAL_MODEL",
    boundary: "TrustHarness Maps and modeled commit behavior",
    command: "tests/security/build001-trust-foundation.test.ts",
    limitations: ["No PostgreSQL engine, migration, trigger or RPC was executed."],
    artifactRefs: ["docs/builds/build-001/06_IMPLEMENTATION_EVIDENCE.md"],
    timestamp: "2026-08-15T09:14:02.000Z",
  }),
  receipt("71000000-0000-4000-8000-000000000002", "BUILD-001-F1-BEFORE", "atomic-commit", "E3_LOCAL_REAL_BOUNDARY", "FAIL", PRE_F1_SHA, {
    boundaryId: "PGLITE_POSTGRES",
    environmentClass: "LOCAL_REAL_BOUNDARY",
    boundary: "PostgreSQL 18.3 via PGlite with repository migrations and actual commit RPC",
    command: "tests/integration/build001-f1-canonical-commit.integration.test.ts pre-patch reproducer",
    limitations: ["Local PostgreSQL semantics do not prove deployed Supabase ACL or RLS."],
    artifactRefs: ["docs/builds/build-001/fixes/F1/03_REPRODUCTION.md"],
    timestamp: "2026-08-15T10:00:00.000Z",
    provenanceKind: "DOCUMENTED_HISTORICAL",
  }),
  receipt("71000000-0000-4000-8000-000000000003", "BUILD-001", "atomic-commit", "E1_MODEL", "PASS", F1_SHA, {
    boundaryId: "TRUST_HARNESS_MODEL",
    environmentClass: "LOCAL_MODEL",
    boundary: "TrustHarness modeled transaction",
    command: "pnpm test:model",
    limitations: ["Model coverage supports exploration but cannot prove SQL transaction semantics."],
  }),
  receipt("71000000-0000-4000-8000-000000000004", "BUILD-001", "atomic-commit", "E3_LOCAL_REAL_BOUNDARY", "PASS", F1_SHA, sqlEvidence("legitimate commit, rollback and retry")),
  receipt("71000000-0000-4000-8000-000000000005", "BUILD-001", "candidate-immutability", "E3_LOCAL_REAL_BOUNDARY", "PASS", F1_SHA, sqlEvidence("candidate content and lineage UPDATE attempts")),
  receipt("71000000-0000-4000-8000-000000000006", "BUILD-001", "asset-version-immutability", "E3_LOCAL_REAL_BOUNDARY", "PASS", F1_SHA, sqlEvidence("AssetVersion state UPDATE attempt")),
  receipt("71000000-0000-4000-8000-000000000007", "BUILD-001", "stale-head", "E3_LOCAL_REAL_BOUNDARY", "PASS", F1_SHA, sqlEvidence("stale head RPC rejection and unchanged state")),
  receipt("71000000-0000-4000-8000-000000000008", "BUILD-001", "commit-idempotency", "E3_LOCAL_REAL_BOUNDARY", "PASS", F1_SHA, sqlEvidence("duplicate RPC retry")),
  receipt("71000000-0000-4000-8000-000000000009", "BUILD-001-F2", "legacy-route-isolation", "E2_APPLICATION", "PASS", F2_SHA, {
    boundaryId: "NEXT_ROUTE_HANDLER",
    environmentClass: "LOCAL_APPLICATION",
    boundary: "Actual exported Next.js route handler with privileged service instrumentation",
    command: "pnpm test:application",
    limitations: ["Deployed CDN and edge routing were not exercised."],
    artifactRefs: ["tests/security/build001-f2-legacy-precision-edit-isolation.test.ts", "docs/builds/build-001/fixes/F2/05_FIX_EVIDENCE.md"],
  }),
  receipt("71000000-0000-4000-8000-00000000000a", "BUILD-001-F2", "f1-sql-regression", "E3_LOCAL_REAL_BOUNDARY", "PASS", F2_SHA, sqlEvidence("F1 PostgreSQL suite executed on the F2 candidate")),
  receipt("71000000-0000-4000-8000-00000000000b", "BUILD-001-F2", "deployed-cache-retirement", "E0_STATIC", "UNKNOWN", F2_SHA, {
    boundaryId: "REPOSITORY_STATIC_INSPECTION",
    environmentClass: "STATIC_ANALYSIS",
    boundary: "Repository route configuration only",
    command: "not run in deployed staging",
    limitations: ["No deployed CDN, alias cutover or stale-cache behavior was exercised."],
  }),
  receipt("71000000-0000-4000-8000-00000000000c", "BUILD-001", "deployed-rls", "E0_STATIC", "PASS", F2_SHA, {
    boundaryId: "REPOSITORY_STATIC_INSPECTION",
    environmentClass: "STATIC_ANALYSIS",
    boundary: "Static migration and policy source inspection",
    command: "pnpm test:security",
    limitations: ["Policy text inspection does not execute deployed RLS with real tenant JWTs."],
    artifactRefs: ["tests/security/phase-b-tenant-lifecycle-rls.test.ts"],
  }),
  unknown("71000000-0000-4000-8000-00000000000d", "supabase-auth", ["No real Supabase users, JWTs or membership lifecycle were exercised."]),
  skipped("71000000-0000-4000-8000-00000000000e", "rpc-acl", "BUILD 001 staging credentials were not supplied.", ["The deployed function owner, ACL and authenticated success path remain unverified."]),
  unknown("71000000-0000-4000-8000-00000000000f", "storage-policy", ["No deployed Storage policy was exercised."]),
  unknown("71000000-0000-4000-8000-000000000010", "service-role-storage", ["No real service-role Storage operation was exercised."]),
  unknown("71000000-0000-4000-8000-000000000011", "remote-concurrency", ["PGlite proves local transaction semantics, not remote platform concurrency behavior."]),
];

export const build001EvidenceSource: AssuranceManifestSource = {
  schemaVersion: "virro-development-assurance-v2",
  generatedAt: "2026-08-15T18:15:00.000Z",
  buildId: "BUILD-001-F7",
  baselineSha: F2_SHA,
  resultSha: F2_SHA,
  claims,
  evidence,
};

function claim(
  buildId: string,
  criterionId: string,
  subjectId: AssuranceSubjectId,
  controlId: AssuranceControlId,
  requiredBoundaryId: Exclude<AssuranceBoundaryId, "NOT_EXECUTED">,
  environmentClass: Exclude<EvidenceEnvironmentClass, "NOT_EXECUTED">,
  minimumEvidenceLevel: EvidenceLevel,
  subject: string,
  control: string,
  scope: AssuranceClaim["scope"] = "CURRENT",
): AssuranceClaim {
  const definition = {
    criterionId,
    criterionVersion: 1,
    subjectId,
    controlId,
    requiredBoundaryId,
    acceptedEnvironmentClasses: [environmentClass],
    minimumEvidenceLevel,
    independenceRequirement: "AUTOMATED_OR_INDEPENDENT" as const,
  };
  return {
    scope,
    buildId,
    specId: SPEC_ID,
    ...definition,
    criterionDefinitionHash: createCriterionDefinitionHash(definition),
    subject,
    control,
  };
}

type ReceiptOptions = {
  boundaryId: AssuranceBoundaryId;
  environmentClass: EvidenceEnvironmentClass;
  boundary: string;
  command: string;
  limitations: string[];
  artifactRefs?: string[];
  timestamp?: string;
  provenanceKind?: DevelopmentEvidenceReceipt["provenance"]["kind"];
  skippedReason?: string | null;
};

function receipt(
  evidenceId: string,
  buildId: string,
  criterionId: string,
  actualEvidenceLevel: EvidenceLevel,
  result: EvidenceResult,
  resultSha: string,
  options: ReceiptOptions,
): DevelopmentEvidenceReceipt {
  const claimDefinition = claims.find((item) => item.buildId === buildId && item.criterionId === criterionId)!;
  return {
    evidenceId,
    buildId,
    specId: SPEC_ID,
    criterionId,
    criterionVersion: claimDefinition.criterionVersion,
    criterionDefinitionHash: claimDefinition.criterionDefinitionHash,
    subjectId: claimDefinition.subjectId,
    controlId: claimDefinition.controlId,
    boundaryId: options.boundaryId,
    environmentClass: options.environmentClass,
    subject: claimDefinition.subject,
    control: claimDefinition.control,
    actualEvidenceLevel,
    boundaryTested: options.boundary,
    environment: options.environmentClass === "REMOTE_STAGING" ? "isolated Supabase staging" : "local repository assurance",
    executor: options.provenanceKind === "DOCUMENTED_HISTORICAL" ? "historical BUILD verifier" : "Vitest / repository command",
    verifier: { name: "BUILD 001 assurance", role: "security evidence verifier" },
    declaredIndependence: options.provenanceKind === "DOCUMENTED_HISTORICAL" ? "INDEPENDENT_VERIFIER" : "AUTOMATED_GATE",
    participantBindings: options.provenanceKind === "DOCUMENTED_HISTORICAL"
      ? {
          executor: { actorId: "actor:historical-build-executor", contextId: `context:${evidenceId}:execution`, role: "EXECUTION" },
          verifier: { actorId: "actor:historical-independent-verifier", contextId: `context:${evidenceId}:verification`, role: "VERIFICATION" },
        }
      : {
          executor: { actorId: "actor:repository-vitest", contextId: `context:${evidenceId}:execution`, role: "EXECUTION" },
          verifier: { actorId: "actor:repository-assurance-gate", contextId: `context:${evidenceId}:gate`, role: "AUTOMATED_GATE" },
        },
    provenance: {
      kind: options.provenanceKind ?? "REPOSITORY_TEST",
      source: options.artifactRefs?.[0] ?? options.command,
      immutableRef: resultSha,
    },
    commandTestIdentifier: options.command,
    result,
    limitations: options.limitations,
    skippedReason: options.skippedReason ?? null,
    artifactRefs: options.artifactRefs ?? [],
    baselineSha: PRE_F1_SHA,
    resultSha,
    timestamp: options.timestamp ?? "2026-08-15T18:15:00.000Z",
  };
}

function sqlEvidence(boundaryDetail: string): ReceiptOptions {
  return {
    boundaryId: "PGLITE_POSTGRES",
    environmentClass: "LOCAL_REAL_BOUNDARY",
    boundary: `PostgreSQL 18.3 via PGlite 0.5.5 with all repository migrations: ${boundaryDetail}`,
    command: "pnpm test:sql",
    limitations: ["Does not prove deployed Supabase RLS, Auth, Storage or platform concurrency."],
    artifactRefs: ["tests/integration/build001-f1-canonical-commit.integration.test.ts", "docs/builds/build-001/fixes/F1/04_FIX_EVIDENCE.md"],
  };
}

function skipped(evidenceId: string, criterionId: string, reason: string, limitations: string[]) {
  return receipt(evidenceId, "BUILD-001", criterionId, "E0_STATIC", "SKIPPED_ENVIRONMENT", F2_SHA, {
    boundaryId: "NOT_EXECUTED",
    environmentClass: "NOT_EXECUTED",
    boundary: "No remote boundary executed",
    command: "pnpm test:staging",
    limitations,
    skippedReason: reason,
  });
}

function unknown(evidenceId: string, criterionId: string, limitations: string[]) {
  return receipt(evidenceId, "BUILD-001", criterionId, "E0_STATIC", "NOT_RUN", F2_SHA, {
    boundaryId: "NOT_EXECUTED",
    environmentClass: "NOT_EXECUTED",
    boundary: "No remote boundary executed",
    command: "not run",
    limitations,
  });
}
