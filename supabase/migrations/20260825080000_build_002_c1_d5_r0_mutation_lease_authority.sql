-- BUILD 002-C1-D5-R0: a fresh, append-only mutation-lease authority fact.
-- This table is intentionally separate from legacy public.mutation_leases.
-- The RPC revalidates the D4 graph at consequence time and never executes work.

create extension if not exists pgcrypto;

create table if not exists public.build002_mutation_lease_capability (
  token text primary key default gen_random_uuid()::text
);
insert into public.build002_mutation_lease_capability default values on conflict do nothing;
revoke all on table public.build002_mutation_lease_capability from public, anon, authenticated, service_role;

create table if not exists public.build002_mutation_leases (
  mutation_lease_id uuid primary key,
  schema_version text not null check (schema_version = 'build002-mutation-lease-v0.1'),
  owner_tenant_id uuid not null references public.tenants(id) on delete restrict,
  principal_id uuid not null references auth.users(id) on delete restrict,
  membership_id uuid not null references public.tenant_memberships(id) on delete restrict,
  execution_authority_id uuid not null references public.build002_execution_authorities(execution_authority_id) on delete restrict,
  execution_authority_content_hash text not null check (execution_authority_content_hash ~ '^[0-9a-fA-F]{64}$'),
  delegability_admission_id uuid not null references public.build002_delegability_admissions(admission_id) on delete restrict,
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
  capability_grant_hash text not null check (capability_grant_hash ~ '^[0-9a-fA-F]{64}$'),
  target_path text not null check (char_length(target_path) between 1 and 500),
  category text not null check (category = 'MUTABLE'),
  scope text not null check (scope = 'MUTATION_LEASE_ONLY'),
  execution_started boolean not null default false check (execution_started = false),
  execution_authority_revalidated_at timestamptz not null,
  mutation_lease_revalidated_at timestamptz not null,
  granted_at timestamptz not null default clock_timestamp(),
  valid_until timestamptz not null,
  consequence_boundary text not null check (consequence_boundary = 'FRESH_PREEXECUTION_RECHECK_AND_EXECUTION_START_REQUIRED'),
  mutation_lease_content_hash text not null check (mutation_lease_content_hash ~ '^[0-9a-fA-F]{64}$'),
  unique (execution_authority_id, target_path, category),
  foreign key (owner_tenant_id, outcome_transaction_id)
    references public.outcome_transactions(owner_tenant_id, id) on delete restrict
);

create or replace function public.build002_mutation_lease_immutable()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' and current_setting('build002.mutation_lease', true) is distinct from
    (select token from public.build002_mutation_lease_capability limit 1) then
    raise exception 'BUILD002_MUTATION_LEASE_INSERT_RESTRICTED' using errcode = '42501';
  end if;
  if tg_op <> 'INSERT' then
    raise exception 'BUILD002_MUTATION_LEASE_IMMUTABLE_%', tg_op using errcode = '55000';
  end if;
  return new;
end;
$$;
drop trigger if exists build002_mutation_lease_immutable on public.build002_mutation_leases;
create trigger build002_mutation_lease_immutable
before insert or update or delete on public.build002_mutation_leases
for each row execute function public.build002_mutation_lease_immutable();

alter table public.build002_mutation_leases enable row level security;
revoke all on table public.build002_mutation_leases from public, anon, authenticated, service_role;
grant select on table public.build002_mutation_leases to authenticated, service_role;
create policy build002_mutation_leases_tenant_select on public.build002_mutation_leases
for select to authenticated using (exists (
  select 1 from public.tenant_memberships m join public.tenants t on t.id = m.tenant_id
  where m.tenant_id = build002_mutation_leases.owner_tenant_id
    and m.principal_id = auth.uid() and m.status = 'ACTIVE' and t.status = 'ACTIVE'
));

