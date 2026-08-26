// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type SqlResult<T> = { rows: T[] };
type SqlDatabase = {
  exec(sql: string): Promise<unknown>;
  query<T extends Record<string, unknown>>(sql: string, params?: unknown[]): Promise<SqlResult<T>>;
  close(): Promise<void>;
};

const migrationsDir = resolve(process.cwd(), "supabase/migrations");

describe("BUILD 001-F1 local real PostgreSQL canonical commit boundary", () => {
  let db: SqlDatabase;

  beforeAll(async () => {
    db = new PGlite({ extensions: { pgcrypto } }) as SqlDatabase;
    await bootstrapSupabase(db);
    for (const name of readdirSync(migrationsDir).filter((item) => item.endsWith(".sql")).sort()) {
      await db.exec(readFileSync(resolve(migrationsDir, name), "utf8"));
    }
    await db.exec(`
      insert into auth.users(id) values ('10000000-0000-4000-8000-000000000001');
      insert into public.tenants(id, kind, personal_owner_principal_id, status)
      values ('20000000-0000-4000-8000-000000000002', 'PERSONAL', '10000000-0000-4000-8000-000000000001', 'ACTIVE');
      insert into public.tenant_memberships(id, tenant_id, principal_id, role, status)
      values ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'OWNER', 'ACTIVE');
      set request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
    `);
  }, 30_000);

  afterAll(async () => {
    await db?.close();
  });

  it("reproduces the candidate-SHA failure and its full transaction rollback", async () => {
    const vulnerableDb = new PGlite({ extensions: { pgcrypto } }) as SqlDatabase;
    try {
      await bootstrapSupabase(vulnerableDb);
      for (const name of readdirSync(migrationsDir).filter((item) => item.endsWith(".sql") && !item.includes("_f1_") && !item.includes("_f3_") && !item.includes("_f4_") && !item.includes("002e_r10")).sort()) {
        await vulnerableDb.exec(readFileSync(resolve(migrationsDir, name), "utf8"));
      }
      await seedAuthority(vulnerableDb);
      const fixture = await seedCanonicalFixture(vulnerableDb, 7, { hardening: false });
      await expectSqlError(
        vulnerableDb,
        `select public.commit_accepted_field_outcome('${fixture.outcome}'::uuid)`,
        "TRUST_STATE_COMMIT_IMMUTABLE",
      );
      await expectNoCanonicalTransition(vulnerableDb, fixture, fixture.baseVersion, 1);

      const existing = await seedCanonicalFixture(vulnerableDb, 16, { hardening: false });
      await vulnerableDb.exec(`
        insert into public.asset_versions(id, owner_tenant_id, asset_id, version_number, state, parent_version_id)
        values ('${existing.externalVersion}', '${TENANT}', '${existing.asset}', 2, '{"media":{"sha256":"${SOURCE_HASH}"}}'::jsonb, '${existing.baseVersion}');
        update public.assets set current_version_id = '${existing.externalVersion}' where id = '${existing.asset}';
        update public.outcome_transactions set status = 'COMMITTED' where id = '${existing.transaction}';
        insert into public.state_commits(owner_tenant_id, transaction_id, asset_id, new_version_id, previous_version_id)
        values ('${TENANT}', '${existing.transaction}', '${existing.asset}', '${existing.externalVersion}', '${existing.baseVersion}');
        set role service_role;
        update public.state_commits set committed_at = committed_at + interval '1 second' where transaction_id = '${existing.transaction}';
        delete from public.state_commits where transaction_id = '${existing.transaction}';
        reset role;
      `);
      const mutated = await vulnerableDb.query<{ commits: number }>(
        "select count(*)::integer as commits from public.state_commits where transaction_id = $1::uuid",
        [existing.transaction],
      );
      expect(mutated.rows[0].commits).toBe(0);
    } finally {
      await vulnerableDb.close();
    }
  }, 15_000);

  it("completes the legitimate atomic commit and returns an idempotent retry", async () => {
    const fixture = await seedCanonicalFixture(db, 1);

    const first = await db.query<{ result: { idempotent: boolean } }>(
      "select public.commit_accepted_field_outcome($1::uuid) as result",
      [fixture.outcome],
    );
    expect(first.rows[0].result.idempotent).toBe(false);
    await expectCommittedState(db, fixture);

    const retry = await db.query<{ result: { idempotent: boolean } }>(
      "select public.commit_accepted_field_outcome($1::uuid) as result",
      [fixture.outcome],
    );
    expect(retry.rows[0].result.idempotent).toBe(true);
    await expectCommittedState(db, fixture);
  });

  it("keeps an existing StateCommit immutable for normal and privileged SQL roles", async () => {
    const fixture = await seedCanonicalFixture(db, 14);
    await db.query<{ result: { idempotent: boolean } }>(
      "select public.commit_accepted_field_outcome($1::uuid) as result",
      [fixture.outcome],
    );
    const before = await db.query<Record<string, unknown>>("select * from public.state_commits where transaction_id = $1::uuid", [fixture.transaction]);

    await db.exec("set role authenticated");
    await expectSqlError(
      db,
      `update public.state_commits set asset_id = '${fixture.foreignTransaction}' where transaction_id = '${fixture.transaction}'`,
      "permission denied",
    );
    await expectSqlError(
      db,
      `delete from public.state_commits where transaction_id = '${fixture.transaction}'`,
      "permission denied",
    );
    await db.exec("reset role");

    await db.exec("set role service_role");
    for (const assignment of [
      `owner_tenant_id = null`,
      `transaction_id = '${fixture.foreignTransaction}'`,
      `asset_id = '${fixture.foreignTransaction}'`,
      `new_version_id = '${fixture.baseVersion}'`,
      `previous_version_id = '${fixture.baseVersion}'`,
      `committed_at = committed_at + interval '1 second'`,
    ]) {
      await expectSqlError(
        db,
        `update public.state_commits set ${assignment} where transaction_id = '${fixture.transaction}'`,
        "TRUST_STATE_COMMIT_IMMUTABLE",
      );
    }
    await expectSqlError(
      db,
      `delete from public.state_commits where transaction_id = '${fixture.transaction}'`,
      "TRUST_STATE_COMMIT_IMMUTABLE",
    );
    await db.exec("reset role");

    const after = await db.query<Record<string, unknown>>("select * from public.state_commits where transaction_id = $1::uuid", [fixture.transaction]);
    expect(after.rows).toEqual(before.rows);
  });

  it("does not allow a parent transaction cascade to erase StateCommit history", async () => {
    const fixture = await seedCanonicalFixture(db, 15);
    await db.query<{ result: { idempotent: boolean } }>(
      "select public.commit_accepted_field_outcome($1::uuid) as result",
      [fixture.outcome],
    );
    const constraint = await db.query<{ delete_action: string }>(`
      select case confdeltype when 'r' then 'RESTRICT' when 'a' then 'NO ACTION' else confdeltype::text end as delete_action
      from pg_constraint where conname = 'state_commits_transaction_id_restrict_fkey'
    `);
    expect(constraint.rows[0]?.delete_action).toBe("RESTRICT");
    await db.exec("set role service_role");
    try {
      await expectSqlError(
        db,
        `delete from public.outcome_transactions where id = '${fixture.transaction}'`,
        "immutable",
      );
    } finally {
      await db.exec("reset role");
    }
    const remaining = await db.query<{ commits: number }>(
      "select count(*)::integer as commits from public.state_commits where transaction_id = $1::uuid",
      [fixture.transaction],
    );
    expect(remaining.rows[0].commits).toBe(1);
  });

  it("keeps canonical candidate content, lineage and workflow columns immutable", async () => {
    const fixture = await seedCanonicalFixture(db, 2);
    await expectSqlError(
      db,
      `update public.candidate_assets set storage_key = 'tampered' where id = '${fixture.preserved}'`,
      "TRUST_STATE_COMMIT_IMMUTABLE",
    );
    await expectSqlError(
      db,
      `update public.candidate_assets set transaction_id = '${fixture.foreignTransaction}' where id = '${fixture.preserved}'`,
      "TRUST_TRANSACTION_IMMUTABLE",
    );
    await expectSqlError(
      db,
      `update public.candidate_assets set committed = true where id = '${fixture.preserved}'`,
      "TRUST_STATE_COMMIT_IMMUTABLE",
    );
    await expectSqlError(
      db,
      `update public.asset_versions set state = '{"tampered":true}'::jsonb where id = '${fixture.baseVersion}'`,
      "TRUST_ASSET_VERSION_IMMUTABLE",
    );
  });

  it("rejects stale head without a partial canonical transition", async () => {
    const fixture = await seedCanonicalFixture(db, 3);
    await db.exec(`
      insert into public.asset_versions(id, owner_tenant_id, asset_id, version_number, state, parent_version_id)
      values ('${fixture.externalVersion}', '${TENANT}', '${fixture.asset}', 2, '{"external":true}'::jsonb, '${fixture.baseVersion}');
      select public.build002_002e_update_asset('${fixture.asset}','${TENANT}',jsonb_build_object('current_version_id','${fixture.externalVersion}'));
    `);
    await expectSqlError(
      db,
      `select public.commit_accepted_field_outcome('${fixture.outcome}'::uuid)`,
      "TRUST_STALE_HEAD",
    );
    await expectNoCanonicalTransition(db, fixture, fixture.externalVersion, 2);
  });

  it("rejects a wrong outcome transaction without a partial canonical transition", async () => {
    const fixture = await seedCanonicalFixture(db, 8);
    await expectSqlError(
      db,
      `update public.field_outcomes set transaction_id = '${fixture.foreignTransaction}' where id = '${fixture.outcome}'`,
      "BUILD 005 records are immutable",
    );
    await expectNoCanonicalTransition(db, fixture, fixture.baseVersion, 1);
  });

  it("rejects missing acceptance, missing verification and an unknown outcome", async () => {
    const noAcceptance = await seedCanonicalFixture(db, 4, { acceptance: false });
    await expectSqlError(
      db,
      `select public.commit_accepted_field_outcome('${noAcceptance.outcome}'::uuid)`,
      "TRUST_HUMAN_ACCEPTANCE_REQUIRED",
    );
    await expectNoCanonicalTransition(db, noAcceptance, noAcceptance.baseVersion, 1);

    const noVerification = await seedCanonicalFixture(db, 5, { verification: false });
    await expectSqlError(
      db,
      `select public.commit_accepted_field_outcome('${noVerification.outcome}'::uuid)`,
      "TRUST_VERIFICATION_MISMATCH",
    );
    await expectNoCanonicalTransition(db, noVerification, noVerification.baseVersion, 1);

    await expectSqlError(
      db,
      "select public.commit_accepted_field_outcome('ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid)",
      "TRUST_RESOURCE_NOT_AUTHORIZED",
    );
  });

  it("rolls back version, head and StateCommit when the state transition fails", async () => {
    const fixture = await seedCanonicalFixture(db, 6);
    await db.exec(`
      create or replace function public.f1_injected_state_commit_failure()
      returns trigger language plpgsql set search_path = pg_catalog, public as $$
      begin
        if new.transaction_id = '${fixture.transaction}'::uuid then
          raise exception 'F1_INJECTED_STATE_COMMIT_FAILURE';
        end if;
        return new;
      end;
      $$;
      create trigger f1_injected_state_commit_failure
      before insert on public.state_commits
      for each row execute function public.f1_injected_state_commit_failure();
    `);
    await expectSqlError(
      db,
      `select public.commit_accepted_field_outcome('${fixture.outcome}'::uuid)`,
      "F1_INJECTED_STATE_COMMIT_FAILURE",
    );
    await expectNoCanonicalTransition(db, fixture, fixture.baseVersion, 1);
    await db.exec("drop trigger f1_injected_state_commit_failure on public.state_commits");
    await db.exec("drop function public.f1_injected_state_commit_failure()");
  });

  it("denies a commit after OWNER revocation and leaves canonical state unchanged", async () => {
    const fixture = await seedCanonicalFixture(db, 9);
    await db.exec(`
      update public.tenant_memberships
      set status = 'REVOKED', revoked_at = now()
      where tenant_id = '${TENANT}' and principal_id = '${ACTOR}';
    `);
    try {
      await expectSqlError(
        db,
        `select public.commit_accepted_field_outcome('${fixture.outcome}'::uuid)`,
        "TRUST_COMMIT_NOT_AUTHORIZED",
      );
      await expectNoCanonicalTransition(db, fixture, fixture.baseVersion, 1);
    } finally {
      await db.exec(`
        update public.tenant_memberships
        set status = 'ACTIVE', revoked_at = null
        where tenant_id = '${TENANT}' and principal_id = '${ACTOR}';
      `);
    }
  });

  it("denies a forged or stale OWNER identity while the database says MEMBER", async () => {
    const forgedActor = "10000000-0000-4000-8000-000000000002";
    const fixture = await seedCanonicalFixture(db, 10);
    await db.exec(`
      insert into auth.users(id) values ('${forgedActor}');
      insert into public.tenant_memberships(tenant_id, principal_id, role, status)
      values ('${TENANT}', '${forgedActor}', 'MEMBER', 'ACTIVE');
      set request.jwt.claim.sub = '${forgedActor}';
    `);
    try {
      await expectSqlError(
        db,
        `select public.commit_accepted_field_outcome('${fixture.outcome}'::uuid)`,
        "TRUST_COMMIT_NOT_AUTHORIZED",
      );
      await expectNoCanonicalTransition(db, fixture, fixture.baseVersion, 1);
    } finally {
      await db.exec(`set request.jwt.claim.sub = '${ACTOR}';`);
    }
  });

  it("denies acceptance followed by revocation at the commit boundary", async () => {
    const fixture = await seedCanonicalFixture(db, 11);
    await db.exec(`
      update public.tenant_memberships
      set status = 'REVOKED', revoked_at = now()
      where tenant_id = '${TENANT}' and principal_id = '${ACTOR}';
    `);
    try {
      await expectSqlError(
        db,
        `select public.commit_accepted_field_outcome('${fixture.outcome}'::uuid)`,
        "TRUST_COMMIT_NOT_AUTHORIZED",
      );
      await expectNoCanonicalTransition(db, fixture, fixture.baseVersion, 1);
    } finally {
      await db.exec(`
        update public.tenant_memberships
        set status = 'ACTIVE', revoked_at = null
        where tenant_id = '${TENANT}' and principal_id = '${ACTOR}';
      `);
    }
  });

  it("permits a different currently-authorized OWNER and locks both authority rows", async () => {
    const secondOwner = "10000000-0000-4000-8000-000000000004";
    const fixture = await seedCanonicalFixture(db, 12);
    await db.exec(`
      insert into auth.users(id) values ('${secondOwner}');
      insert into public.tenant_memberships(tenant_id, principal_id, role, status)
      values ('${TENANT}', '${secondOwner}', 'OWNER', 'ACTIVE');
      set request.jwt.claim.sub = '${secondOwner}';
    `);
    try {
      const result = await db.query<{ result: { idempotent: boolean } }>(
        "select public.commit_accepted_field_outcome($1::uuid) as result",
        [fixture.outcome],
      );
      expect(result.rows[0].result.idempotent).toBe(false);
      await expectCommittedState(db, fixture);
    } finally {
      await db.exec(`set request.jwt.claim.sub = '${ACTOR}';`);
    }
  });

  it("does not let a current commit OWNER rely on a revoked accepting OWNER", async () => {
    const secondOwner = "10000000-0000-4000-8000-000000000004";
    const fixture = await seedCanonicalFixture(db, 13);
    await db.exec(`
      update public.tenant_memberships
      set status = 'REVOKED', revoked_at = now()
      where tenant_id = '${TENANT}' and principal_id = '${ACTOR}';
      set request.jwt.claim.sub = '${secondOwner}';
    `);
    try {
      await expectSqlError(
        db,
        `select public.commit_accepted_field_outcome('${fixture.outcome}'::uuid)`,
        "TRUST_HUMAN_ACCEPTANCE_AUTHORITY_REVOKED",
      );
      await expectNoCanonicalTransition(db, fixture, fixture.baseVersion, 1);
    } finally {
      await db.exec(`
        update public.tenant_memberships
        set status = 'ACTIVE', revoked_at = null
        where tenant_id = '${TENANT}' and principal_id = '${ACTOR}';
        set request.jwt.claim.sub = '${ACTOR}';
      `);
    }
  });

  it("exposes an explicit lock-based authorization linearization point", async () => {
    const definition = await db.query<{ definition: string }>(
      "select lower(pg_get_functiondef('public.commit_accepted_field_outcome(uuid)'::regprocedure) || pg_get_functiondef('public.build002_002e_inner_commit_accepted_field_outcome(uuid)'::regprocedure)) as definition",
    );
    expect(definition.rows[0].definition).toContain("for update");
    expect(definition.rows[0].definition).toContain("order by membership.id");
    expect(definition.rows[0].definition).toContain("commit_accepted_field_outcome_unlocked");
  });
});

