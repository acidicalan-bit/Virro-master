-- BUILD 002-C1-D4-R0: serialized, append-only execution-authority fact.
-- The RPC derives every field from the persisted D0/D3 graph and immutable
-- TaskSpec snapshot. No executor, lease, run, receipt, or commit is touched.

create extension if not exists pgcrypto;

create table if not exists public.build002_execution_authority_capability (
  token text primary key default gen_random_uuid()::text
);
insert into public.build002_execution_authority_capability default values on conflict do nothing;
revoke all on table public.build002_execution_authority_capability from public, anon, authenticated, service_role;

create table if not exists public.build002_execution_authorities (
  execution_authority_id uuid primary key,
  schema_version text not null check (schema_version = 'build002-execution-authority-v0.1'),
  owner_tenant_id uuid not null references public.tenants(id) on delete restrict,
  principal_id uuid not null references auth.users(id) on delete restrict,
  membership_id uuid not null references public.tenant_memberships(id) on delete restrict,
  delegability_admission_id uuid not null references public.build002_delegability_admissions(admission_id) on delete restrict,
  delegability_admission_content_hash text not null check (delegability_admission_content_hash ~ '^[0-9a-fA-F]{64}$'),
  authority_commit_id uuid not null references public.build002_readiness_authority_commits(id) on delete restrict,
  outcome_transaction_id uuid not null,
  asset_id uuid not null references public.assets(id) on delete restrict,
  source_asset_version_id uuid not null references public.asset_versions(id) on delete restrict,
  source_asset_version_hash text not null check (source_asset_version_hash ~ '^[0-9a-fA-F]{64}$'),
  task_spec_id uuid not null,
  task_spec_version integer not null check (task_spec_version > 0),
  task_spec_hash text not null check (task_spec_hash ~ '^[0-9a-fA-F]{64}$'),
  blueprint_id uuid not null,
  blueprint_version integer not null check (blueprint_version > 0),
  blueprint_hash text not null check (blueprint_hash ~ '^[0-9a-fA-F]{64}$'),
  current_dependency_snapshot_hash text not null check (current_dependency_snapshot_hash ~ '^[0-9a-fA-F]{64}$'),
  capability_grant jsonb not null check (jsonb_typeof(capability_grant) = 'array'),
  capability_grant_hash text not null check (capability_grant_hash ~ '^[0-9a-fA-F]{64}$'),
  historical_dependency_snapshot_hash text not null check (historical_dependency_snapshot_hash ~ '^[0-9a-fA-F]{64}$'),
  evaluator_schema_version text not null,
  evaluator_version text not null,
  evaluator_definition_hash text not null check (evaluator_definition_hash ~ '^[0-9a-fA-F]{64}$'),
  scope text not null check (scope = 'EXECUTION_AUTHORITY_ONLY'),
  mutation_lease_granted boolean not null default false check (mutation_lease_granted = false),
  execution_started boolean not null default false check (execution_started = false),
  consequence_boundary text not null check (consequence_boundary = 'FRESH_MUTATION_LEASE_AND_PREEXECUTION_RECHECK_REQUIRED'),
  delegability_revalidated_at timestamptz not null,
  execution_authority_revalidated_at timestamptz not null,
  granted_at timestamptz not null default clock_timestamp(),
  valid_until timestamptz,
  execution_authority_content_hash text not null check (execution_authority_content_hash ~ '^[0-9a-fA-F]{64}$'),
  idempotency_key text not null unique,
  foreign key (owner_tenant_id, outcome_transaction_id)
    references public.outcome_transactions(owner_tenant_id, id) on delete restrict
);

create or replace function public.build002_execution_authority_immutable()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' and current_setting('build002.execution_authority', true) is distinct from
    (select token from public.build002_execution_authority_capability limit 1) then
    raise exception 'BUILD002_EXECUTION_AUTHORITY_INSERT_RESTRICTED' using errcode = '42501';
  end if;
  if tg_op <> 'INSERT' then raise exception 'BUILD002_EXECUTION_AUTHORITY_IMMUTABLE_%', tg_op using errcode = '55000'; end if;
  return new;
end;
$$;
drop trigger if exists build002_execution_authority_immutable on public.build002_execution_authorities;
create trigger build002_execution_authority_immutable before insert or update or delete
on public.build002_execution_authorities for each row execute function public.build002_execution_authority_immutable();

