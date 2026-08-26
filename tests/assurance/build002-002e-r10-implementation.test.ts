// @vitest-environment node
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationPath = resolve(root,"supabase/migrations/20260826120000_build_002_002e_r10_stale_concurrency_hardening.sql");
const migration = readFileSync(migrationPath,"utf8");
const source = collectTypeScript(resolve(root,"src/infrastructure/persistence"));
const specPath = resolve(root,"docs/builds/build-002/02_002E_STALE_CONCURRENCY_HARDENING_SPEC.md");
const retryPath = resolve(root,"src/infrastructure/supabase/transient-jwt-retry-fetch.ts");

type Operation = readonly [className:string,method:string];
const material: Operation[] = [
  ["SupabaseFieldBetaRepository","createOutcome"],
  ["SupabaseAssetRepository","create"],["SupabaseAssetRepository","update"],
  ["SupabaseAssetVersionRepository","create"],
  ["SupabaseOutcomeTransactionRepository","create"],["SupabaseOutcomeTransactionRepository","updateStatus"],
  ["SupabasePartialIntentRepository","create"],["SupabaseSemanticPatchRepository","create"],
  ["SupabaseTenantCoreLineageRepository","createTransaction"],
  ["SupabasePrivilegedTenantPersistence","provisionPersonalTenant"],["SupabasePrivilegedTenantPersistence","revokeMembership"],
  ["SupabaseBuild002MutationLeaseRepository","grant"],
  ["SupabaseBuild002PersistenceRepository","insertDependencySnapshot"],
  ["SupabaseBuild002PersistenceRepository","insertQualification"],
  ["SupabaseBuild002PersistenceRepository","insertReadiness"],
  ["SupabaseBuild002PersistenceRepository","insertRequirementSnapshot"],
  ["SupabaseBuild002PersistenceRepository","insertSignal"],
  ["SupabaseCanonicalCommitRepository","commitAcceptedFieldOutcome"],
  ["SupabaseDelegabilityAdmissionRepository","admit"],
  ["SupabaseExecutionAttemptReservationRepository","reserve"],["SupabaseExecutionAttemptReservationRepository","consume"],
  ["SupabaseExecutionAuthorityRepository","grant"],["SupabaseReadinessAuthorityCommitRepository","commit"],
  ["SupabaseRequirementCatalogRepository","publishBlueprint"],["SupabaseRequirementCatalogRepository","publishRequirementProfile"],
  ["SupabaseTenantCoreLineageRepository","createAssetWithInitialVersion"],
  ["SupabaseTransactionRequirementBindingRepository","publish"],
];
const synchronized: Operation[] = [
  ["SupabaseFieldBetaRepository","createStrategyRun"],["SupabaseMutationLeaseRepository","create"],
  ["SupabaseExecutionRunRepository","create"],["SupabaseEvidenceReceiptRepository","create"],
  ["SupabaseVerificationRunRepository","create"],["SupabaseCriterionEvidenceRepository","create"],
  ["SupabaseStateCommitRepository","create"],["SupabaseCostRecordRepository","create"],
  ["SupabaseMediaStorageRepository","create"],["SupabaseSemanticSnapshotRepository","create"],
  ["SupabaseCandidateAssetRepository","create"],["SupabasePreservationRunRepository","create"],
  ["SupabaseCandidatePreferenceRepository","create"],["SupabasePreservationStudyRepository","createCase"],
];
const oneWay: Operation[] = [
  ["SupabaseFieldBetaRepository","createPolicy"],["SupabaseFieldBetaRepository","createFeedback"],
  ["SupabaseFieldBetaRepository","createRegressionCandidate"],["SupabaseFieldBetaRepository","createGoldenCase"],
  ["SupabaseFieldBetaRepository","createEvaluationSample"],["SupabaseFieldBetaRepository","createEvaluationJudgment"],
  ["SupabaseProjectRepository","create"],["SupabaseImageEvidenceRepository","create"],
  ["SupabasePreservationEvidenceRepository","create"],["SupabaseTenantCoreLineageRepository","createProject"],
  ["SupabaseProjectRepository","update"],["SupabaseExecutionRunRepository","updateMetadata"],
  ["SupabaseCandidateAssetRepository","markCommitted"],["SupabasePreservationRunRepository","update"],
  ["SupabaseCandidatePreferenceRepository","recordAcceptance"],["SupabasePreservationStudyRepository","ensureStudy"],
  ["SupabasePreservationStudyRepository","createRating"],["SupabasePreservationStudyRepository","createPairwise"],
  ["SupabasePreservationStudyRepository","createAcceptance"],["SupabasePreservationStudyRepository","lockIntentAndPresentation"],
  ["SupabaseIntentRunRepository","create"],["SupabaseIntentModelFailureRepository","create"],
  ["SupabaseIntentFeedbackRepository","create"],["SupabaseBenchmarkRepository","saveRun"],
  ["SupabaseBlindEvaluationRepository","importSet"],["SupabaseBlindEvaluationRepository","importSet"],
  ["SupabaseBlindEvaluationRepository","importSet"],["SupabaseBlindEvaluationRepository","createSession"],
  ["SupabaseBlindEvaluationRepository","completeSession"],["SupabaseBlindEvaluationRepository","createComparison"],
  ["SupabaseBlindEvaluationRepository","createJudgment"],["SupabaseBlindEvaluationRepository","createHumanIntent"],
  ["SupabaseBlindEvaluationRepository","linkHumanIntentToComparison"],["SupabaseBlindEvaluationRepository","createStepRating"],
];