const ACTOR = "10000000-0000-4000-8000-000000000001";
const TENANT = "20000000-0000-4000-8000-000000000002";
const SPEC_HASH = "a".repeat(64);
const BLUEPRINT_HASH = "b".repeat(64);
const SOURCE_HASH = "c".repeat(64);
const CANDIDATE_HASH = "d".repeat(64);

type Fixture = ReturnType<typeof fixtureIds>;

function fixtureIds(run: number) {
  const id = (entity: number) => `${entity.toString(16).padStart(8, "0")}-0000-4000-8000-${run.toString(16).padStart(12, "0")}`;
  return {
    project: id(0x40), asset: id(0x50), baseVersion: id(0x60), transaction: id(0x70),
    execution: id(0x80), verification: id(0x90), raw: id(0xa0), preserved: id(0xb0),
    strategy: id(0xc0), outcome: id(0xd0), evidence: id(0xe0), feedback: id(0xf0),
    blueprint: id(0x11), spec: id(0x12), externalVersion: id(0x13),
    foreignTransaction: id(0x14),
  };
}

async function bootstrapSupabase(db: SqlDatabase): Promise<void> {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema storage;
    create table storage.buckets (
      id text primary key,
      name text not null unique,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
  `);
}

async function seedAuthority(db: SqlDatabase): Promise<void> {
  await db.exec(`
    insert into auth.users(id) values ('${ACTOR}');
    insert into public.tenants(id, kind, personal_owner_principal_id, status)
    values ('${TENANT}', 'PERSONAL', '${ACTOR}', 'ACTIVE');
    insert into public.tenant_memberships(id, tenant_id, principal_id, role, status)
    values ('30000000-0000-4000-8000-000000000003', '${TENANT}', '${ACTOR}', 'OWNER', 'ACTIVE');
    set request.jwt.claim.sub = '${ACTOR}';
  `);
}

async function seedCanonicalFixture(
  db: SqlDatabase,
  run: number,
  options: { acceptance?: boolean; verification?: boolean; hardening?: boolean } = {},
): Promise<Fixture> {
  const fixture = fixtureIds(run);
  const verification = options.verification ?? true;
  const acceptance = options.acceptance ?? true;
  const headUpdate = options.hardening === false
    ? `update public.assets set current_version_id='${fixture.baseVersion}' where id='${fixture.asset}'`
    : `select public.build002_002e_update_asset('${fixture.asset}','${TENANT}',jsonb_build_object('current_version_id','${fixture.baseVersion}'))`;
  const taskSpec = JSON.stringify({
    status: "READY", id: fixture.spec, version: 1, hash: SPEC_HASH,
    transactionId: fixture.transaction,
    source: { assetId: fixture.asset, versionId: fixture.baseVersion },
    criteria: [{ id: "SAME_SPEC", critical: true, verifier: "SAME_SPEC_GATE", evidenceTypes: ["POLICY_CHECK"] }],
  }).replaceAll("'", "''");
  const artifacts = JSON.stringify({
    sourceVersionId: fixture.baseVersion,
    rawCandidateId: fixture.raw,
    preservedCandidateId: fixture.preserved,
  }).replaceAll("'", "''");

  await db.exec(`
    insert into public.projects(id, owner_tenant_id, name)
    values ('${fixture.project}', '${TENANT}', 'F1 project ${run}');
    insert into public.assets(id, owner_tenant_id, project_id, name)
    values ('${fixture.asset}', '${TENANT}', '${fixture.project}', 'F1 asset ${run}');
    insert into public.asset_versions(id, owner_tenant_id, asset_id, version_number, state)
    values ('${fixture.baseVersion}', '${TENANT}', '${fixture.asset}', 1, '{"media":{"sha256":"${SOURCE_HASH}"}}'::jsonb);
    ${headUpdate};
    insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, status, raw_request)
    values ('${fixture.transaction}', '${TENANT}', '${fixture.project}', '${fixture.asset}', '${fixture.baseVersion}', 'VERIFIED', 'F1 canonical request');
    insert into public.outcome_transactions(id, owner_tenant_id, project_id, asset_id, base_version_id, status, raw_request)
    values ('${fixture.foreignTransaction}', '${TENANT}', '${fixture.project}', '${fixture.asset}', '${fixture.baseVersion}', 'DRAFT', 'F1 foreign transaction');
    insert into public.execution_runs(id, owner_tenant_id, transaction_id, status, executor, started_at, completed_at, latency_ms, cost_usd)
    values ('${fixture.execution}', '${TENANT}', '${fixture.transaction}', 'SUCCESS', 'f1-real-sql', now(), now(), 1, 0);
    insert into public.candidate_assets(
      id, owner_tenant_id, transaction_id, execution_run_id, storage_key, mime_type, width, height,
      byte_size, sha256, roi, instruction, provider, model, cost_usd, committed, candidate_type,
      source_version_id, raw_candidate_id, preservation_run_id
    ) values (
      '${fixture.raw}', '${TENANT}', '${fixture.transaction}', '${fixture.execution}',
      'tenants/${TENANT}/candidates/${fixture.transaction}/raw.png', 'image/png', 1, 1,
      4, '${CANDIDATE_HASH}', '{"x":0,"y":0,"width":1,"height":1}'::jsonb,
      'F1 edit', 'f1', 'f1', 0, false, 'RAW_PROVIDER', '${fixture.baseVersion}', null, null
    ), (
      '${fixture.preserved}', '${TENANT}', '${fixture.transaction}', '${fixture.execution}',
      'tenants/${TENANT}/candidates/${fixture.transaction}/preserved.png', 'image/png', 1, 1,
      4, '${CANDIDATE_HASH}', '{"x":0,"y":0,"width":1,"height":1}'::jsonb,
      'F1 edit', 'f1', 'f1', 0, false, 'PRESERVED', '${fixture.baseVersion}', '${fixture.raw}', null
    );
    insert into public.preservation_strategy_runs(
      id, tenant_id, owner_tenant_id, transaction_id, execution_run_id, raw_candidate_id, candidate_id,
      policy_version, outcome_sku, blueprint_id, blueprint_version, blueprint_hash, task_spec_id,
      task_spec_version, task_spec_hash, spec_compiler_version, strategy_id, parameters,
      candidate_role, machine_metrics, preservation_latency_ms
    ) values (
      '${fixture.strategy}', '${TENANT}', '${TENANT}', '${fixture.transaction}', '${fixture.execution}',
      '${fixture.raw}', '${fixture.preserved}', 'f1-policy', 'precision-edit-v0', '${fixture.blueprint}',
      1, '${BLUEPRINT_HASH}', '${fixture.spec}', 1, '${SPEC_HASH}', 'f1', 'P3_HARD', '{}'::jsonb,
      'DELIVERED', '{}'::jsonb, 1
    );
    insert into public.field_outcomes(
      id, tenant_id, owner_tenant_id, transaction_id, source_version_id, source_sha256, instruction,
      roi, topology, task_type, provider, model, raw_candidate_id, delivered_candidate_id,
      recommended_strategy, strategy_id, policy_version, outcome_sku, blueprint_id, blueprint_version,
      blueprint_hash, blueprint_snapshot, task_spec_id, task_spec_version, task_spec_hash,
      task_spec_snapshot, spec_compiler_name, spec_compiler_version, machine_verification_status,
      same_spec_status, provider_latency_ms, preservation_latency_ms, total_latency_ms, provider_cost_usd
    ) values (
      '${fixture.outcome}', '${TENANT}', '${TENANT}', '${fixture.transaction}', '${fixture.baseVersion}',
      '${SOURCE_HASH}', 'F1 edit', '{"x":0,"y":0,"width":1,"height":1}'::jsonb,
      'LOCAL_INDEPENDENT', 'IMAGE_EDIT', 'f1', 'f1', '${fixture.raw}', '${fixture.preserved}',
      'P3_HARD', 'P3_HARD', 'f1-policy', 'precision-edit-v0', '${fixture.blueprint}', 1,
      '${BLUEPRINT_HASH}', '{}'::jsonb, '${fixture.spec}', 1, '${SPEC_HASH}', '${taskSpec}'::jsonb,
      'f1', 'f1', 'PASSED', 'PASSED', 1, 1, 2, 0
    );
  `);

  if (verification) {
    await db.exec(`
      insert into public.verification_runs(id, owner_tenant_id, transaction_id, execution_run_id, status)
      values ('${fixture.verification}', '${TENANT}', '${fixture.transaction}', '${fixture.execution}', 'PASSED');
      insert into public.verification_criterion_evidence(
        id, tenant_id, owner_tenant_id, transaction_id, verification_run_id, execution_run_id,
        criterion_id, status, evidence_type, issuer_role, task_spec_id, task_spec_version,
        task_spec_hash, artifact_bindings, verifier, evidence_ref
      ) values (
        '${fixture.evidence}', '${TENANT}', '${TENANT}', '${fixture.transaction}', '${fixture.verification}',
        '${fixture.execution}', 'SAME_SPEC', 'PASS', 'POLICY_CHECK', 'SYSTEM_GATE', '${fixture.spec}',
        1, '${SPEC_HASH}', '${artifacts}'::jsonb, '{"name":"f1","version":"1"}'::jsonb, 'f1://evidence/${run}'
      );
    `);
  }

  if (acceptance) {
    await db.exec(`
      insert into public.field_feedback(
        id, tenant_id, owner_tenant_id, recorded_by_principal_id, recorded_by,
        field_outcome_id, human_accepted, acceptance_source
      ) values (
        '${fixture.feedback}', '${TENANT}', '${TENANT}', '${ACTOR}', '${ACTOR}',
        '${fixture.outcome}', true, 'HUMAN_EVALUATOR'
      );
    `);
  }
  return fixture;
}

async function expectCommittedState(db: SqlDatabase, fixture: Fixture): Promise<void> {
  const result = await db.query<{
    head_is_new: boolean; transaction_status: string; versions: number; commits: number; candidate_committed: boolean;
  }>(`
    select
      asset.current_version_id <> '${fixture.baseVersion}'::uuid as head_is_new,
      transaction.status as transaction_status,
      (select count(*)::integer from public.asset_versions where asset_id = '${fixture.asset}') as versions,
      (select count(*)::integer from public.state_commits where transaction_id = '${fixture.transaction}') as commits,
      candidate.committed as candidate_committed
    from public.assets asset
    join public.outcome_transactions transaction on transaction.id = '${fixture.transaction}'
    join public.candidate_assets candidate on candidate.id = '${fixture.preserved}'
    where asset.id = '${fixture.asset}'
  `);
  expect(result.rows[0]).toEqual({
    head_is_new: true,
    transaction_status: "COMMITTED",
    versions: 2,
    commits: 1,
    candidate_committed: false,
  });
}

async function expectNoCanonicalTransition(
  db: SqlDatabase,
  fixture: Fixture,
  expectedHead: string,
  expectedVersions: number,
): Promise<void> {
  const result = await db.query<{ head: string; status: string; versions: number; commits: number }>(`
    select asset.current_version_id::text as head, transaction.status,
      (select count(*)::integer from public.asset_versions where asset_id = '${fixture.asset}') as versions,
      (select count(*)::integer from public.state_commits where transaction_id = '${fixture.transaction}') as commits
    from public.assets asset
    join public.outcome_transactions transaction on transaction.id = '${fixture.transaction}'
    where asset.id = '${fixture.asset}'
  `);
  expect(result.rows[0]).toEqual({ head: expectedHead, status: "VERIFIED", versions: expectedVersions, commits: 0 });
}

async function expectSqlError(db: SqlDatabase, sql: string, message: string): Promise<void> {
  await expect(db.exec(sql)).rejects.toThrow(message);
}