create or replace function public.build002_validate_mutation_lease_row(p_mutation_lease_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare r record; v_hash text;
begin
  select * into r from public.build002_mutation_leases where mutation_lease_id = p_mutation_lease_id for share;
  if not found or r.schema_version is distinct from 'build002-mutation-lease-v0.1' or r.category is distinct from 'MUTABLE'
     or r.scope is distinct from 'MUTATION_LEASE_ONLY' or r.execution_started is distinct from false
     or r.valid_until is null or r.mutation_lease_content_hash is null then raise exception 'MUTATION_LEASE_READBACK_FAILED'; end if;
  v_hash := public.build002_canonical_sha256(jsonb_build_object(
    'assetId', r.asset_id, 'authorityCommitId', r.authority_commit_id, 'blueprintHash', r.blueprint_hash, 'blueprintId', r.blueprint_id, 'blueprintVersion', r.blueprint_version,
    'capabilityGrantHash', r.capability_grant_hash, 'consequenceBoundary', r.consequence_boundary, 'currentDependencySnapshotHash', r.current_dependency_snapshot_hash,
    'delegabilityAdmissionId', r.delegability_admission_id, 'executionAuthorityId', r.execution_authority_id, 'executionAuthorityContentHash', r.execution_authority_content_hash,
    'executionAuthorityRevalidatedAt', to_char(r.execution_authority_revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'executionStarted', r.execution_started,
    'membershipId', r.membership_id, 'mutationLeaseRevalidatedAt', to_char(r.mutation_lease_revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'outcomeTransactionId', r.outcome_transaction_id, 'ownerTenantId', r.owner_tenant_id, 'principalId', r.principal_id, 'scope', r.scope, 'schemaVersion', r.schema_version,
    'sourceAssetVersionHash', r.source_asset_version_hash, 'sourceAssetVersionId', r.source_asset_version_id, 'targetPath', r.target_path,
    'taskSpecHash', r.task_spec_hash, 'taskSpecId', r.task_spec_id, 'taskSpecVersion', r.task_spec_version, 'validUntil', to_char(r.valid_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'category', r.category));
  if lower(v_hash) is distinct from lower(r.mutation_lease_content_hash) then raise exception 'MUTATION_LEASE_READBACK_FAILED'; end if;
end;
$$;
revoke all on function public.build002_validate_mutation_lease_row(uuid) from public, anon, authenticated, service_role;

create or replace function public.build002_grant_mutation_lease(
  p_principal_id uuid,
  p_membership_id uuid,
  p_execution_authority_id uuid,
  p_target_path text,
  p_category text
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_tenant uuid;
  v_membership record;
  v_tx record;
  v_asset record;
  v_version record;
  v_d4 record;
  v_admission record;
  v_commit record;
  v_snapshot record;
  v_readiness record;
  v_binding record;
  v_profile record;
  v_blueprint record;
  v_field record;
  v_spec jsonb;
  v_current_refs jsonb;
  v_current_reqs jsonb;
  v_transaction_hash text;
  v_source_hash text;
  v_admission_hash text;
  v_d4_hash text;
  v_caps_hash text;
  v_key text;
  v_existing record;
  v_id uuid := gen_random_uuid();
  v_now timestamptz := clock_timestamp();
  v_revalidated_iso text;
  v_valid_until timestamptz;
  v_content_hash text;
begin
  if p_principal_id is null or p_membership_id is null or p_execution_authority_id is null
     or p_target_path is null or btrim(p_target_path) = '' or p_category is distinct from 'MUTABLE'
     or p_target_path like '%*%' or p_target_path like '%[%]%' or p_target_path like '%..%'
     or p_target_path like '.%' or p_target_path like '%.' then
    raise exception 'MUTATION_LEASE_SCOPE_INVALID';
  end if;
  p_target_path := btrim(p_target_path);

  -- Tenant identity is derived from the current membership, never supplied by the caller.
  select tenant_id into v_tenant from public.tenant_memberships where id = p_membership_id and principal_id = p_principal_id;
  if not found then raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID'; end if;
  perform 1 from public.tenants where id = v_tenant and status = 'ACTIVE' for update;
  if not found then raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID'; end if;
  select * into v_membership from public.tenant_memberships
   where id = p_membership_id and tenant_id = v_tenant and principal_id = p_principal_id for update;
  if not found or v_membership.status is distinct from 'ACTIVE' then raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID'; end if;

  select * into v_d4 from public.build002_execution_authorities
   where execution_authority_id = p_execution_authority_id for update;
  if not found then raise exception 'EXECUTION_AUTHORITY_NOT_FOUND'; end if;
  if v_d4.owner_tenant_id is distinct from v_tenant or v_d4.principal_id is distinct from p_principal_id
     or v_d4.membership_id is distinct from p_membership_id or v_d4.scope is distinct from 'EXECUTION_AUTHORITY_ONLY'
     or v_d4.mutation_lease_granted is distinct from false or v_d4.execution_started is distinct from false
     or v_d4.consequence_boundary is distinct from 'FRESH_MUTATION_LEASE_AND_PREEXECUTION_RECHECK_REQUIRED' then
    raise exception 'EXECUTION_AUTHORITY_IDENTITY_MISMATCH';
  end if;

  select * into v_tx from public.outcome_transactions
   where id = v_d4.outcome_transaction_id and owner_tenant_id = v_tenant for update;
  if not found or v_tx.status is distinct from 'PREPARED' then raise exception 'EXECUTION_AUTHORITY_TRANSACTION_NOT_PREPARED'; end if;
  select * into v_asset from public.assets where id = v_tx.asset_id and owner_tenant_id = v_tenant for update;
  if not found or v_asset.current_version_id is distinct from v_tx.base_version_id then raise exception 'SOURCE_ASSET_HEAD_CHANGED'; end if;
  select * into v_version from public.asset_versions where id = v_tx.base_version_id and asset_id = v_asset.id and owner_tenant_id = v_tenant for update;
  if not found then raise exception 'SOURCE_ASSET_VERSION_CHANGED'; end if;
  if v_d4.outcome_transaction_id is distinct from v_tx.id or v_d4.asset_id is distinct from v_asset.id
     or v_d4.source_asset_version_id is distinct from v_version.id then
    raise exception 'EXECUTION_AUTHORITY_IDENTITY_MISMATCH';
  end if;

  select * into v_admission from public.build002_delegability_admissions
   where admission_id = v_d4.delegability_admission_id for update;
  if not found or v_admission.owner_tenant_id is distinct from v_tenant
     or v_admission.principal_id is distinct from p_principal_id or v_admission.membership_id is distinct from p_membership_id
     or v_admission.outcome_transaction_id is distinct from v_tx.id or v_admission.currentness is distinct from 'CURRENT'
     or v_admission.scope is distinct from 'DELEGABILITY_ONLY' or v_admission.execution_authority_granted is distinct from false
     or v_admission.execution_started is distinct from false or v_admission.readiness_state is distinct from 'READY' then
    raise exception 'D3_ADMISSION_NOT_CURRENT';
  end if;
  v_admission_hash := public.build002_canonical_sha256(jsonb_build_object(
    'authorityCommitId', v_admission.authority_commit_id, 'consequenceBoundary', v_admission.consequence_boundary,
    'currentDependencySnapshotHash', v_admission.current_dependency_snapshot_hash, 'currentness', v_admission.currentness,
    'evaluatorDefinitionHash', v_admission.evaluator_definition_hash, 'evaluatorSchemaVersion', v_admission.evaluator_schema_version,
    'evaluatorVersion', v_admission.evaluator_version, 'executionAuthorityGranted', false, 'executionStarted', false,
    'historicalDependencySnapshotHash', v_admission.historical_dependency_snapshot_hash, 'membershipId', v_admission.membership_id,
    'outcomeTransactionId', v_admission.outcome_transaction_id, 'ownerTenantId', v_admission.owner_tenant_id,
    'principalId', v_admission.principal_id, 'readinessContentHash', v_admission.readiness_content_hash,
    'readinessId', v_admission.readiness_id, 'readinessState', v_admission.readiness_state,
    'revalidatedAt', to_char(v_admission.revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'schemaVersion', v_admission.schema_version, 'scope', v_admission.scope));
  if lower(v_admission_hash) is distinct from lower(v_admission.admission_content_hash) then raise exception 'D3_ADMISSION_HASH_INVALID'; end if;
  if v_d4.delegability_admission_content_hash is distinct from v_admission.admission_content_hash then raise exception 'EXECUTION_AUTHORITY_IDENTITY_MISMATCH'; end if;

  select * into v_commit from public.build002_readiness_authority_commits where id = v_d4.authority_commit_id for share;
  if not found or v_commit.owner_tenant_id is distinct from v_tenant or v_commit.principal_id is distinct from p_principal_id
     or v_commit.outcome_transaction_id is distinct from v_tx.id or v_commit.readiness_id is distinct from v_admission.readiness_id
     or v_commit.readiness_content_hash is distinct from v_admission.readiness_content_hash
     or v_commit.dependency_snapshot_hash is distinct from v_admission.current_dependency_snapshot_hash then
    raise exception 'EXECUTION_AUTHORITY_IDENTITY_MISMATCH';
  end if;
  select * into v_snapshot from public.build002_dependency_snapshots
   where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id
     and dependency_snapshot_hash = v_admission.current_dependency_snapshot_hash for share;
  if not found then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  select * into v_readiness from public.build002_delegation_readiness
   where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id and id = v_admission.readiness_id for share;
  if not found or v_readiness.state is distinct from 'READY' or v_readiness.readiness_content_hash is distinct from v_admission.readiness_content_hash
     or v_readiness.dependency_snapshot_hash is distinct from v_admission.current_dependency_snapshot_hash
     or (v_readiness.valid_until is not null and v_readiness.valid_until <= v_now) then raise exception 'READINESS_NOT_CURRENT'; end if;

  -- Rebuild the current mutable signal universe under the same canonical locks as D4.
  lock table public.build002_signal_requirements in share mode;
  lock table public.build002_signals in share mode;
  lock table public.build002_dependency_snapshots in share mode;
  lock table public.build002_signal_qualifications in share mode;
  lock table public.build002_delegation_readiness in share mode;
  select coalesce(jsonb_agg(jsonb_build_object('requirementId', requirement_id, 'signalId', signal_id::text, 'contentHash', content_hash) order by requirement_id, signal_id::text, content_hash), '[]'::jsonb)
    into v_current_refs from public.build002_signals where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id;
  if v_current_refs is distinct from coalesce((select jsonb_agg(x.value order by x.value) from jsonb_array_elements(v_snapshot.signal_references) x(value)), '[]'::jsonb) then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  select coalesce(jsonb_agg(requirement_definition_hash order by requirement_definition_hash), '[]'::jsonb)
    into v_current_reqs from public.build002_signal_requirements where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id;
  if v_current_reqs is distinct from coalesce((select jsonb_agg(x.value order by x.value) from jsonb_array_elements(v_snapshot.requirement_definition_hashes) x(value)), '[]'::jsonb) then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;

  v_transaction_hash := public.build002_canonical_sha256(jsonb_build_object('schemaVersion', 'build002-transaction-semantic-binding-v0.1', 'ownerTenantId', v_tenant, 'transactionId', v_tx.id, 'projectId', v_tx.project_id, 'assetId', v_tx.asset_id, 'baseVersionId', v_tx.base_version_id, 'rawRequest', v_tx.raw_request));
  v_source_hash := public.build002_canonical_sha256(jsonb_build_object('schemaVersion', 'build002-source-asset-version-binding-v0.1', 'ownerTenantId', v_tenant, 'assetId', v_asset.id, 'versionId', v_version.id, 'versionNumber', v_version.version_number, 'parentVersionId', v_version.parent_version_id, 'state', v_version.state));
  if v_snapshot.transaction_semantic_hash is distinct from v_transaction_hash or v_snapshot.source_asset_version_hash is distinct from v_source_hash then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  if v_d4.source_asset_version_hash is distinct from v_source_hash then raise exception 'SOURCE_ASSET_VERSION_CHANGED'; end if;

  select * into v_binding from public.outcome_transaction_requirement_bindings where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id for share;
  if not found or v_binding.blueprint_id is distinct from v_d4.blueprint_id or v_binding.blueprint_version is distinct from v_d4.blueprint_version or v_binding.blueprint_hash is distinct from v_d4.blueprint_hash then raise exception 'C0_BINDING_INVALID'; end if;
  select * into v_profile from public.outcome_requirement_profiles where id = v_binding.requirement_profile_id and version = v_binding.requirement_profile_version and hash = v_binding.requirement_profile_hash and status = 'PUBLISHED' for share;
  select * into v_blueprint from public.outcome_blueprints where id = v_binding.blueprint_id and version = v_binding.blueprint_version and hash = v_binding.blueprint_hash and status = 'PUBLISHED' for share;
  if v_profile.id is null or v_blueprint.id is null then raise exception 'C0_BINDING_INVALID'; end if;

  select * into v_field from public.field_outcomes where transaction_id = v_tx.id and owner_tenant_id = v_tenant and task_spec_id = v_d4.task_spec_id for share;
  if not found then raise exception 'TASK_SPEC_AUTHORITY_NOT_FOUND'; end if;
  v_spec := v_field.task_spec_snapshot;
  if jsonb_typeof(v_spec) is distinct from 'object' or v_spec->>'schemaVersion' is distinct from 'task-spec-v0.1'
     or v_spec->>'id' is distinct from v_d4.task_spec_id::text or lower(v_spec->>'hash') is distinct from lower(v_d4.task_spec_hash)
     or v_field.task_spec_version is distinct from v_d4.task_spec_version or v_field.blueprint_id is distinct from v_d4.blueprint_id
     or v_field.blueprint_version is distinct from v_d4.blueprint_version or v_field.blueprint_hash is distinct from v_d4.blueprint_hash
     or (v_spec->'source'->>'assetId')::uuid is distinct from v_asset.id or (v_spec->'source'->>'versionId')::uuid is distinct from v_version.id
     or public.build002_canonical_sha256(v_spec - 'id' - 'hash' - 'createdAt') is distinct from lower(v_d4.task_spec_hash) then
    raise exception 'TASK_SPEC_AUTHORITY_INVALID';
  end if;
  v_caps_hash := public.build002_canonical_sha256(v_d4.capability_grant);
  if lower(v_caps_hash) is distinct from lower(v_d4.capability_grant_hash) then raise exception 'EXECUTION_AUTHORITY_READBACK_FAILED'; end if;

  -- R0 patch binding: the exact path must be present in the immutable TaskSpec
  -- value set and in the current semantic patch/intent pair. No prefix or
  -- caller category can widen this set.
  if not exists (select 1 from jsonb_array_elements(v_spec->'values') item where item->>'id' = p_target_path and coalesce((item->>'critical')::boolean, true) = false and item->>'provenance' <> 'UNKNOWN')
     or not exists (select 1 from public.transaction_patches p join public.partial_intents i on i.id = p.partial_intent_id
                    where p.transaction_id = v_tx.id and p.target_path = p_target_path and i.target_path = p_target_path
                      and p.operation in ('SET_ATTRIBUTE','ADJUST_ATTRIBUTE') and i.operation in ('SET_ATTRIBUTE','ADJUST_ATTRIBUTE')) then
    raise exception 'PATCH_NOT_AUTHORIZED_BY_TASK_SPEC';
  end if;

  v_d4_hash := public.build002_canonical_sha256(jsonb_build_object(
    'assetId', v_d4.asset_id, 'authorityCommitId', v_d4.authority_commit_id, 'blueprintHash', v_d4.blueprint_hash, 'blueprintId', v_d4.blueprint_id, 'blueprintVersion', v_d4.blueprint_version,
    'capabilityGrant', v_d4.capability_grant, 'capabilityGrantHash', v_d4.capability_grant_hash, 'consequenceBoundary', v_d4.consequence_boundary,
    'currentDependencySnapshotHash', v_d4.current_dependency_snapshot_hash, 'delegabilityAdmissionContentHash', v_d4.delegability_admission_content_hash, 'delegabilityAdmissionId', v_d4.delegability_admission_id,
    'delegabilityRevalidatedAt', to_char(v_d4.delegability_revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'executionAuthorityRevalidatedAt', to_char(v_d4.execution_authority_revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'executionStarted', v_d4.execution_started, 'evaluatorDefinitionHash', v_d4.evaluator_definition_hash, 'evaluatorSchemaVersion', v_d4.evaluator_schema_version, 'evaluatorVersion', v_d4.evaluator_version,
    'historicalDependencySnapshotHash', v_d4.historical_dependency_snapshot_hash, 'membershipId', v_d4.membership_id, 'mutationLeaseGranted', v_d4.mutation_lease_granted,
    'outcomeTransactionId', v_d4.outcome_transaction_id, 'ownerTenantId', v_d4.owner_tenant_id, 'principalId', v_d4.principal_id, 'sourceAssetVersionHash', v_d4.source_asset_version_hash,
    'sourceAssetVersionId', v_d4.source_asset_version_id, 'scope', v_d4.scope, 'schemaVersion', v_d4.schema_version, 'taskSpecHash', v_d4.task_spec_hash, 'taskSpecId', v_d4.task_spec_id, 'taskSpecVersion', v_d4.task_spec_version,
    'validUntil', case when v_d4.valid_until is null then null else to_char(v_d4.valid_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end));
  if lower(v_d4_hash) is distinct from lower(v_d4.execution_authority_content_hash) then raise exception 'EXECUTION_AUTHORITY_READBACK_FAILED'; end if;
  if v_d4.valid_until is null or v_d4.valid_until <= v_now then raise exception 'EXECUTION_AUTHORITY_EXPIRED'; end if;
  v_valid_until := least(v_d4.valid_until, v_now + interval '5 minutes');
  v_revalidated_iso := to_char(v_now at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_key := v_d4.execution_authority_id::text || ':' || p_target_path || ':MUTABLE';

  select * into v_existing from public.build002_mutation_leases where execution_authority_id = v_d4.execution_authority_id and target_path = p_target_path and category = 'MUTABLE' for share;
  if found then
    if v_existing.owner_tenant_id is distinct from v_tenant or v_existing.execution_authority_content_hash is distinct from v_d4.execution_authority_content_hash
       or v_existing.mutation_lease_content_hash is null then raise exception 'MUTATION_LEASE_READBACK_FAILED'; end if;
    if lower(public.build002_canonical_sha256(jsonb_build_object(
      'assetId', v_existing.asset_id, 'authorityCommitId', v_existing.authority_commit_id, 'blueprintHash', v_existing.blueprint_hash, 'blueprintId', v_existing.blueprint_id, 'blueprintVersion', v_existing.blueprint_version,
      'capabilityGrantHash', v_existing.capability_grant_hash, 'consequenceBoundary', v_existing.consequence_boundary, 'currentDependencySnapshotHash', v_existing.current_dependency_snapshot_hash,
      'delegabilityAdmissionId', v_existing.delegability_admission_id, 'executionAuthorityId', v_existing.execution_authority_id, 'executionAuthorityContentHash', v_existing.execution_authority_content_hash, 'executionAuthorityRevalidatedAt', to_char(v_existing.execution_authority_revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'executionStarted', v_existing.execution_started, 'membershipId', v_existing.membership_id, 'mutationLeaseRevalidatedAt', to_char(v_existing.mutation_lease_revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'outcomeTransactionId', v_existing.outcome_transaction_id, 'ownerTenantId', v_existing.owner_tenant_id, 'principalId', v_existing.principal_id, 'scope', v_existing.scope, 'schemaVersion', v_existing.schema_version,
      'sourceAssetVersionHash', v_existing.source_asset_version_hash, 'sourceAssetVersionId', v_existing.source_asset_version_id, 'targetPath', v_existing.target_path, 'taskSpecHash', v_existing.task_spec_hash, 'taskSpecId', v_existing.task_spec_id, 'taskSpecVersion', v_existing.task_spec_version,
       'blueprintHash', v_existing.blueprint_hash, 'validUntil', to_char(v_existing.valid_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'category', v_existing.category))) is distinct from lower(v_existing.mutation_lease_content_hash) then
      raise exception 'MUTATION_LEASE_READBACK_FAILED';
    end if;
    return jsonb_build_object('mutation_lease_id', v_existing.mutation_lease_id, 'mutation_lease_content_hash', v_existing.mutation_lease_content_hash, 'granted_at', v_existing.granted_at);
  end if;

  v_content_hash := public.build002_canonical_sha256(jsonb_build_object(
    'assetId', v_asset.id, 'authorityCommitId', v_d4.authority_commit_id, 'blueprintHash', v_d4.blueprint_hash, 'blueprintId', v_d4.blueprint_id, 'blueprintVersion', v_d4.blueprint_version,
    'capabilityGrantHash', v_d4.capability_grant_hash, 'consequenceBoundary', 'FRESH_PREEXECUTION_RECHECK_AND_EXECUTION_START_REQUIRED', 'currentDependencySnapshotHash', v_d4.current_dependency_snapshot_hash,
    'delegabilityAdmissionId', v_d4.delegability_admission_id, 'executionAuthorityId', v_d4.execution_authority_id, 'executionAuthorityContentHash', v_d4.execution_authority_content_hash, 'executionAuthorityRevalidatedAt', to_char(v_d4.execution_authority_revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'executionStarted', false, 'membershipId', v_membership.id, 'mutationLeaseRevalidatedAt', v_revalidated_iso, 'outcomeTransactionId', v_tx.id, 'ownerTenantId', v_tenant, 'principalId', p_principal_id,
    'scope', 'MUTATION_LEASE_ONLY', 'schemaVersion', 'build002-mutation-lease-v0.1', 'sourceAssetVersionHash', v_source_hash, 'sourceAssetVersionId', v_version.id,
    'targetPath', p_target_path, 'taskSpecHash', v_d4.task_spec_hash, 'taskSpecId', v_d4.task_spec_id, 'taskSpecVersion', v_d4.task_spec_version, 'validUntil', to_char(v_valid_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'category', 'MUTABLE'));
  perform set_config('build002.mutation_lease', (select token from public.build002_mutation_lease_capability limit 1), true);
  insert into public.build002_mutation_leases(mutation_lease_id,schema_version,owner_tenant_id,principal_id,membership_id,execution_authority_id,execution_authority_content_hash,delegability_admission_id,authority_commit_id,outcome_transaction_id,asset_id,source_asset_version_id,source_asset_version_hash,task_spec_id,task_spec_version,task_spec_hash,blueprint_id,blueprint_version,blueprint_hash,current_dependency_snapshot_hash,capability_grant_hash,target_path,category,scope,execution_started,execution_authority_revalidated_at,mutation_lease_revalidated_at,granted_at,valid_until,consequence_boundary,mutation_lease_content_hash)
  values (v_id,'build002-mutation-lease-v0.1',v_tenant,p_principal_id,p_membership_id,v_d4.execution_authority_id,v_d4.execution_authority_content_hash,v_d4.delegability_admission_id,v_d4.authority_commit_id,v_tx.id,v_asset.id,v_version.id,v_source_hash,v_d4.task_spec_id,v_d4.task_spec_version,v_d4.task_spec_hash,v_d4.blueprint_id,v_d4.blueprint_version,v_d4.blueprint_hash,v_d4.current_dependency_snapshot_hash,v_d4.capability_grant_hash,p_target_path,'MUTABLE','MUTATION_LEASE_ONLY',false,v_d4.execution_authority_revalidated_at,v_now,v_now,v_valid_until,'FRESH_PREEXECUTION_RECHECK_AND_EXECUTION_START_REQUIRED',v_content_hash);
  return jsonb_build_object('mutation_lease_id', v_id, 'mutation_lease_content_hash', v_content_hash, 'granted_at', v_now);
exception when unique_violation then
  select * into v_existing from public.build002_mutation_leases where execution_authority_id = v_d4.execution_authority_id and target_path = p_target_path and category = 'MUTABLE' for share;
  if found then
    perform public.build002_validate_mutation_lease_row(v_existing.mutation_lease_id);
    return jsonb_build_object('mutation_lease_id', v_existing.mutation_lease_id, 'mutation_lease_content_hash', v_existing.mutation_lease_content_hash, 'granted_at', v_existing.granted_at);
  end if;
  raise;
end;
$$;

revoke all on function public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text) to service_role;
comment on table public.build002_mutation_leases is 'BUILD002-C1-D5-R0: canonical, short-lived mutation authority; separate from legacy public.mutation_leases.';
comment on function public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text) is 'BUILD002-C1-D5-R0: revalidates D4 and exact TaskSpec patch binding before issuing a mutation lease; no execution or provider side effect.';
