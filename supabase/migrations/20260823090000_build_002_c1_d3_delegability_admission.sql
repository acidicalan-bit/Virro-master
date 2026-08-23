-- BUILD 002-C1-D3: serialized, positive-only delegability admission.
-- TypeScript owns canonical content hashes; this boundary owns locks and current
-- relational state. It grants no execution capability and performs no work.

create table if not exists public.build002_delegability_admission_capability (
  token text primary key default gen_random_uuid()::text
);
insert into public.build002_delegability_admission_capability default values on conflict do nothing;
revoke all on table public.build002_delegability_admission_capability from public, anon, authenticated, service_role;

create table if not exists public.build002_delegability_admissions (
  admission_id uuid primary key,
  schema_version text not null check (schema_version = 'build002-delegability-admission-v0.1'),
  owner_tenant_id uuid not null references public.tenants(id) on delete restrict,
  principal_id uuid not null references auth.users(id) on delete restrict,
  membership_id uuid not null references public.tenant_memberships(id) on delete restrict,
  authority_commit_id uuid not null references public.build002_readiness_authority_commits(id) on delete restrict,
  outcome_transaction_id uuid not null,
  readiness_id uuid not null,
  readiness_content_hash text not null check (readiness_content_hash ~ '^[0-9a-fA-F]{64}$'),
  readiness_state text not null check (readiness_state = 'READY'),
  historical_dependency_snapshot_hash text not null check (historical_dependency_snapshot_hash ~ '^[0-9a-fA-F]{64}$'),
  current_dependency_snapshot_hash text not null check (current_dependency_snapshot_hash ~ '^[0-9a-fA-F]{64}$'),
  evaluator_schema_version text not null,
  evaluator_version text not null,
  evaluator_definition_hash text not null check (evaluator_definition_hash ~ '^[0-9a-fA-F]{64}$'),
  currentness text not null check (currentness = 'CURRENT'),
  revalidated_at timestamptz not null,
  admitted_at timestamptz not null default clock_timestamp(),
  scope text not null check (scope = 'DELEGABILITY_ONLY'),
  execution_authority_granted boolean not null default false check (execution_authority_granted = false),
  execution_started boolean not null default false check (execution_started = false),
  consequence_boundary text not null check (consequence_boundary = 'FRESH_SERIALIZED_RECHECK_REQUIRED_BEFORE_EXECUTION'),
  admission_content_hash text not null check (admission_content_hash ~ '^[0-9a-fA-F]{64}$'),
  unique (owner_tenant_id, authority_commit_id, principal_id, current_dependency_snapshot_hash),
  foreign key (owner_tenant_id, outcome_transaction_id)
    references public.outcome_transactions(owner_tenant_id, id) on delete restrict,
  foreign key (owner_tenant_id, outcome_transaction_id, readiness_id, readiness_content_hash)
    references public.build002_delegation_readiness(owner_tenant_id, outcome_transaction_id, id, readiness_content_hash) on delete restrict
);

create or replace function public.build002_delegability_admission_immutable()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' and current_setting('build002.delegability_admission', true) is distinct from
    (select token from public.build002_delegability_admission_capability limit 1) then
    raise exception 'BUILD002_DELEGABILITY_ADMISSION_INSERT_RESTRICTED' using errcode = '42501';
  end if;
  if tg_op <> 'INSERT' then raise exception 'BUILD002_DELEGABILITY_ADMISSION_IMMUTABLE_%', tg_op using errcode = '55000'; end if;
  return new;
end;
$$;
drop trigger if exists build002_delegability_admission_immutable on public.build002_delegability_admissions;
create trigger build002_delegability_admission_immutable before insert or update or delete on public.build002_delegability_admissions
for each row execute function public.build002_delegability_admission_immutable();

alter table public.build002_delegability_admissions enable row level security;
revoke all on table public.build002_delegability_admissions from public, anon, authenticated, service_role;
grant select on table public.build002_delegability_admissions to service_role;
create policy build002_delegability_admissions_authenticated_select on public.build002_delegability_admissions
for select to authenticated using (exists (select 1 from public.tenant_memberships m join public.tenants t on t.id = m.tenant_id
  where m.tenant_id = build002_delegability_admissions.owner_tenant_id and m.principal_id = auth.uid() and m.status = 'ACTIVE' and t.status = 'ACTIVE'));

