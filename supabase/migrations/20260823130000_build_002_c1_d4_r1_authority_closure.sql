-- BUILD 002-C1-D4-R1: close identity, currentness, hash and retry gaps from
-- R0.  This is deliberately forward-only: the R0 migration remains historical
-- evidence and is never edited.

create or replace function public.build002_canonical_json(p_value jsonb)
returns text
language plpgsql immutable strict
set search_path = pg_catalog, public
as $$
declare
  v_result text;
begin
  case jsonb_typeof(p_value)
    when 'null' then return 'null';
    when 'string', 'boolean', 'number' then return p_value::text;
    when 'array' then
      select '[' || coalesce(string_agg(public.build002_canonical_json(value), ',' order by ordinality), '') || ']'
        into v_result
        from jsonb_array_elements(p_value) with ordinality as a(value, ordinality);
      return v_result;
    when 'object' then
      select '{' || coalesce(string_agg(to_jsonb(key)::text || ':' || public.build002_canonical_json(value), ',' order by key), '') || '}'
        into v_result
        from jsonb_each(p_value) as o(key, value);
      return v_result;
  end case;
  raise exception 'BUILD002_CANONICAL_JSON_UNSUPPORTED';
end;
$$;

create or replace function public.build002_canonical_sha256(p_value jsonb)
returns text
language sql immutable strict
set search_path = pg_catalog, public
as $$
  select encode(digest(public.build002_canonical_json(p_value)::bytea, 'sha256'), 'hex')
$$;

