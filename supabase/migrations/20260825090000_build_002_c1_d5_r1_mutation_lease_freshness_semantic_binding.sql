-- BUILD 002-C1-D5-R1: close freshness and semantic patch-authority gaps.
-- R0 remains byte-identical. The R0 issuer is retained as a private delegate;
-- this public boundary validates the exact mutation before delegation.

alter function public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text)
  rename to build002_grant_mutation_lease_r0;

create or replace function public.build002_validate_mutation_lease_row(p_mutation_lease_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  r record;
  v_hash text;
begin
  select * into r
    from public.build002_mutation_leases
   where mutation_lease_id = p_mutation_lease_id
   for share;

  if not found
     or r.schema_version is distinct from 'build002-mutation-lease-v0.1'
     or r.scope is distinct from 'MUTATION_LEASE_ONLY'
     or r.category is distinct from 'MUTABLE'
     or r.execution_started is distinct from false
     or r.consequence_boundary is distinct from 'FRESH_PREEXECUTION_RECHECK_AND_EXECUTION_START_REQUIRED'
     or r.valid_until is null
     or r.valid_until <= clock_timestamp()
     or r.mutation_lease_content_hash is null then
    if found and r.valid_until is not null and r.valid_until <= clock_timestamp() then
      raise exception 'MUTATION_LEASE_EXPIRED';
    end if;
    raise exception 'MUTATION_LEASE_READBACK_FAILED';
  end if;

  v_hash := public.build002_canonical_sha256(jsonb_build_object(
    'assetId', r.asset_id, 'authorityCommitId', r.authority_commit_id,
    'blueprintHash', r.blueprint_hash, 'blueprintId', r.blueprint_id,
    'blueprintVersion', r.blueprint_version, 'capabilityGrantHash', r.capability_grant_hash,
    'consequenceBoundary', r.consequence_boundary,
    'currentDependencySnapshotHash', r.current_dependency_snapshot_hash,
    'delegabilityAdmissionId', r.delegability_admission_id,
    'executionAuthorityId', r.execution_authority_id,
    'executionAuthorityContentHash', r.execution_authority_content_hash,
    'executionAuthorityRevalidatedAt', to_char(r.execution_authority_revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'executionStarted', r.execution_started, 'membershipId', r.membership_id,
    'mutationLeaseRevalidatedAt', to_char(r.mutation_lease_revalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'outcomeTransactionId', r.outcome_transaction_id, 'ownerTenantId', r.owner_tenant_id,
    'principalId', r.principal_id, 'scope', r.scope, 'schemaVersion', r.schema_version,
    'sourceAssetVersionHash', r.source_asset_version_hash,
    'sourceAssetVersionId', r.source_asset_version_id, 'targetPath', r.target_path,
    'taskSpecHash', r.task_spec_hash, 'taskSpecId', r.task_spec_id,
    'taskSpecVersion', r.task_spec_version,
    'validUntil', to_char(r.valid_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'category', r.category));
  if lower(v_hash) is distinct from lower(r.mutation_lease_content_hash) then
    raise exception 'MUTATION_LEASE_READBACK_FAILED';
  end if;
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
  v_tx uuid;
  v_task_spec_id uuid;
  v_spec jsonb;
  v_value jsonb;
  v_patch record;
  v_existing uuid;
  v_value_count integer;
  v_patch_count integer;
begin
  if p_principal_id is null or p_membership_id is null or p_execution_authority_id is null
     or p_target_path is null or btrim(p_target_path) = '' or p_category is distinct from 'MUTABLE'
     or p_target_path like '%*%' or p_target_path like '%[%]%' or p_target_path like '%..%'
     or p_target_path like '.%' or p_target_path like '%.' then
    raise exception 'MUTATION_LEASE_SCOPE_INVALID';
  end if;
  p_target_path := btrim(p_target_path);

  -- Freeze the semantic inputs for the whole delegated transaction. This makes
  -- the exact binding checked here the same binding consumed by the R0 issuer.
  lock table public.field_outcomes in share mode;
  lock table public.transaction_patches in share mode;
  lock table public.partial_intents in share mode;

  select m.tenant_id, d4.outcome_transaction_id, d4.task_spec_id
    into v_tenant, v_tx, v_task_spec_id
    from public.tenant_memberships m
    join public.build002_execution_authorities d4
      on d4.membership_id = m.id
   where m.id = p_membership_id
     and m.principal_id = p_principal_id
     and d4.execution_authority_id = p_execution_authority_id;
  if not found then raise exception 'EXECUTION_AUTHORITY_IDENTITY_MISMATCH'; end if;

  -- An expired immutable row is historical evidence, never current authority.
  select mutation_lease_id into v_existing
    from public.build002_mutation_leases
   where execution_authority_id = p_execution_authority_id
     and target_path = p_target_path
     and category = 'MUTABLE'
   for share;
  if found then
    perform public.build002_validate_mutation_lease_row(v_existing);
  end if;

  select task_spec_snapshot into v_spec
    from public.field_outcomes
   where transaction_id = v_tx
     and task_spec_id = v_task_spec_id
   for share;
  if not found or jsonb_typeof(v_spec) is distinct from 'object' then
    raise exception 'TASK_SPEC_AUTHORITY_NOT_FOUND';
  end if;

  select count(*)::integer
    into v_value_count
    from jsonb_array_elements(coalesce(v_spec->'values', '[]'::jsonb)) item
   where item->>'id' = p_target_path
     and item->>'provenance' is not null
     and item->>'provenance' <> 'UNKNOWN'
     and item ? 'value';
  if v_value_count <> 1 then raise exception 'PATCH_NOT_AUTHORIZED_BY_TASK_SPEC'; end if;
  select item->'value' into v_value
    from jsonb_array_elements(coalesce(v_spec->'values', '[]'::jsonb)) item
   where item->>'id' = p_target_path
     and item->>'provenance' is not null
     and item->>'provenance' <> 'UNKNOWN'
     and item ? 'value';

  select count(*)::integer into v_patch_count
    from public.transaction_patches p
    join public.partial_intents i on i.id = p.partial_intent_id
   where p.transaction_id = v_tx
     and i.transaction_id = v_tx
     and p.target_path = p_target_path
     and i.target_path = p_target_path;
  if v_patch_count <> 1 then raise exception 'PATCH_NOT_AUTHORIZED_BY_TASK_SPEC'; end if;

  select p.*, i.operation as intent_operation, i.desired_value
    into v_patch
    from public.transaction_patches p
    join public.partial_intents i on i.id = p.partial_intent_id
   where p.transaction_id = v_tx
     and i.transaction_id = v_tx
     and p.target_path = p_target_path
     and i.target_path = p_target_path
   for share;
  if v_patch.operation is distinct from v_patch.intent_operation
     or v_patch.operation is distinct from 'SET_ATTRIBUTE'
     or not (v_patch.parameters ? 'value')
     or v_patch.parameters->'value' is distinct from v_patch.desired_value
     or v_patch.desired_value is distinct from v_value then
    raise exception 'PATCH_NOT_AUTHORIZED_BY_TASK_SPEC';
  end if;

  -- ADJUST_ATTRIBUTE has no authoritative delta representation in TaskSpec;
  -- it is deliberately fail-closed until a reviewed semantic contract exists.
  return public.build002_grant_mutation_lease_r0(
    p_principal_id, p_membership_id, p_execution_authority_id, p_target_path, p_category);
end;
$$;
revoke all on function public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text) to service_role;
revoke all on function public.build002_grant_mutation_lease_r0(uuid,uuid,uuid,text,text) from public, anon, authenticated, service_role;

comment on function public.build002_grant_mutation_lease(uuid,uuid,uuid,text,text) is
  'BUILD002-C1-D5-R1: rejects expired lease reuse and binds exact SET_ATTRIBUTE patch value/operation to the authoritative TaskSpec before delegating to R0.';