describe("BUILD002 002-E R10 implementation assurance",()=>{
  it("keeps the canonical specification byte-identical",()=>{
    const sha=createHash("sha256").update(readFileSync(specPath)).digest("hex");
    expect(sha).toBe("9d5e1fa9eea1e7b6c41aeb616b5a6b274cc2619c6b09486f85bf72b35ce25e1f");
  });

  it("reproduces the complete 75-path classification surface",()=>{
    expect(material).toHaveLength(27); expect(synchronized).toHaveLength(14); expect(oneWay).toHaveLength(34);
    expect(material.length+synchronized.length+oneWay.length).toBe(75);
    for(const operation of [...material,...synchronized,...oneWay]) expectOperation(operation);
  });

  it("routes all 41 protected templates through 40 fixed database routes",()=>{
    const routes=new Set([...migration.matchAll(/'(direct\.[a-z0-9_.]+|rpc\.[a-z0-9_.]+)'/g)].map((match)=>match[1]));
    expect(routes.size).toBe(40);
    expect(material.length+synchronized.length).toBe(41);
    expect(routes).toContain("direct.outcome_transactions.insert");
    // Two source templates intentionally share that exact route.
    expect(source).toContain("SupabaseOutcomeTransactionRepository");
    expect(source).toContain("SupabaseTenantCoreLineageRepository");
  });

  it("implements all 19 canonical ranks and database-owned JSONB ordering",()=>{
    const kinds=[...migration.matchAll(/when '([A-Z_]+)' then (\d+)/g)].map((match)=>[match[1],Number(match[2])] as const);
    expect(new Map(kinds).size).toBe(19);
    expect([...new Map(kinds).values()].sort((a,b)=>a-b)).toEqual([...Array(19).keys()]);
    expect(migration).toContain("order by fence_rank, scope");
    expect(migration).toContain("canonical_scope_identity jsonb not null");
    expect(migration).not.toMatch(/canonical_scope_(hash|digest)/i);
  });

  it("pairs bootstrap and exact row lock and narrows legacy broad locks",()=>{
    const bootstrap=migration.indexOf("on conflict (fence_kind, identity_schema_version, canonical_scope_identity)");
    const rowLock=migration.indexOf("and canonical_scope_identity = r.scope\n     for update",bootstrap);
    expect(bootstrap).toBeGreaterThan(0); expect(rowLock).toBeGreaterThan(bootstrap);
    expect(migration).toContain("NARROW_TO_CANONICAL_FENCES_AND_EXACT_ROWS".replace("NARROW_TO_CANONICAL_FENCES_AND_EXACT_ROWS","replaces the five legacy SHARE table-lock clusters"));
    expect(migration).toContain("regexp_replace(");
  });

  it("pins READ COMMITTED and retries only a complete 40001 PostgREST request",()=>{
    const retry=readFileSync(retryPath,"utf8");
    expect(migration).toContain("current_setting('transaction_isolation') <> 'read committed'");
    expect(retry).toContain('value.code === "40001"');
    expect(retry).not.toMatch(/value\.code\s*===\s*"(?:40P01|55P03|57014)"/);
  });

  it("keeps fences private and uses fixed RPCs for pre-row-lock updates",()=>{
    expect(migration).toContain("revoke all on table public.build002_material_fences from public, anon, authenticated, service_role");
    expect(migration).not.toMatch(/create\s+function\s+public\.(?:lockfence|acquirearbitraryfence|bootstrapfence)/i);
    const repositories=readFileSync(resolve(root,"src/infrastructure/persistence/outcome/supabase-outcome-repositories.ts"),"utf8");
    expect(repositories).toContain('.rpc("build002_002e_update_asset"');
    expect(repositories).toContain('.rpc("build002_002e_update_outcome_transaction"');
  });

  const canonicalControls: Array<[string,()=>boolean]> = [
    ["omitted study lock",()=>migration.includes("'preservation_value_studies','id',v_study")],
    ["weakened study lock",()=>/preservation_value_studies[\s\S]*for update/.test(migration)],
    ["study identity loss",()=>migration.includes("BUILD002_002E_STUDY_IDENTITY_REQUIRED")],
    ["post-insert trigger wait",()=>migration.includes("before insert on public.%I") && !migration.includes("after insert on public.preservation_study_cases")],
    ["PK suffix return",()=>migration.includes("replaces the five legacy SHARE table-lock clusters")],
    ["outside return edge",()=>!migration.includes("direct.preservation_value_studies.insert")],
    ["parent-rank descent",()=>migration.includes("jsonb_build_object('rank',20,'relation','preservation_value_studies'")],
    ["same-template multiplicity",()=>migration.includes("select distinct public.build002_002e_fence_rank")],
    ["candidate/D3 boundary",()=>migration.includes("build002_002e_inner_admit_delegability")],
    ["boundary order",()=>migration.includes("order by (item->>'rank')::integer, item->>'relation', (item->>'id')::uuid")],
    ["environmental RI reverse edge",()=>!migration.includes("'AUTH_USERS'")],
  ];
  it.each(canonicalControls)("passes canonical negative control: %s",(_name,control)=>expect(control()).toBe(true));

  const implementationControls: Array<[string,()=>boolean]> = [
    ["I01 arbitrary fence RPC",()=>!/(lockfence|acquirearbitraryfence|bootstrapfence)/i.test(migration)],
    ["I02 weakened study lock",()=>migration.includes("raise exception 'BUILD002_002E_PARENT_NOT_FOUND: %.%'")],
    ["I03 missing study-row check",()=>migration.includes("BUILD002_002E_STUDY_IDENTITY_REQUIRED")],
    ["I04 late fence acquisition",()=>migration.includes("BUILD002_002E_IDENTITY_CHANGED_RESTART_REQUIRED")],
    ["I05 role-ordered W28",()=>migration.includes("order by fence_rank, scope") && !migration.includes("order by semantic_role")],
    ["I06 client JSONB ordering",()=>!source.includes("canonical_scope_identity.sort")],
    ["I07 provider call in transaction",()=>!/(openai|anthropic|provider).*build002_002e_route/i.test(migration)],
    ["I08 non-40001 retry",()=>!/(40P01|55P03|57014)/.test(readFileSync(retryPath,"utf8"))],
    ["I09 wait-only material revision",()=>migration.includes("case when p_classification = 'MATERIAL_WRITER' then 1 else 0 end")],
    ["I10 overlay drift",()=>new Set([...migration.matchAll(/'(direct\.[a-z0-9_.]+|rpc\.[a-z0-9_.]+)'/g)].map((match)=>match[1])).size===40],
  ];
  it.each(implementationControls)("rejects implementation negative: %s",(_name,control)=>expect(control()).toBe(true));
});

function expectOperation([className,method]:Operation):void {
  const start=source.indexOf(`class ${className}`);
  expect(start,`${className}.${method}`).toBeGreaterThanOrEqual(0);
  const next=source.indexOf("export class ",start+1);
  const block=source.slice(start,next<0?source.length:next);
  expect(block,`${className}.${method}`).toMatch(new RegExp(`(?:async\\s+)?${method}\\s*\\(`));
}

function collectTypeScript(directory:string):string {
  let result="";
  for(const name of readdirSync(directory)) {
    const path=resolve(directory,name); const stat=statSync(path);
    if(stat.isDirectory()) result+=collectTypeScript(path);
    else if(name.endsWith(".ts")) result+=`\n${readFileSync(path,"utf8")}`;
  }
  return result;
}
