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
const retry = readFileSync(retryPath,"utf8");

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
    // Git's canonical blob is LF-normalized; tolerate only the checkout's CRLF
    // materialization while asserting the authority content digest.
    const sha=createHash("sha256").update(readFileSync(specPath,"utf8").replace(/\r\n/g,"\n")).digest("hex");
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

  it("preauthorizes without locks, writes, fence access, revision access, or dynamic SQL",()=>{
    const preauth=sqlFunction("build002_002e_authorize_route","build002_002e_rederive_context");
    expect(preauth).toContain("security definer");
    expect(preauth).toContain("set search_path = pg_catalog, public");
    expect(preauth).not.toMatch(/\bfor\s+(?:update|share)\b/i);
    expect(preauth).not.toMatch(/^\s*(?:insert|update|delete|merge|truncate)\b/im);
    expect(preauth).not.toMatch(/build002_material_fences|material_revision|serialization_revision|\bexecute\b/i);
    expect(migration).toContain("revoke all on function public.build002_002e_authorize_route(text,jsonb) from public, anon, authenticated, service_role");
  });

  it("uses exact actor classification and active tenant membership",()=>{
    const preauth=sqlFunction("build002_002e_authorize_route","build002_002e_rederive_context");
    expect(preauth).toContain("v_set_role = 'service_role' and v_claim_role = 'service_role'");
    expect(preauth).toContain("v_set_role = 'authenticated'");
    expect(preauth).toContain("v_claim_role = 'authenticated'");
    expect(preauth).toContain("v_actor is not null");
    expect(preauth).toContain("m.status='ACTIVE' and t.status='ACTIVE'");
    expect(preauth).not.toMatch(/auth\.uid\(\)\s+is\s+null[^;]*(?:trusted|service)/i);
  });

  it("orders preauthorization, one fence authority, exact held-set proof, and post-lock authority",()=>{
    const route=sqlFunction("build002_002e_route","build002_002e_direct_insert_guard");
    const firstAuth=route.indexOf("build002_002e_authorize_route");
    const firstDerive=route.indexOf("build002_002e_derive_fences",firstAuth);
    const acquire=route.indexOf("build002_002e_acquire_fences",firstDerive);
    const rederive=route.indexOf("build002_002e_rederive_context",acquire);
    const secondDerive=route.indexOf("build002_002e_derive_fences",rederive);
    const heldSet=route.indexOf("build002_002e_assert_held_fence_set",secondDerive);
    const postAuth=route.indexOf("build002_002e_authorize_route",heldSet);
    const parentLock=route.indexOf("build002_002e_lock_parents",postAuth);
    expect([firstAuth,firstDerive,acquire,rederive,secondDerive,heldSet,postAuth,parentLock].every((value)=>value>=0)).toBe(true);
    expect(firstAuth).toBeLessThan(firstDerive); expect(firstDerive).toBeLessThan(acquire);
    expect(acquire).toBeLessThan(rederive); expect(rederive).toBeLessThan(secondDerive);
    expect(secondDerive).toBeLessThan(heldSet); expect(heldSet).toBeLessThan(postAuth);
    expect(postAuth).toBeLessThan(parentLock);
  });

  it("preauthorizes every wrapper entry and every direct trigger before routing",()=>{
    const enter=sqlFunction("build002_002e_enter","build002_002e_leave");
    expect(enter.indexOf("build002_002e_authorize_route")).toBeLessThan(enter.indexOf("build002_002e_route"));
    const direct=sqlFunction("build002_002e_direct_insert_guard","build002_002e_reject_unrouted_update");
    expect(direct.indexOf("build002_002e_authorize_route")).toBeLessThan(direct.indexOf("build002_002e_route"));
    expect([...migration.matchAll(/build002_002e_enter\('/g)]).toHaveLength(20);
  });

  it("compares the exact held set relationally and never acquires a late fence",()=>{
    const held=sqlFunction("build002_002e_assert_held_fence_set","build002_002e_route");
    expect((held.match(/\bexcept\b/gi)??[])).toHaveLength(2);
    expect(held).toContain("item->>'kind'");
    expect(held).toContain("item->'scope'");
    expect(held).toContain("errcode='40001'");
    expect(held).not.toMatch(/hash|digest|acquire_fences/i);
  });

  it("limits serialization replay to exact protected PostgREST endpoints",()=>{
    expect(retry).toContain('request.method.toUpperCase() !== "POST"');
    expect(retry).toContain("url.origin !== canonicalOrigin");
    expect(retry).toContain('const rpcPrefix = "/rest/v1/rpc/"');
    expect(retry).toContain('const tablePrefix = "/rest/v1/"');
    expect(retry).toContain("serializationRetryLimit ?? 1");
    expect(retry).toContain('value.code === "40001"');
    const routes=new Set([...migration.matchAll(/'(direct\.[a-z0-9_.]+|rpc\.[a-z0-9_.]+)'/g)].map((match)=>match[1]));
    const expected=new Set<string>();
    for(const route of routes) {
      const [kind,...parts]=route.split(".");
      expected.add(kind==="direct" ? `/rest/v1/${parts[0]}` : `/rest/v1/rpc/${parts.join(".")}`);
    }
    expected.add("/rest/v1/rpc/build002_002e_update_asset");
    expected.add("/rest/v1/rpc/build002_002e_update_outcome_transaction");
    const actual=new Set([
      ...typescriptStringSet("PROTECTED_TABLE_PATHS").map((value)=>`/rest/v1/${value}`),
      ...typescriptStringSet("PROTECTED_RPC_PATHS").map((value)=>`/rest/v1/rpc/${value}`),
    ]);
    expect(actual.size).toBe(40);
    expect([...actual].sort()).toEqual([...expected].sort());
  });

  it("authenticates nested suppression with a private transaction-bound HMAC",()=>{
    const active=sqlFunction("build002_002e_active_operation_valid","build002_002e_assert_held_fence_set");
    const enter=sqlFunction("build002_002e_enter","build002_002e_leave");
    expect(active).toContain("build002_002e_runtime_secret");
    expect(active).toContain("txid_current()"); expect(active).toContain("pg_backend_pid()");
    expect(active).toContain("public.hmac"); expect(enter).toContain("public.hmac");
    expect(migration).toContain("revoke all on table public.build002_002e_runtime_secret from public, anon, authenticated, service_role");
    expect(migration).not.toMatch(/if\s+current_setting\('build002\.udre_active_operation'[^;]*then/i);
  });

  const r2Controls: Array<[string,()=>boolean]> = [
    ["C01 cross-tenant preauth",()=>migration.includes("BUILD002_002E_PREAUTH_TENANT_DENIED")],
    ["C02 cross-lineage preauth",()=>migration.includes("BUILD002_002E_PREAUTH_TRANSACTION_LINEAGE")],
    ["C03 fence DoS",()=>migration.indexOf("build002_002e_authorize_route",migration.indexOf("create function public.build002_002e_route"))<migration.indexOf("build002_002e_acquire_fences",migration.indexOf("create function public.build002_002e_route"))],
    ["C04 parent DoS",()=>migration.indexOf("build002_002e_authorize_route",migration.indexOf("create function public.build002_002e_route"))<migration.indexOf("build002_002e_lock_parents",migration.indexOf("create function public.build002_002e_route"))],
    ["C05 held-set new fence",()=>migration.includes("build002_002e_assert_held_fence_set")],
    ["C06 held-set changed scope",()=>sqlFunction("build002_002e_assert_held_fence_set","build002_002e_route").includes("union all")],
    ["C07 Storage no retry",()=>retry.includes('const tablePrefix = "/rest/v1/"')],
    ["C08 Auth no retry",()=>retry.includes("url.origin !== canonicalOrigin")],
    ["C09 Functions no retry",()=>retry.includes('const rpcPrefix = "/rest/v1/rpc/"')],
    ["C10 protected retry",()=>retry.includes("serializationAttempts += 1")],
    ["C11 nonprotected no retry",()=>retry.includes("PROTECTED_TABLE_PATHS.has(table)")],
    ["C12 forged suppression",()=>migration.includes("v_supplied=v_expected")],
  ];
  it.each(r2Controls)("passes R2 security correction: %s",(_name,control)=>expect(control()).toBe(true));
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

function sqlFunction(name:string,nextName:string):string {
  const start=migration.indexOf(`create function public.${name}`);
  const end=migration.indexOf(`create function public.${nextName}`,start+1);
  expect(start,name).toBeGreaterThanOrEqual(0);
  expect(end,nextName).toBeGreaterThan(start);
  return migration.slice(start,end);
}

function typescriptStringSet(name:string):string[] {
  const start=retry.indexOf(`const ${name} = new Set([`);
  const end=retry.indexOf("]);",start);
  expect(start,name).toBeGreaterThanOrEqual(0);
  expect(end,name).toBeGreaterThan(start);
  return [...retry.slice(start,end).matchAll(/"([a-z0-9_]+)"/g)].map((match)=>match[1]);
}