create or replace function public.build002_admit_delegability(
  p_principal_id uuid,
  p_membership_id uuid,
  p_authority_commit_id uuid,
  p_admission jsonb
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_tenant uuid := nullif(p_admission->>'ownerTenantId','')::uuid;
  v_tx uuid := nullif(p_admission->>'outcomeTransactionId','')::uuid;
  v_membership record;
  v_tenant_status text;
  v_commit record;
  v_readiness record;
  v_snapshot record;
  v_current_refs jsonb;
  v_current_reqs jsonb;
  v_existing record;
  v_now timestamptz := clock_timestamp();
  v_evaluator_hash text := 'df4543bb4dae1b1e14e4d1569722aef619b292ab41354388e3f1878326af1746';
begin
  if p_admission is null or jsonb_typeof(p_admission) <> 'object' then raise exception 'DELEGABILITY_ADMISSION_INVALID'; end if;
  if v_tenant is null or v_tx is null or p_principal_id is null or p_membership_id is null or p_authority_commit_id is null then raise exception 'DELEGABILITY_SCOPE_INVALID'; end if;

  -- This order is the D0 order with the authority marker first-class: all
  -- mutable sources are locked before the positive fact becomes visible.
  select status into v_tenant_status from public.tenants where id = v_tenant for update;
  if v_tenant_status is distinct from 'ACTIVE' then raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID'; end if;
  select * into v_membership from public.tenant_memberships where id = p_membership_id and tenant_id = v_tenant and principal_id = p_principal_id for update;
  if not found or v_membership.status is distinct from 'ACTIVE' then raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID'; end if;
  select * into v_commit from public.build002_readiness_authority_commits where id = p_authority_commit_id for update;
  if not found or v_commit.owner_tenant_id is distinct from v_tenant or v_commit.principal_id is distinct from p_principal_id or v_commit.outcome_transaction_id is distinct from v_tx then raise exception 'AUTHORITY_COMMIT_NOT_FOUND'; end if;
  perform 1 from public.outcome_transactions where id = v_tx and owner_tenant_id = v_tenant and status = 'PREPARED' for update;
  if not found then raise exception 'READINESS_AUTHORITY_TRANSACTION_NOT_PREPARED'; end if;
  perform 1 from public.assets a join public.outcome_transactions t on t.asset_id = a.id where t.id = v_tx and a.owner_tenant_id = v_tenant and a.current_version_id = t.base_version_id for update;
  if not found then raise exception 'SOURCE_ASSET_HEAD_CHANGED'; end if;
  perform 1 from public.asset_versions av join public.outcome_transactions t on t.base_version_id = av.id where t.id = v_tx for update;
  perform 1 from public.outcome_transaction_requirement_bindings b where b.owner_tenant_id = v_tenant and b.outcome_transaction_id = v_tx for update;
  perform 1 from public.outcome_blueprints b join public.outcome_transaction_requirement_bindings x on x.blueprint_id = b.id and x.blueprint_version = b.version and x.blueprint_hash = b.hash join public.outcome_transactions t on t.id = x.outcome_transaction_id where t.id = v_tx and b.status = 'PUBLISHED' for share;
  perform 1 from public.outcome_requirement_profiles p join public.outcome_transaction_requirement_bindings x on x.requirement_profile_id = p.id and x.requirement_profile_version = p.version and x.requirement_profile_hash = p.hash where x.outcome_transaction_id = v_tx and p.status = 'PUBLISHED' for share;

  -- SHARE conflicts with the ROW EXCLUSIVE locks used by canonical signal and
  -- requirement writers, eliminating signal/requirement phantoms at admission.
  lock table public.build002_signal_requirements in share mode;
  lock table public.build002_signals in share mode;
  lock table public.build002_dependency_snapshots in share mode;
  lock table public.build002_signal_qualifications in share mode;
  lock table public.build002_delegation_readiness in share mode;

  select * into v_snapshot from public.build002_dependency_snapshots
    where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx
      and dependency_snapshot_hash = v_commit.dependency_snapshot_hash for share;
  if not found then raise exception 'HISTORICAL_GRAPH_INVALID'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('requirementId', requirement_id, 'signalId', signal_id::text, 'contentHash', signal_content_hash)
    order by requirement_id, signal_id::text, signal_content_hash), '[]'::jsonb)
    into v_current_refs from public.build002_signals where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx;
  if v_current_refs is distinct from coalesce((select jsonb_agg(x.value order by x.value) from jsonb_array_elements(v_snapshot.signal_references) x(value)), '[]'::jsonb) then
    raise exception 'CURRENTNESS_NOT_CURRENT';
  end if;
  select coalesce(jsonb_agg(requirement_definition_hash order by requirement_definition_hash), '[]'::jsonb)
    into v_current_reqs from public.build002_signal_requirements where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx;
  if v_current_reqs is distinct from coalesce((select jsonb_agg(x.value order by x.value) from jsonb_array_elements(v_snapshot.requirement_definition_hashes) x(value)), '[]'::jsonb) then
    raise exception 'CURRENTNESS_NOT_CURRENT';
  end if;
  select * into v_readiness from public.build002_delegation_readiness where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx and id = v_commit.readiness_id for share;
  if not found or v_readiness.readiness_content_hash is distinct from v_commit.readiness_content_hash or v_readiness.state is distinct from 'READY' or v_readiness.dependency_snapshot_hash is distinct from v_commit.dependency_snapshot_hash then raise exception 'HISTORICAL_GRAPH_INVALID'; end if;
  if v_readiness.valid_until is not null and v_readiness.valid_until <= v_now then raise exception 'READINESS_EXPIRED'; end if;
  if (v_readiness.evaluator->>'schemaVersion') is distinct from 'build002-qualification-evaluator-v0.1' or (v_readiness.evaluator->>'version') is distinct from '0.2.0' or (v_readiness.evaluator->>'definitionHash') is distinct from v_evaluator_hash then raise exception 'EVALUATOR_CHANGED'; end if;
  if p_admission->>'schemaVersion' is distinct from 'build002-delegability-admission-v0.1' or p_admission->>'readinessState' is distinct from 'READY' or p_admission->>'currentness' is distinct from 'CURRENT' or p_admission->>'scope' is distinct from 'DELEGABILITY_ONLY' or (p_admission->>'executionAuthorityGranted')::boolean is distinct from false or (p_admission->>'executionStarted')::boolean is distinct from false or p_admission->>'historicalDependencySnapshotHash' is distinct from v_commit.dependency_snapshot_hash or p_admission->>'readinessId' is distinct from v_commit.readiness_id::text or p_admission->>'readinessContentHash' is distinct from v_commit.readiness_content_hash or p_admission->>'currentDependencySnapshotHash' is distinct from v_commit.dependency_snapshot_hash then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  if p_admission->>'evaluatorDefinitionHash' is distinct from v_evaluator_hash then raise exception 'EVALUATOR_CHANGED'; end if;
  if (p_admission->>'revalidatedAt')::timestamptz < v_commit.evaluation_time or (p_admission->>'revalidatedAt')::timestamptz > v_now then raise exception 'SERIALIZED_RECHECK_FAILED'; end if;

  select * into v_existing from public.build002_delegability_admissions where owner_tenant_id = v_tenant and authority_commit_id = p_authority_commit_id and principal_id = p_principal_id and current_dependency_snapshot_hash = v_commit.dependency_snapshot_hash;
  if found then
    if v_existing.admission_content_hash is distinct from p_admission->>'admissionContentHash' then raise exception 'ADMISSION_CONFLICT'; end if;
    return jsonb_build_object('admission_id', v_existing.admission_id, 'admitted_at', v_existing.admitted_at);
  end if;
  perform set_config('build002.delegability_admission', (select token from public.build002_delegability_admission_capability limit 1), true);
  insert into public.build002_delegability_admissions(admission_id, schema_version, owner_tenant_id, principal_id, membership_id, authority_commit_id, outcome_transaction_id, readiness_id, readiness_content_hash, readiness_state, historical_dependency_snapshot_hash, current_dependency_snapshot_hash, evaluator_schema_version, evaluator_version, evaluator_definition_hash, currentness, revalidated_at, admitted_at, scope, execution_authority_granted, execution_started, consequence_boundary, admission_content_hash)
  values ((p_admission->>'admissionId')::uuid, p_admission->>'schemaVersion', v_tenant, p_principal_id, p_membership_id, p_authority_commit_id, v_tx, v_commit.readiness_id, v_commit.readiness_content_hash, 'READY', v_commit.dependency_snapshot_hash, v_commit.dependency_snapshot_hash, 'build002-qualification-evaluator-v0.1', '0.2.0', v_evaluator_hash, 'CURRENT', (p_admission->>'revalidatedAt')::timestamptz, v_now, 'DELEGABILITY_ONLY', false, false, 'FRESH_SERIALIZED_RECHECK_REQUIRED_BEFORE_EXECUTION', p_admission->>'admissionContentHash');
  return jsonb_build_object('admission_id', p_admission->>'admissionId', 'admitted_at', v_now);
exception when others then
  if sqlstate in ('P0001','42501','55000') then raise; end if;
  raise exception 'DELEGABILITY_ADMISSION_FAILED';
end;
$$;

revoke all on function public.build002_admit_delegability(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.build002_admit_delegability(uuid, uuid, uuid, jsonb) to service_role;
comment on table public.build002_delegability_admissions is 'BUILD 002-C1-D3 immutable positive admission; it grants no execution authority.';