alter table public.build002_execution_authorities enable row level security;
revoke all on table public.build002_execution_authorities from public, anon, authenticated, service_role;
grant select on table public.build002_execution_authorities to authenticated;
create policy build002_execution_authorities_tenant_select on public.build002_execution_authorities
for select to authenticated using (exists (
  select 1 from public.tenant_memberships m join public.tenants t on t.id = m.tenant_id
  where m.tenant_id = build002_execution_authorities.owner_tenant_id
    and m.principal_id = auth.uid() and m.status = 'ACTIVE' and t.status = 'ACTIVE'
));

create or replace function public.build002_grant_execution_authority(
  p_principal_id uuid,
  p_membership_id uuid,
  p_admission_id uuid,
  p_task_spec_id uuid,
  p_task_spec_hash text
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_tenant uuid;
  v_membership record;
  v_tx record;
  v_asset record;
  v_version record;
  v_binding record;
  v_commit record;
  v_admission record;
  v_snapshot record;
  v_readiness record;
  v_field record;
  v_blueprint record;
  v_spec jsonb;
  v_caps jsonb;
  v_key text;
  v_existing record;
  v_id uuid := gen_random_uuid();
  v_now timestamptz := clock_timestamp();
  v_current_refs jsonb;
  v_current_reqs jsonb;
  v_content_hash text;
  v_capability_hash text;
  v_revalidated_iso text;
begin
  if p_principal_id is null or p_membership_id is null or p_admission_id is null or p_task_spec_id is null
     or p_task_spec_hash is null or p_task_spec_hash !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'EXECUTION_AUTHORITY_SCOPE_INVALID';
  end if;

  -- Fixed lock order: tenant, current membership, transaction, asset/head,
  -- C0 binding, D0 marker, D3 admission, graph, then immutable TaskSpec row.
  select tenant_id into v_tenant from public.tenant_memberships where id = p_membership_id and principal_id = p_principal_id;
  if not found then raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID'; end if;
  perform 1 from public.tenants where id = v_tenant and status = 'ACTIVE' for update;
  if not found then raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID'; end if;
  select * into v_membership from public.tenant_memberships where id = p_membership_id and tenant_id = v_tenant and principal_id = p_principal_id for update;
  if not found or v_membership.status is distinct from 'ACTIVE' then raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID'; end if;
  select * into v_admission from public.build002_delegability_admissions where admission_id = p_admission_id and owner_tenant_id = v_tenant;
  if not found then raise exception 'D3_ADMISSION_NOT_FOUND'; end if;
  select * into v_tx from public.outcome_transactions where id = v_admission.outcome_transaction_id and owner_tenant_id = v_tenant for update;
  if not found or v_tx.status is distinct from 'PREPARED' then raise exception 'EXECUTION_AUTHORITY_TRANSACTION_NOT_PREPARED'; end if;
  select * into v_asset from public.assets where id = v_tx.asset_id and owner_tenant_id = v_tenant for update;
  if not found or v_asset.current_version_id is distinct from v_tx.base_version_id then raise exception 'SOURCE_ASSET_HEAD_CHANGED'; end if;
  select * into v_version from public.asset_versions where id = v_asset.current_version_id and asset_id = v_asset.id and owner_tenant_id = v_tenant for update;
  if not found then raise exception 'SOURCE_ASSET_VERSION_CHANGED'; end if;
  select * into v_binding from public.outcome_transaction_requirement_bindings where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id for update;
  if not found or v_binding.policy_id is not null or v_binding.policy_hash is not null then raise exception 'C0_BINDING_INVALID'; end if;
  select * into v_commit from public.build002_readiness_authority_commits where id = v_admission.authority_commit_id and owner_tenant_id = v_tenant for update;
  if not found or v_commit.outcome_transaction_id is distinct from v_tx.id then raise exception 'D0_AUTHORITY_COMMIT_NOT_FOUND'; end if;
  select * into v_admission from public.build002_delegability_admissions where admission_id = p_admission_id and owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id for update;
  if not found then raise exception 'D3_ADMISSION_NOT_FOUND'; end if;
  if v_admission.currentness is distinct from 'CURRENT'
     or v_admission.scope is distinct from 'DELEGABILITY_ONLY'
     or v_admission.execution_authority_granted is distinct from false
     or v_admission.execution_started is distinct from false
     or v_admission.readiness_state is distinct from 'READY' then
    raise exception 'D3_ADMISSION_NOT_CURRENT';
  end if;
  if encode(digest(jsonb_build_object(
      'authorityCommitId', v_admission.authority_commit_id,
      'consequenceBoundary', v_admission.consequence_boundary,
      'currentDependencySnapshotHash', v_admission.current_dependency_snapshot_hash,
      'currentness', v_admission.currentness,
      'evaluatorDefinitionHash', v_admission.evaluator_definition_hash,
      'evaluatorSchemaVersion', v_admission.evaluator_schema_version,
      'evaluatorVersion', v_admission.evaluator_version,
      'executionAuthorityGranted', false,
      'executionStarted', false,
      'historicalDependencySnapshotHash', v_admission.historical_dependency_snapshot_hash,
      'membershipId', v_admission.membership_id,
      'outcomeTransactionId', v_admission.outcome_transaction_id,
      'ownerTenantId', v_admission.owner_tenant_id,
      'principalId', v_admission.principal_id,
      'readinessContentHash', v_admission.readiness_content_hash,
      'readinessId', v_admission.readiness_id,
      'readinessState', v_admission.readiness_state,
      'revalidatedAt', to_char(v_admission.revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'schemaVersion', v_admission.schema_version,
      'scope', v_admission.scope
    )::text, 'sha256'), 'hex') is distinct from lower(v_admission.admission_content_hash) then
    raise exception 'D3_ADMISSION_HASH_INVALID';
  end if;
  select * into v_snapshot from public.build002_dependency_snapshots where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id and dependency_snapshot_hash = v_admission.current_dependency_snapshot_hash for share;
  if not found then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  select * into v_readiness from public.build002_delegation_readiness where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id and id = v_admission.readiness_id for share;
  if not found or v_readiness.readiness_content_hash is distinct from v_admission.readiness_content_hash
     or v_readiness.dependency_snapshot_hash is distinct from v_admission.current_dependency_snapshot_hash
     or v_readiness.evaluator->>'schemaVersion' is distinct from v_admission.evaluator_schema_version
     or v_readiness.evaluator->>'version' is distinct from v_admission.evaluator_version
     or v_readiness.evaluator->>'definitionHash' is distinct from v_admission.evaluator_definition_hash
     or v_readiness.state is distinct from 'READY' or v_readiness.valid_until is not null and v_readiness.valid_until <= v_now then raise exception 'READINESS_NOT_CURRENT'; end if;
  if v_admission.revalidated_at < v_readiness.created_at or v_admission.revalidated_at > v_now then raise exception 'D3_REVALIDATION_TIME_INVALID'; end if;
  lock table public.build002_signal_requirements in share mode;
  lock table public.build002_signals in share mode;
  lock table public.build002_dependency_snapshots in share mode;
  lock table public.build002_signal_qualifications in share mode;
  lock table public.build002_delegation_readiness in share mode;
  select coalesce(jsonb_agg(jsonb_build_object('requirementId', requirement_id, 'signalId', signal_id::text, 'contentHash', signal_content_hash) order by requirement_id, signal_id::text, signal_content_hash), '[]'::jsonb) into v_current_refs from public.build002_signals where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id;
  if v_current_refs is distinct from coalesce((select jsonb_agg(x.value order by x.value) from jsonb_array_elements(v_snapshot.signal_references) x(value)), '[]'::jsonb) then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  select coalesce(jsonb_agg(requirement_definition_hash order by requirement_definition_hash), '[]'::jsonb) into v_current_reqs from public.build002_signal_requirements where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id;
  if v_current_reqs is distinct from coalesce((select jsonb_agg(x.value order by x.value) from jsonb_array_elements(v_snapshot.requirement_definition_hashes) x(value)), '[]'::jsonb) then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  select * into v_field from public.field_outcomes where transaction_id = v_tx.id and owner_tenant_id = v_tenant and task_spec_id = p_task_spec_id and task_spec_hash = p_task_spec_hash for share;
  if not found then raise exception 'TASK_SPEC_AUTHORITY_NOT_FOUND'; end if;
  v_spec := v_field.task_spec_snapshot;
  if jsonb_typeof(v_spec) is distinct from 'object' or v_spec->>'schemaVersion' is distinct from 'task-spec-v0.1'
     or v_spec->>'id' is distinct from p_task_spec_id::text or v_spec->>'hash' is distinct from p_task_spec_hash
     or v_spec->>'transactionId' is distinct from v_tx.id::text or v_spec->>'status' is distinct from 'READY'
     or v_field.source_version_id is distinct from v_version.id
     or v_field.task_spec_version is distinct from (v_spec->>'version')::integer
     or v_field.blueprint_id is distinct from v_binding.blueprint_id
     or v_field.blueprint_version is distinct from v_binding.blueprint_version
     or v_field.blueprint_hash is distinct from v_binding.blueprint_hash
     or (v_spec->'source'->>'assetId')::uuid is distinct from v_tx.asset_id
     or (v_spec->'source'->>'versionId')::uuid is distinct from v_version.id
     or v_spec->'source'->>'sha256' is distinct from v_field.source_sha256
     or (v_spec->'blueprint'->>'id')::uuid is distinct from v_binding.blueprint_id
     or (v_spec->'blueprint'->>'version')::integer is distinct from v_binding.blueprint_version
     or v_spec->'blueprint'->>'hash' is distinct from v_binding.blueprint_hash
     or (v_spec->'verificationPolicy'->>'requireSameSpecHash')::boolean is distinct from true
     or (v_spec->'verificationPolicy'->>'criticalUnknownBlocksCommit')::boolean is distinct from true
     or (v_spec->'verificationPolicy'->>'executorDoneIsEvidence')::boolean is distinct from false
     or v_spec->'securityProfile'->>'embeddedSecretPolicy' is distinct from 'FORBID'
     or exists (select 1 from jsonb_array_elements(v_spec->'values') item where (item->>'critical')::boolean = true and item->>'provenance' = 'UNKNOWN')
     or encode(digest((v_spec - 'id' - 'hash' - 'createdAt')::text, 'sha256'), 'hex') is distinct from lower(p_task_spec_hash) then raise exception 'TASK_SPEC_AUTHORITY_INVALID'; end if;
  select * into v_blueprint from public.outcome_blueprints where id = v_binding.blueprint_id and version = v_binding.blueprint_version and hash = v_binding.blueprint_hash and status = 'PUBLISHED' for share;
  if not found then raise exception 'C0_BINDING_INVALID'; end if;
  if exists (select 1 from jsonb_array_elements_text(v_spec->'capabilityGrant') c(value)
             where not exists (select 1 from jsonb_array_elements_text(coalesce(v_blueprint.definition->'capabilityPolicy'->'required','[]'::jsonb) || coalesce(v_blueprint.definition->'capabilityPolicy'->'optional','[]'::jsonb)) allowed(value) where allowed.value = c.value)
            ) then raise exception 'TASK_SPEC_CAPABILITY_NOT_ALLOWED'; end if;
  if (select count(*) from jsonb_array_elements_text(v_spec->'capabilityGrant')) <> (select count(distinct value) from jsonb_array_elements_text(v_spec->'capabilityGrant')) then raise exception 'TASK_SPEC_CAPABILITY_DUPLICATE'; end if;
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) into v_caps from jsonb_array_elements_text(v_spec->'capabilityGrant');
  v_capability_hash := encode(digest(v_caps::text, 'sha256'), 'hex');
  v_key := v_tenant::text || ':' || v_admission.admission_id::text || ':' || p_principal_id::text || ':' || p_task_spec_hash || ':' || v_admission.current_dependency_snapshot_hash;
  -- Retry validation above deliberately precedes the idempotent lookup.
  select * into v_existing from public.build002_execution_authorities where idempotency_key = v_key;
  if found then
    if v_existing.owner_tenant_id is distinct from v_tenant or v_existing.principal_id is distinct from p_principal_id
       or v_existing.membership_id is distinct from p_membership_id or v_existing.delegability_admission_id is distinct from p_admission_id
       or v_existing.task_spec_id is distinct from p_task_spec_id or v_existing.task_spec_hash is distinct from p_task_spec_hash
       or v_existing.current_dependency_snapshot_hash is distinct from v_admission.current_dependency_snapshot_hash
       or v_existing.capability_grant_hash is distinct from v_capability_hash
       or v_existing.execution_authority_content_hash is null then raise exception 'EXECUTION_AUTHORITY_READBACK_FAILED'; end if;
    return jsonb_build_object('execution_authority_id', v_existing.execution_authority_id, 'execution_authority_content_hash', v_existing.execution_authority_content_hash, 'granted_at', v_existing.granted_at);
  end if;
  perform set_config('build002.execution_authority', (select token from public.build002_execution_authority_capability limit 1), true);
  v_revalidated_iso := to_char(v_now at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_content_hash := encode(digest(jsonb_build_object(
    'assetId', v_tx.asset_id,
    'authorityCommitId', v_admission.authority_commit_id,
    'blueprintHash', v_binding.blueprint_hash,
    'blueprintId', v_binding.blueprint_id,
    'blueprintVersion', v_binding.blueprint_version,
    'capabilityGrant', v_caps,
    'capabilityGrantHash', v_capability_hash,
    'consequenceBoundary', 'FRESH_MUTATION_LEASE_AND_PREEXECUTION_RECHECK_REQUIRED',
    'currentDependencySnapshotHash', v_admission.current_dependency_snapshot_hash,
    'delegabilityAdmissionContentHash', v_admission.admission_content_hash,
    'delegabilityAdmissionId', v_admission.admission_id,
    'delegabilityRevalidatedAt', to_char(v_admission.revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'executionAuthorityRevalidatedAt', v_revalidated_iso,
    'executionStarted', false,
    'evaluatorDefinitionHash', v_readiness.evaluator->>'definitionHash',
    'evaluatorSchemaVersion', v_readiness.evaluator->>'schemaVersion',
    'evaluatorVersion', v_readiness.evaluator->>'version',
    'historicalDependencySnapshotHash', v_admission.historical_dependency_snapshot_hash,
    'membershipId', p_membership_id,
    'mutationLeaseGranted', false,
    'outcomeTransactionId', v_tx.id,
    'ownerTenantId', v_tenant,
    'principalId', p_principal_id,
    'sourceAssetVersionHash', v_snapshot.source_asset_version_hash,
    'sourceAssetVersionId', v_version.id,
    'scope', 'EXECUTION_AUTHORITY_ONLY',
    'schemaVersion', 'build002-execution-authority-v0.1',
    'taskSpecHash', p_task_spec_hash,
    'taskSpecId', p_task_spec_id,
    'taskSpecVersion', (v_spec->>'version')::integer,
    'validUntil', case when v_readiness.valid_until is null then null else to_char(v_readiness.valid_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end
  )::text, 'sha256'), 'hex');
  insert into public.build002_execution_authorities(execution_authority_id, schema_version, owner_tenant_id, principal_id, membership_id, delegability_admission_id, delegability_admission_content_hash, authority_commit_id, outcome_transaction_id, asset_id, source_asset_version_id, source_asset_version_hash, task_spec_id, task_spec_version, task_spec_hash, blueprint_id, blueprint_version, blueprint_hash, capability_grant, capability_grant_hash, historical_dependency_snapshot_hash, current_dependency_snapshot_hash, evaluator_schema_version, evaluator_version, evaluator_definition_hash, scope, mutation_lease_granted, execution_started, consequence_boundary, delegability_revalidated_at, execution_authority_revalidated_at, granted_at, valid_until, execution_authority_content_hash, idempotency_key)
  values (v_id, 'build002-execution-authority-v0.1', v_tenant, p_principal_id, p_membership_id, p_admission_id, v_admission.admission_content_hash, v_admission.authority_commit_id, v_tx.id, v_tx.asset_id, v_version.id, v_snapshot.source_asset_version_hash, p_task_spec_id, (v_spec->>'version')::integer, p_task_spec_hash, v_binding.blueprint_id, v_binding.blueprint_version, v_binding.blueprint_hash, v_caps, v_capability_hash, v_admission.historical_dependency_snapshot_hash, v_admission.current_dependency_snapshot_hash, v_readiness.evaluator->>'schemaVersion', v_readiness.evaluator->>'version', v_readiness.evaluator->>'definitionHash', 'EXECUTION_AUTHORITY_ONLY', false, false, 'FRESH_MUTATION_LEASE_AND_PREEXECUTION_RECHECK_REQUIRED', v_admission.revalidated_at, v_now, v_now, v_readiness.valid_until, v_content_hash, v_key);
  return jsonb_build_object('execution_authority_id', v_id, 'execution_authority_content_hash', v_content_hash, 'granted_at', v_now);
exception when unique_violation then
  select * into v_existing from public.build002_execution_authorities where idempotency_key = v_key;
  if found then return jsonb_build_object('execution_authority_id', v_existing.execution_authority_id, 'execution_authority_content_hash', v_existing.execution_authority_content_hash, 'granted_at', v_existing.granted_at); end if;
  raise;
end;
$$;

revoke all on function public.build002_grant_execution_authority(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.build002_grant_execution_authority(uuid, uuid, uuid, uuid, text) to service_role;
comment on table public.build002_execution_authorities is 'BUILD 002-C1-D4-R0 immutable authority fact; no execution consequence.';