revoke all on function public.build002_canonical_json(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.build002_canonical_sha256(jsonb) from public, anon, authenticated, service_role;

-- The validator is intentionally shared by the normal idempotent path and the
-- unique_violation path.  A retry never returns an unverified row.
create or replace function public.build002_validate_execution_authority_row(
  p_execution_authority_id uuid,
  p_idempotency_key text,
  p_owner_tenant_id uuid,
  p_principal_id uuid,
  p_membership_id uuid,
  p_admission_id uuid,
  p_task_spec_id uuid,
  p_task_spec_hash text,
  p_current_dependency_snapshot_hash text,
  p_capability_grant_hash text
)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  r record;
  v_hash text;
begin
  select * into r from public.build002_execution_authorities
   where execution_authority_id = p_execution_authority_id
     and idempotency_key = p_idempotency_key
   for share;
  if not found then raise exception 'EXECUTION_AUTHORITY_READBACK_FAILED'; end if;
  if r.schema_version is distinct from 'build002-execution-authority-v0.1'
     or r.owner_tenant_id is distinct from p_owner_tenant_id
     or r.principal_id is distinct from p_principal_id
     or r.membership_id is distinct from p_membership_id
     or r.delegability_admission_id is distinct from p_admission_id
     or r.task_spec_id is distinct from p_task_spec_id
     or lower(r.task_spec_hash) is distinct from lower(p_task_spec_hash)
     or lower(r.current_dependency_snapshot_hash) is distinct from lower(p_current_dependency_snapshot_hash)
     or lower(r.capability_grant_hash) is distinct from lower(p_capability_grant_hash)
     or r.scope is distinct from 'EXECUTION_AUTHORITY_ONLY'
     or r.mutation_lease_granted is distinct from false
     or r.execution_started is distinct from false
     or r.consequence_boundary is distinct from 'FRESH_MUTATION_LEASE_AND_PREEXECUTION_RECHECK_REQUIRED'
     or r.execution_authority_content_hash is null then
    raise exception 'EXECUTION_AUTHORITY_READBACK_FAILED';
  end if;
  v_hash := public.build002_canonical_sha256(jsonb_build_object(
    'assetId', r.asset_id,
    'authorityCommitId', r.authority_commit_id,
    'blueprintHash', r.blueprint_hash,
    'blueprintId', r.blueprint_id,
    'blueprintVersion', r.blueprint_version,
    'capabilityGrant', r.capability_grant,
    'capabilityGrantHash', r.capability_grant_hash,
    'consequenceBoundary', r.consequence_boundary,
    'currentDependencySnapshotHash', r.current_dependency_snapshot_hash,
    'delegabilityAdmissionContentHash', r.delegability_admission_content_hash,
    'delegabilityAdmissionId', r.delegability_admission_id,
    'delegabilityRevalidatedAt', to_char(r.delegability_revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'executionAuthorityRevalidatedAt', to_char(r.execution_authority_revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'executionStarted', r.execution_started,
    'evaluatorDefinitionHash', r.evaluator_definition_hash,
    'evaluatorSchemaVersion', r.evaluator_schema_version,
    'evaluatorVersion', r.evaluator_version,
    'historicalDependencySnapshotHash', r.historical_dependency_snapshot_hash,
    'membershipId', r.membership_id,
    'mutationLeaseGranted', r.mutation_lease_granted,
    'outcomeTransactionId', r.outcome_transaction_id,
    'ownerTenantId', r.owner_tenant_id,
    'principalId', r.principal_id,
    'sourceAssetVersionHash', r.source_asset_version_hash,
    'sourceAssetVersionId', r.source_asset_version_id,
    'scope', r.scope,
    'schemaVersion', r.schema_version,
    'taskSpecHash', r.task_spec_hash,
    'taskSpecId', r.task_spec_id,
    'taskSpecVersion', r.task_spec_version,
    'validUntil', case when r.valid_until is null then null else to_char(r.valid_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end
  ));
  if lower(v_hash) is distinct from lower(r.execution_authority_content_hash) then
    raise exception 'EXECUTION_AUTHORITY_READBACK_FAILED';
  end if;
end;
$$;

revoke all on function public.build002_validate_execution_authority_row(uuid,text,uuid,uuid,uuid,uuid,uuid,text,text,text) from public, anon, authenticated, service_role;

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
  v_profile record;
  v_blueprint record;
  v_commit record;
  v_admission record;
  v_snapshot record;
  v_readiness record;
  v_field record;
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
  v_transaction_hash text;
  v_source_hash text;
  v_admission_hash text;
begin
  if p_principal_id is null or p_membership_id is null or p_admission_id is null or p_task_spec_id is null
     or p_task_spec_hash is null or p_task_spec_hash !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'EXECUTION_AUTHORITY_SCOPE_INVALID';
  end if;

  -- The identity chain is checked before any positive row can be emitted.
  select tenant_id into v_tenant from public.tenant_memberships where id = p_membership_id and principal_id = p_principal_id;
  if not found then raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID'; end if;
  perform 1 from public.tenants where id = v_tenant and status = 'ACTIVE' for update;
  if not found then raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID'; end if;
  select * into v_membership from public.tenant_memberships where id = p_membership_id and tenant_id = v_tenant and principal_id = p_principal_id for update;
  if not found or v_membership.status is distinct from 'ACTIVE' then raise exception 'READINESS_AUTHORITY_MEMBERSHIP_INVALID'; end if;

  select * into v_admission from public.build002_delegability_admissions where admission_id = p_admission_id for update;
  if not found or v_admission.owner_tenant_id is distinct from v_tenant
     or v_admission.principal_id is distinct from p_principal_id
     or v_admission.membership_id is distinct from p_membership_id then
    raise exception 'EXECUTION_AUTHORITY_IDENTITY_MISMATCH';
  end if;
  select * into v_tx from public.outcome_transactions where id = v_admission.outcome_transaction_id and owner_tenant_id = v_tenant for update;
  if not found or v_tx.status is distinct from 'PREPARED' then raise exception 'EXECUTION_AUTHORITY_TRANSACTION_NOT_PREPARED'; end if;
  select * into v_commit from public.build002_readiness_authority_commits where id = v_admission.authority_commit_id for update;
  if not found or v_commit.owner_tenant_id is distinct from v_tenant
     or v_commit.principal_id is distinct from p_principal_id
     or v_commit.outcome_transaction_id is distinct from v_tx.id
     or v_commit.dependency_snapshot_hash is distinct from v_admission.current_dependency_snapshot_hash
     or v_commit.readiness_id is distinct from v_admission.readiness_id
     or v_commit.readiness_content_hash is distinct from v_admission.readiness_content_hash then
    raise exception 'EXECUTION_AUTHORITY_IDENTITY_MISMATCH';
  end if;
  if v_admission.authority_commit_id is distinct from v_commit.id
     or v_admission.outcome_transaction_id is distinct from v_tx.id then
    raise exception 'EXECUTION_AUTHORITY_IDENTITY_MISMATCH';
  end if;
  select * into v_asset from public.assets where id = v_tx.asset_id and owner_tenant_id = v_tenant for update;
  if not found or v_asset.project_id is distinct from v_tx.project_id or v_asset.current_version_id is distinct from v_tx.base_version_id then raise exception 'SOURCE_ASSET_HEAD_CHANGED'; end if;
  select * into v_version from public.asset_versions where id = v_tx.base_version_id and asset_id = v_asset.id and owner_tenant_id = v_tenant for update;
  if not found then raise exception 'SOURCE_ASSET_VERSION_CHANGED'; end if;
  if v_version.asset_id is distinct from v_asset.id or v_version.owner_tenant_id is distinct from v_tenant then raise exception 'SOURCE_ASSET_VERSION_CHANGED'; end if;
  select * into v_binding from public.outcome_transaction_requirement_bindings where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id for update;
  if not found or v_binding.policy_id is not null or v_binding.policy_hash is not null then raise exception 'C0_BINDING_INVALID'; end if;
  select * into v_profile from public.outcome_requirement_profiles
   where id = v_binding.requirement_profile_id and version = v_binding.requirement_profile_version and hash = v_binding.requirement_profile_hash and status = 'PUBLISHED' for share;
  if not found or v_profile.blueprint_id is distinct from v_binding.blueprint_id
     or v_profile.blueprint_version is distinct from v_binding.blueprint_version
     or v_profile.blueprint_hash is distinct from v_binding.blueprint_hash then raise exception 'C0_BINDING_INVALID'; end if;
  select * into v_blueprint from public.outcome_blueprints where id = v_binding.blueprint_id and version = v_binding.blueprint_version and hash = v_binding.blueprint_hash and status = 'PUBLISHED' for share;
  if not found then raise exception 'C0_BINDING_INVALID'; end if;

  select * into v_admission from public.build002_delegability_admissions where admission_id = p_admission_id and owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id for update;
  if not found or v_admission.currentness is distinct from 'CURRENT' or v_admission.scope is distinct from 'DELEGABILITY_ONLY'
     or v_admission.execution_authority_granted is distinct from false or v_admission.execution_started is distinct from false
     or v_admission.readiness_state is distinct from 'READY' then raise exception 'D3_ADMISSION_NOT_CURRENT'; end if;
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
  if v_admission.owner_tenant_id is distinct from v_tenant or v_admission.principal_id is distinct from p_principal_id
     or v_admission.membership_id is distinct from p_membership_id or v_admission.outcome_transaction_id is distinct from v_tx.id then
    raise exception 'EXECUTION_AUTHORITY_IDENTITY_MISMATCH';
  end if;
  select * into v_snapshot from public.build002_dependency_snapshots where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id and dependency_snapshot_hash = v_admission.current_dependency_snapshot_hash for share;
  if not found then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  select * into v_readiness from public.build002_delegation_readiness where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id and id = v_admission.readiness_id for share;
  if not found or v_readiness.readiness_content_hash is distinct from v_admission.readiness_content_hash
     or v_readiness.dependency_snapshot_hash is distinct from v_admission.current_dependency_snapshot_hash
     or v_readiness.evaluator->>'schemaVersion' is distinct from v_admission.evaluator_schema_version
     or v_readiness.evaluator->>'version' is distinct from v_admission.evaluator_version
     or v_readiness.evaluator->>'definitionHash' is distinct from v_admission.evaluator_definition_hash
     or v_readiness.state is distinct from 'READY' or (v_readiness.valid_until is not null and v_readiness.valid_until <= v_now) then raise exception 'READINESS_NOT_CURRENT'; end if;
  if v_admission.revalidated_at < v_readiness.created_at or v_admission.revalidated_at > v_now then raise exception 'D3_REVALIDATION_TIME_INVALID'; end if;

  -- Lock the complete mutable universe before deriving the current snapshot.
  lock table public.build002_signal_requirements in share mode;
  lock table public.build002_signals in share mode;
  lock table public.build002_dependency_snapshots in share mode;
  lock table public.build002_signal_qualifications in share mode;
  lock table public.build002_delegation_readiness in share mode;
  select coalesce(jsonb_agg(jsonb_build_object('requirementId', requirement_id, 'signalId', signal_id::text, 'contentHash', signal_content_hash) order by requirement_id, signal_id::text, signal_content_hash), '[]'::jsonb) into v_current_refs from public.build002_signals where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id;
  if v_current_refs is distinct from coalesce((select jsonb_agg(x.value order by x.value) from jsonb_array_elements(v_snapshot.signal_references) x(value)), '[]'::jsonb) then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  select coalesce(jsonb_agg(requirement_definition_hash order by requirement_definition_hash), '[]'::jsonb) into v_current_reqs from public.build002_signal_requirements where owner_tenant_id = v_tenant and outcome_transaction_id = v_tx.id;
  if v_current_reqs is distinct from coalesce((select jsonb_agg(x.value order by x.value) from jsonb_array_elements(v_snapshot.requirement_definition_hashes) x(value)), '[]'::jsonb) then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;

  v_transaction_hash := public.build002_canonical_sha256(jsonb_build_object('schemaVersion', 'build002-transaction-semantic-binding-v0.1', 'ownerTenantId', v_tenant, 'transactionId', v_tx.id, 'projectId', v_tx.project_id, 'assetId', v_tx.asset_id, 'baseVersionId', v_tx.base_version_id, 'rawRequest', v_tx.raw_request));
  v_source_hash := public.build002_canonical_sha256(jsonb_build_object('schemaVersion', 'build002-source-asset-version-binding-v0.1', 'ownerTenantId', v_tenant, 'assetId', v_asset.id, 'versionId', v_version.id, 'versionNumber', v_version.version_number, 'parentVersionId', v_version.parent_version_id, 'state', v_version.state));
  if v_snapshot.transaction_semantic_hash is distinct from v_transaction_hash or v_snapshot.source_asset_version_hash is distinct from v_source_hash then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  if v_snapshot.blueprint_hash is distinct from v_binding.blueprint_hash or v_snapshot.schema_version is distinct from 'build002-dependency-snapshot-v0.2' then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;
  if not exists (select 1 from jsonb_array_elements(v_snapshot.dependency_bindings) b where b->>'identity' = 'transaction.semantic' and b->>'hash' = v_transaction_hash)
     or not exists (select 1 from jsonb_array_elements(v_snapshot.dependency_bindings) b where b->>'identity' = 'asset.version' and b->>'hash' = v_source_hash)
     or not exists (select 1 from jsonb_array_elements(v_snapshot.dependency_bindings) b where b->>'identity' = 'blueprint' and b->>'hash' = v_binding.blueprint_hash) then raise exception 'CURRENTNESS_NOT_CURRENT'; end if;

  select * into v_field from public.field_outcomes where transaction_id = v_tx.id and owner_tenant_id = v_tenant and task_spec_id = p_task_spec_id and task_spec_hash = p_task_spec_hash for share;
  if not found then raise exception 'TASK_SPEC_AUTHORITY_NOT_FOUND'; end if;
  v_spec := v_field.task_spec_snapshot;
  if jsonb_typeof(v_spec) is distinct from 'object' or v_spec->>'schemaVersion' is distinct from 'task-spec-v0.1'
     or v_spec->>'id' is distinct from p_task_spec_id::text or v_spec->>'hash' is distinct from lower(p_task_spec_hash)
     or v_spec->>'transactionId' is distinct from v_tx.id::text or v_spec->>'status' is distinct from 'READY'
     or v_field.source_version_id is distinct from v_version.id or v_field.task_spec_version is distinct from (v_spec->>'version')::integer
     or v_field.blueprint_id is distinct from v_binding.blueprint_id or v_field.blueprint_version is distinct from v_binding.blueprint_version or v_field.blueprint_hash is distinct from v_binding.blueprint_hash
     or (v_spec->'source'->>'assetId')::uuid is distinct from v_tx.asset_id or (v_spec->'source'->>'versionId')::uuid is distinct from v_version.id
     or v_spec->'source'->>'sha256' is distinct from v_field.source_sha256 or (v_spec->'blueprint'->>'id')::uuid is distinct from v_binding.blueprint_id
     or (v_spec->'blueprint'->>'version')::integer is distinct from v_binding.blueprint_version or v_spec->'blueprint'->>'hash' is distinct from v_binding.blueprint_hash
     or (v_spec->'verificationPolicy'->>'requireSameSpecHash')::boolean is distinct from true or (v_spec->'verificationPolicy'->>'criticalUnknownBlocksCommit')::boolean is distinct from true
     or (v_spec->'verificationPolicy'->>'executorDoneIsEvidence')::boolean is distinct from false or v_spec->'securityProfile'->>'embeddedSecretPolicy' is distinct from 'FORBID'
     or exists (select 1 from jsonb_array_elements(v_spec->'values') item where (item->>'critical')::boolean = true and item->>'provenance' = 'UNKNOWN')
     or public.build002_canonical_sha256(v_spec - 'id' - 'hash' - 'createdAt') is distinct from lower(p_task_spec_hash) then raise exception 'TASK_SPEC_AUTHORITY_INVALID'; end if;
  if exists (select 1 from jsonb_array_elements_text(v_spec->'capabilityGrant') c(value) where not exists (select 1 from jsonb_array_elements_text(coalesce(v_blueprint.definition->'capabilityPolicy'->'required','[]'::jsonb) || coalesce(v_blueprint.definition->'capabilityPolicy'->'optional','[]'::jsonb)) allowed(value) where allowed.value = c.value)) then raise exception 'TASK_SPEC_CAPABILITY_NOT_ALLOWED'; end if;
  if (select count(*) from jsonb_array_elements_text(v_spec->'capabilityGrant')) <> (select count(distinct value) from jsonb_array_elements_text(v_spec->'capabilityGrant')) then raise exception 'TASK_SPEC_CAPABILITY_DUPLICATE'; end if;
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) into v_caps from jsonb_array_elements_text(v_spec->'capabilityGrant');
  v_capability_hash := public.build002_canonical_sha256(v_caps);
  v_key := v_tenant::text || ':' || v_admission.admission_id::text || ':' || p_principal_id::text || ':' || p_task_spec_hash || ':' || v_admission.current_dependency_snapshot_hash;

  select * into v_existing from public.build002_execution_authorities where idempotency_key = v_key;
  if found then
    perform public.build002_validate_execution_authority_row(v_existing.execution_authority_id, v_key, v_tenant, p_principal_id, p_membership_id, p_admission_id, p_task_spec_id, p_task_spec_hash, v_admission.current_dependency_snapshot_hash, v_capability_hash);
    return jsonb_build_object('execution_authority_id', v_existing.execution_authority_id, 'execution_authority_content_hash', v_existing.execution_authority_content_hash, 'granted_at', v_existing.granted_at);
  end if;

  perform set_config('build002.execution_authority', (select token from public.build002_execution_authority_capability limit 1), true);
  v_revalidated_iso := to_char(v_now at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_content_hash := public.build002_canonical_sha256(jsonb_build_object(
    'assetId', v_tx.asset_id, 'authorityCommitId', v_admission.authority_commit_id, 'blueprintHash', v_binding.blueprint_hash, 'blueprintId', v_binding.blueprint_id, 'blueprintVersion', v_binding.blueprint_version,
    'capabilityGrant', v_caps, 'capabilityGrantHash', v_capability_hash, 'consequenceBoundary', 'FRESH_MUTATION_LEASE_AND_PREEXECUTION_RECHECK_REQUIRED',
    'currentDependencySnapshotHash', v_admission.current_dependency_snapshot_hash, 'delegabilityAdmissionContentHash', v_admission.admission_content_hash, 'delegabilityAdmissionId', v_admission.admission_id,
    'delegabilityRevalidatedAt', to_char(v_admission.revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'executionAuthorityRevalidatedAt', v_revalidated_iso, 'executionStarted', false,
    'evaluatorDefinitionHash', v_readiness.evaluator->>'definitionHash', 'evaluatorSchemaVersion', v_readiness.evaluator->>'schemaVersion', 'evaluatorVersion', v_readiness.evaluator->>'version',
    'historicalDependencySnapshotHash', v_admission.historical_dependency_snapshot_hash, 'membershipId', p_membership_id, 'mutationLeaseGranted', false, 'outcomeTransactionId', v_tx.id, 'ownerTenantId', v_tenant, 'principalId', p_principal_id,
    'sourceAssetVersionHash', v_source_hash, 'sourceAssetVersionId', v_version.id, 'scope', 'EXECUTION_AUTHORITY_ONLY', 'schemaVersion', 'build002-execution-authority-v0.1', 'taskSpecHash', lower(p_task_spec_hash), 'taskSpecId', p_task_spec_id, 'taskSpecVersion', (v_spec->>'version')::integer,
    'validUntil', case when v_readiness.valid_until is null then null else to_char(v_readiness.valid_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end));
  insert into public.build002_execution_authorities(execution_authority_id, schema_version, owner_tenant_id, principal_id, membership_id, delegability_admission_id, delegability_admission_content_hash, authority_commit_id, outcome_transaction_id, asset_id, source_asset_version_id, source_asset_version_hash, task_spec_id, task_spec_version, task_spec_hash, blueprint_id, blueprint_version, blueprint_hash, capability_grant, capability_grant_hash, historical_dependency_snapshot_hash, current_dependency_snapshot_hash, evaluator_schema_version, evaluator_version, evaluator_definition_hash, scope, mutation_lease_granted, execution_started, consequence_boundary, delegability_revalidated_at, execution_authority_revalidated_at, granted_at, valid_until, execution_authority_content_hash, idempotency_key)
  values (v_id, 'build002-execution-authority-v0.1', v_tenant, p_principal_id, p_membership_id, p_admission_id, v_admission.admission_content_hash, v_admission.authority_commit_id, v_tx.id, v_tx.asset_id, v_version.id, v_source_hash, p_task_spec_id, (v_spec->>'version')::integer, lower(p_task_spec_hash), v_binding.blueprint_id, v_binding.blueprint_version, v_binding.blueprint_hash, v_caps, v_capability_hash, v_admission.historical_dependency_snapshot_hash, v_admission.current_dependency_snapshot_hash, v_readiness.evaluator->>'schemaVersion', v_readiness.evaluator->>'version', v_readiness.evaluator->>'definitionHash', 'EXECUTION_AUTHORITY_ONLY', false, false, 'FRESH_MUTATION_LEASE_AND_PREEXECUTION_RECHECK_REQUIRED', v_admission.revalidated_at, v_now, v_now, v_readiness.valid_until, v_content_hash, v_key);
  perform public.build002_validate_execution_authority_row(v_id, v_key, v_tenant, p_principal_id, p_membership_id, p_admission_id, p_task_spec_id, p_task_spec_hash, v_admission.current_dependency_snapshot_hash, v_capability_hash);
  return jsonb_build_object('execution_authority_id', v_id, 'execution_authority_content_hash', v_content_hash, 'granted_at', v_now);
exception when unique_violation then
  select * into v_existing from public.build002_execution_authorities where idempotency_key = v_key;
  if found then
    perform public.build002_validate_execution_authority_row(v_existing.execution_authority_id, v_key, v_tenant, p_principal_id, p_membership_id, p_admission_id, p_task_spec_id, p_task_spec_hash, v_admission.current_dependency_snapshot_hash, v_capability_hash);
    return jsonb_build_object('execution_authority_id', v_existing.execution_authority_id, 'execution_authority_content_hash', v_existing.execution_authority_content_hash, 'granted_at', v_existing.granted_at);
  end if;
  raise;
end;
$$;

revoke all on function public.build002_grant_execution_authority(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.build002_grant_execution_authority(uuid, uuid, uuid, uuid, text) to service_role;
comment on function public.build002_grant_execution_authority(uuid, uuid, uuid, uuid, text) is 'BUILD002-C1-D4-R1: identity-bound, currentness-bound, canonical-hash-bound authority issuance; retries validate the complete persisted row.';
