-- BUILD 002-C1-D6-R2: exact execution-attempt reservation and atomic provider admission.
-- D5 leases remain immutable authority/currentness evidence. D6 adds separate,
-- immutable reservations and append-only single-use consumption records.

create table if not exists public.build002_d6_write_capability (
  token uuid primary key default gen_random_uuid()
);
insert into public.build002_d6_write_capability default values on conflict do nothing;
revoke all on table public.build002_d6_write_capability from public, anon, authenticated, service_role;

create table if not exists public.build002_execution_attempt_reservations (
  reservation_id uuid primary key,
  schema_version text not null check (schema_version = 'build002-execution-attempt-reservation-v0.1'),
  execution_attempt_id uuid not null unique,
  owner_tenant_id uuid not null references public.tenants(id) on delete restrict,
  principal_id uuid not null references auth.users(id) on delete restrict,
  membership_id uuid not null references public.tenant_memberships(id) on delete restrict,
  mutation_lease_id uuid not null unique references public.build002_mutation_leases(mutation_lease_id) on delete restrict,
  mutation_lease_content_hash text not null check (mutation_lease_content_hash ~ '^[a-f0-9]{64}$'),
  authority_commit_id uuid not null references public.build002_readiness_authority_commits(id) on delete restrict,
  delegability_admission_id uuid not null references public.build002_delegability_admissions(admission_id) on delete restrict,
  execution_authority_id uuid not null references public.build002_execution_authorities(execution_authority_id) on delete restrict,
  execution_authority_content_hash text not null check (execution_authority_content_hash ~ '^[a-f0-9]{64}$'),
  outcome_transaction_id uuid not null references public.outcome_transactions(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete restrict,
  source_asset_version_id uuid not null references public.asset_versions(id) on delete restrict,
  source_asset_version_hash text not null check (source_asset_version_hash ~ '^[a-f0-9]{64}$'),
  task_spec_id uuid not null,
  task_spec_version integer not null check (task_spec_version > 0),
  task_spec_hash text not null check (task_spec_hash ~ '^[a-f0-9]{64}$'),
  d5_target_path text not null check (btrim(d5_target_path) <> ''),
  provider_target_path text not null check (provider_target_path = 'media.pixels'),
  operation text not null check (operation = 'EDIT_REGION'),
  operation_value jsonb not null check (jsonb_typeof(operation_value) = 'object'),
  operation_value_hash text not null check (operation_value_hash ~ '^[a-f0-9]{64}$'),
  operation_binding_hash text not null check (operation_binding_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null,
  valid_until timestamptz not null check (valid_until > created_at),
  scope text not null check (scope = 'FIELD_BETA_PROVIDER_ADMISSION_ONLY'),
  consequence_boundary text not null check (consequence_boundary = 'ATOMIC_CONSUMPTION_REQUIRED_IMMEDIATELY_BEFORE_PROVIDER'),
  reservation_content_hash text not null check (reservation_content_hash ~ '^[a-f0-9]{64}$'),
  foreign key (owner_tenant_id, outcome_transaction_id)
    references public.outcome_transactions(owner_tenant_id, id) on delete restrict
);

create unique index if not exists build002_execution_attempt_reservations_pair_uidx
  on public.build002_execution_attempt_reservations(reservation_id, execution_attempt_id);

create table if not exists public.build002_execution_attempt_consumptions (
  consumption_id uuid primary key,
  schema_version text not null check (schema_version = 'build002-reservation-consumption-v0.1'),
  reservation_id uuid not null unique references public.build002_execution_attempt_reservations(reservation_id) on delete restrict,
  execution_attempt_id uuid not null unique,
  owner_tenant_id uuid not null references public.tenants(id) on delete restrict,
  mutation_lease_id uuid not null references public.build002_mutation_leases(mutation_lease_id) on delete restrict,
  execution_authority_id uuid not null references public.build002_execution_authorities(execution_authority_id) on delete restrict,
  authority_commit_id uuid not null references public.build002_readiness_authority_commits(id) on delete restrict,
  task_spec_hash text not null check (task_spec_hash ~ '^[a-f0-9]{64}$'),
  operation_binding_hash text not null check (operation_binding_hash ~ '^[a-f0-9]{64}$'),
  reservation_content_hash text not null check (reservation_content_hash ~ '^[a-f0-9]{64}$'),
  consumed_at timestamptz not null,
  provider_outcome_state text not null check (provider_outcome_state = 'ATTEMPT_ADMISSION_CONSUMED_PROVIDER_OUTCOME_UNKNOWN'),
  consumption_content_hash text not null check (consumption_content_hash ~ '^[a-f0-9]{64}$'),
  foreign key (reservation_id, execution_attempt_id)
    references public.build002_execution_attempt_reservations(reservation_id, execution_attempt_id) on delete restrict
);

create or replace function public.build002_d6_append_only_guard()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_token text;
begin
  select token::text into v_token from public.build002_d6_write_capability limit 1;
  if current_setting('build002.d6_write_capability', true) is distinct from v_token then
    raise exception 'D6_CANONICAL_ROWS_IMMUTABLE';
  end if;
  if tg_op <> 'INSERT' then raise exception 'D6_CANONICAL_ROWS_IMMUTABLE'; end if;
  return new;
end;
$$;

drop trigger if exists build002_execution_attempt_reservations_append_only on public.build002_execution_attempt_reservations;
create trigger build002_execution_attempt_reservations_append_only
before insert or update or delete on public.build002_execution_attempt_reservations
for each row execute function public.build002_d6_append_only_guard();

drop trigger if exists build002_execution_attempt_consumptions_append_only on public.build002_execution_attempt_consumptions;
create trigger build002_execution_attempt_consumptions_append_only
before insert or update or delete on public.build002_execution_attempt_consumptions
for each row execute function public.build002_d6_append_only_guard();

revoke all on table public.build002_execution_attempt_reservations from public, anon, authenticated, service_role;
revoke all on table public.build002_execution_attempt_consumptions from public, anon, authenticated, service_role;
grant select on table public.build002_execution_attempt_reservations to service_role;
grant select on table public.build002_execution_attempt_consumptions to service_role;
revoke all on function public.build002_d6_append_only_guard() from public, anon, authenticated, service_role;

create or replace function public.build002_validate_execution_attempt_reservation(p_reservation_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  r public.build002_execution_attempt_reservations%rowtype;
  v_operation_value_hash text;
  v_operation_binding_hash text;
  v_reservation_hash text;
begin
  select * into r from public.build002_execution_attempt_reservations where reservation_id = p_reservation_id for share;
  if not found then raise exception 'D6_RESERVATION_NOT_FOUND'; end if;
  if r.valid_until <= clock_timestamp() then raise exception 'D6_RESERVATION_EXPIRED'; end if;

  v_operation_value_hash := public.build002_canonical_sha256(r.operation_value);
  v_operation_binding_hash := public.build002_canonical_sha256(jsonb_build_object(
    'operation', r.operation,
    'operationValue', r.operation_value,
    'providerTargetPath', r.provider_target_path,
    'taskSpecHash', r.task_spec_hash));
  v_reservation_hash := public.build002_canonical_sha256(jsonb_build_object(
    'assetId', r.asset_id,
    'authorityCommitId', r.authority_commit_id,
    'consequenceBoundary', r.consequence_boundary,
    'd5TargetPath', r.d5_target_path,
    'delegabilityAdmissionId', r.delegability_admission_id,
    'executionAttemptId', r.execution_attempt_id,
    'executionAuthorityContentHash', r.execution_authority_content_hash,
    'executionAuthorityId', r.execution_authority_id,
    'membershipId', r.membership_id,
    'mutationLeaseContentHash', r.mutation_lease_content_hash,
    'mutationLeaseId', r.mutation_lease_id,
    'operation', r.operation,
    'operationBindingHash', r.operation_binding_hash,
    'operationValue', r.operation_value,
    'operationValueHash', r.operation_value_hash,
    'outcomeTransactionId', r.outcome_transaction_id,
    'ownerTenantId', r.owner_tenant_id,
    'principalId', r.principal_id,
    'providerTargetPath', r.provider_target_path,
    'schemaVersion', r.schema_version,
    'scope', r.scope,
    'sourceAssetVersionHash', r.source_asset_version_hash,
    'sourceAssetVersionId', r.source_asset_version_id,
    'taskSpecHash', r.task_spec_hash,
    'taskSpecId', r.task_spec_id,
    'taskSpecVersion', r.task_spec_version,
    'validUntil', to_char(r.valid_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
  if lower(v_operation_value_hash) is distinct from lower(r.operation_value_hash)
     or lower(v_operation_binding_hash) is distinct from lower(r.operation_binding_hash)
     or lower(v_reservation_hash) is distinct from lower(r.reservation_content_hash) then
    raise exception 'D6_RESERVATION_READBACK_FAILED';
  end if;
end;
$$;
revoke all on function public.build002_validate_execution_attempt_reservation(uuid) from public, anon, authenticated, service_role;

create or replace function public.build002_reserve_execution_attempt(
  p_principal_id uuid,
  p_membership_id uuid,
  p_mutation_lease_id uuid,
  p_provider_target_path text,
  p_operation text,
  p_operation_value jsonb
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_lease public.build002_mutation_leases%rowtype;
  v_spec jsonb;
  v_patch_count integer;
  v_bound_values integer;
  v_expected_values integer;
  v_existing public.build002_execution_attempt_reservations%rowtype;
  v_reservation_id uuid := gen_random_uuid();
  v_attempt_id uuid := gen_random_uuid();
  v_operation_value_hash text;
  v_operation_binding_hash text;
  v_reservation_hash text;
  v_lease_result jsonb;
  v_token text;
begin
  if p_principal_id is null or p_membership_id is null or p_mutation_lease_id is null then
    raise exception 'D6_RESERVATION_REQUIRED';
  end if;
  if p_provider_target_path is distinct from 'media.pixels'
     or p_operation is distinct from 'EDIT_REGION'
     or jsonb_typeof(p_operation_value) is distinct from 'object'
     or not exists (select 1 from jsonb_object_keys(p_operation_value)) then
    raise exception 'D6_OPERATION_BINDING_INVALID';
  end if;

  select * into v_lease from public.build002_mutation_leases where mutation_lease_id = p_mutation_lease_id for share;
  if not found then raise exception 'D6_MUTATION_LEASE_NOT_FOUND'; end if;
  if v_lease.principal_id is distinct from p_principal_id
     or v_lease.membership_id is distinct from p_membership_id then
    raise exception 'D6_MUTATION_LEASE_IDENTITY_MISMATCH';
  end if;

  -- Re-enter the sole public D5 issuer. For an existing immutable lease this
  -- performs the complete D5 consequence-time graph, TaskSpec, operation/value,
  -- freshness, and hash revalidation and must return the same exact lease.
  v_lease_result := public.build002_grant_mutation_lease(
    p_principal_id, p_membership_id, v_lease.execution_authority_id,
    v_lease.target_path, v_lease.category);
  if (v_lease_result->>'mutation_lease_id')::uuid is distinct from v_lease.mutation_lease_id
     or lower(v_lease_result->>'mutation_lease_content_hash') is distinct from lower(v_lease.mutation_lease_content_hash) then
    raise exception 'D6_MUTATION_LEASE_READBACK_FAILED';
  end if;

  select task_spec_snapshot into v_spec
    from public.field_outcomes
   where owner_tenant_id = v_lease.owner_tenant_id
     and transaction_id = v_lease.outcome_transaction_id
     and task_spec_id = v_lease.task_spec_id
     and task_spec_hash = v_lease.task_spec_hash
   for share;
  if not found or jsonb_typeof(v_spec) is distinct from 'object'
     or public.build002_canonical_sha256(v_spec - 'id' - 'hash' - 'createdAt') is distinct from lower(v_lease.task_spec_hash) then
    raise exception 'D6_TASK_SPEC_MISMATCH';
  end if;

  select count(*)::integer into v_patch_count
    from public.transaction_patches p
    join public.partial_intents i on i.id = p.partial_intent_id
   where p.transaction_id = v_lease.outcome_transaction_id
     and i.transaction_id = v_lease.outcome_transaction_id
     and p.target_path = p_provider_target_path
     and i.target_path = p_provider_target_path
     and p.operation = p_operation
     and i.operation = p_operation
     and p.parameters = p_operation_value
     and i.desired_value = p_operation_value;
  if v_patch_count <> 1 then raise exception 'D6_OPERATION_VALUE_MISMATCH'; end if;

  select count(*)::integer
    into v_expected_values
    from jsonb_object_keys(p_operation_value);
  select count(*)::integer into v_bound_values
    from jsonb_each(p_operation_value) supplied(key, value)
   where (select count(*)
            from jsonb_array_elements(coalesce(v_spec->'values', '[]'::jsonb)) item
           where item->>'id' = supplied.key
             and item->>'provenance' <> 'UNKNOWN'
             and item ? 'value'
             and item->'value' = supplied.value) = 1;
  if v_bound_values <> v_expected_values then raise exception 'D6_TASK_SPEC_OPERATION_VALUE_MISMATCH'; end if;

  select * into v_existing
    from public.build002_execution_attempt_reservations
   where mutation_lease_id = v_lease.mutation_lease_id
   for share;
  if found then
    perform public.build002_validate_execution_attempt_reservation(v_existing.reservation_id);
    if v_existing.provider_target_path is distinct from p_provider_target_path
       or v_existing.operation is distinct from p_operation
       or v_existing.operation_value is distinct from p_operation_value then
      raise exception 'D6_RESERVATION_BINDING_CONFLICT';
    end if;
    return jsonb_build_object(
      'reservation_id', v_existing.reservation_id,
      'execution_attempt_id', v_existing.execution_attempt_id,
      'reservation_content_hash', v_existing.reservation_content_hash);
  end if;

  v_operation_value_hash := public.build002_canonical_sha256(p_operation_value);
  v_operation_binding_hash := public.build002_canonical_sha256(jsonb_build_object(
    'operation', p_operation,
    'operationValue', p_operation_value,
    'providerTargetPath', p_provider_target_path,
    'taskSpecHash', v_lease.task_spec_hash));
  v_reservation_hash := public.build002_canonical_sha256(jsonb_build_object(
    'assetId', v_lease.asset_id,
    'authorityCommitId', v_lease.authority_commit_id,
    'consequenceBoundary', 'ATOMIC_CONSUMPTION_REQUIRED_IMMEDIATELY_BEFORE_PROVIDER',
    'd5TargetPath', v_lease.target_path,
    'delegabilityAdmissionId', v_lease.delegability_admission_id,
    'executionAttemptId', v_attempt_id,
    'executionAuthorityContentHash', v_lease.execution_authority_content_hash,
    'executionAuthorityId', v_lease.execution_authority_id,
    'membershipId', v_lease.membership_id,
    'mutationLeaseContentHash', v_lease.mutation_lease_content_hash,
    'mutationLeaseId', v_lease.mutation_lease_id,
    'operation', p_operation,
    'operationBindingHash', v_operation_binding_hash,
    'operationValue', p_operation_value,
    'operationValueHash', v_operation_value_hash,
    'outcomeTransactionId', v_lease.outcome_transaction_id,
    'ownerTenantId', v_lease.owner_tenant_id,
    'principalId', v_lease.principal_id,
    'providerTargetPath', p_provider_target_path,
    'schemaVersion', 'build002-execution-attempt-reservation-v0.1',
    'scope', 'FIELD_BETA_PROVIDER_ADMISSION_ONLY',
    'sourceAssetVersionHash', v_lease.source_asset_version_hash,
    'sourceAssetVersionId', v_lease.source_asset_version_id,
    'taskSpecHash', v_lease.task_spec_hash,
    'taskSpecId', v_lease.task_spec_id,
    'taskSpecVersion', v_lease.task_spec_version,
    'validUntil', to_char(v_lease.valid_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));

  select token::text into v_token from public.build002_d6_write_capability limit 1;
  perform set_config('build002.d6_write_capability', v_token, true);
  insert into public.build002_execution_attempt_reservations(
    reservation_id, schema_version, execution_attempt_id, owner_tenant_id, principal_id, membership_id,
    mutation_lease_id, mutation_lease_content_hash, authority_commit_id, delegability_admission_id,
    execution_authority_id, execution_authority_content_hash, outcome_transaction_id, asset_id,
    source_asset_version_id, source_asset_version_hash, task_spec_id, task_spec_version, task_spec_hash,
    d5_target_path, provider_target_path, operation, operation_value, operation_value_hash,
    operation_binding_hash, created_at, valid_until, scope, consequence_boundary, reservation_content_hash)
  values (
    v_reservation_id, 'build002-execution-attempt-reservation-v0.1', v_attempt_id, v_lease.owner_tenant_id,
    v_lease.principal_id, v_lease.membership_id, v_lease.mutation_lease_id, v_lease.mutation_lease_content_hash,
    v_lease.authority_commit_id, v_lease.delegability_admission_id, v_lease.execution_authority_id,
    v_lease.execution_authority_content_hash, v_lease.outcome_transaction_id, v_lease.asset_id,
    v_lease.source_asset_version_id, v_lease.source_asset_version_hash, v_lease.task_spec_id,
    v_lease.task_spec_version, v_lease.task_spec_hash, v_lease.target_path, p_provider_target_path,
    p_operation, p_operation_value, v_operation_value_hash, v_operation_binding_hash, v_now,
    v_lease.valid_until, 'FIELD_BETA_PROVIDER_ADMISSION_ONLY',
    'ATOMIC_CONSUMPTION_REQUIRED_IMMEDIATELY_BEFORE_PROVIDER', v_reservation_hash);
  return jsonb_build_object(
    'reservation_id', v_reservation_id,
    'execution_attempt_id', v_attempt_id,
    'reservation_content_hash', v_reservation_hash);
exception when unique_violation then
  select * into v_existing from public.build002_execution_attempt_reservations where mutation_lease_id = p_mutation_lease_id for share;
  if found then
    perform public.build002_validate_execution_attempt_reservation(v_existing.reservation_id);
    if v_existing.provider_target_path is not distinct from p_provider_target_path
       and v_existing.operation is not distinct from p_operation
       and v_existing.operation_value is not distinct from p_operation_value then
      return jsonb_build_object(
        'reservation_id', v_existing.reservation_id,
        'execution_attempt_id', v_existing.execution_attempt_id,
        'reservation_content_hash', v_existing.reservation_content_hash);
    end if;
  end if;
  raise exception 'D6_RESERVATION_BINDING_CONFLICT';
end;
$$;

create or replace function public.build002_consume_execution_attempt_reservation(
  p_principal_id uuid,
  p_membership_id uuid,
  p_reservation_id uuid,
  p_execution_attempt_id uuid
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := clock_timestamp();
  r public.build002_execution_attempt_reservations%rowtype;
  v_spec jsonb;
  v_patch_count integer;
  v_bound_values integer;
  v_expected_values integer;
  v_lease_result jsonb;
  v_consumption_id uuid := gen_random_uuid();
  v_consumption_hash text;
  v_token text;
begin
  if p_principal_id is null or p_membership_id is null or p_reservation_id is null or p_execution_attempt_id is null then
    raise exception 'D6_RESERVATION_REQUIRED';
  end if;
  select * into r from public.build002_execution_attempt_reservations where reservation_id = p_reservation_id for update;
  if not found then raise exception 'D6_RESERVATION_NOT_FOUND'; end if;
  if r.principal_id is distinct from p_principal_id or r.membership_id is distinct from p_membership_id then
    raise exception 'D6_RESERVATION_IDENTITY_MISMATCH';
  end if;
  if r.execution_attempt_id is distinct from p_execution_attempt_id then raise exception 'D6_EXECUTION_ATTEMPT_MISMATCH'; end if;
  if exists (select 1 from public.build002_execution_attempt_consumptions where reservation_id = r.reservation_id) then
    raise exception 'D6_RESERVATION_ALREADY_CONSUMED';
  end if;
  perform public.build002_validate_execution_attempt_reservation(r.reservation_id);

  v_lease_result := public.build002_grant_mutation_lease(
    p_principal_id, p_membership_id, r.execution_authority_id, r.d5_target_path, 'MUTABLE');
  if (v_lease_result->>'mutation_lease_id')::uuid is distinct from r.mutation_lease_id
     or lower(v_lease_result->>'mutation_lease_content_hash') is distinct from lower(r.mutation_lease_content_hash) then
    raise exception 'D6_MUTATION_LEASE_READBACK_FAILED';
  end if;

  select task_spec_snapshot into v_spec
    from public.field_outcomes
   where owner_tenant_id = r.owner_tenant_id
     and transaction_id = r.outcome_transaction_id
     and task_spec_id = r.task_spec_id
     and task_spec_hash = r.task_spec_hash
   for share;
  if not found or jsonb_typeof(v_spec) is distinct from 'object'
     or public.build002_canonical_sha256(v_spec - 'id' - 'hash' - 'createdAt') is distinct from lower(r.task_spec_hash) then
    raise exception 'D6_TASK_SPEC_MISMATCH';
  end if;

  select count(*)::integer into v_patch_count
    from public.transaction_patches p
    join public.partial_intents i on i.id = p.partial_intent_id
   where p.transaction_id = r.outcome_transaction_id
     and i.transaction_id = r.outcome_transaction_id
     and p.target_path = r.provider_target_path
     and i.target_path = r.provider_target_path
     and p.operation = r.operation
     and i.operation = r.operation
     and p.parameters = r.operation_value
     and i.desired_value = r.operation_value;
  if v_patch_count <> 1 then raise exception 'D6_OPERATION_VALUE_MISMATCH'; end if;

  select count(*)::integer
    into v_expected_values
    from jsonb_object_keys(r.operation_value);
  select count(*)::integer into v_bound_values
    from jsonb_each(r.operation_value) supplied(key, value)
   where (select count(*)
            from jsonb_array_elements(coalesce(v_spec->'values', '[]'::jsonb)) item
           where item->>'id' = supplied.key
             and item->>'provenance' <> 'UNKNOWN'
             and item ? 'value'
             and item->'value' = supplied.value) = 1;
  if v_bound_values <> v_expected_values then raise exception 'D6_TASK_SPEC_OPERATION_VALUE_MISMATCH'; end if;

  v_consumption_hash := public.build002_canonical_sha256(jsonb_build_object(
    'authorityCommitId', r.authority_commit_id,
    'executionAttemptId', r.execution_attempt_id,
    'executionAuthorityId', r.execution_authority_id,
    'mutationLeaseId', r.mutation_lease_id,
    'operationBindingHash', r.operation_binding_hash,
    'ownerTenantId', r.owner_tenant_id,
    'providerOutcomeState', 'ATTEMPT_ADMISSION_CONSUMED_PROVIDER_OUTCOME_UNKNOWN',
    'reservationContentHash', r.reservation_content_hash,
    'reservationId', r.reservation_id,
    'schemaVersion', 'build002-reservation-consumption-v0.1',
    'taskSpecHash', r.task_spec_hash));
  select token::text into v_token from public.build002_d6_write_capability limit 1;
  perform set_config('build002.d6_write_capability', v_token, true);
  insert into public.build002_execution_attempt_consumptions(
    consumption_id, schema_version, reservation_id, execution_attempt_id, owner_tenant_id,
    mutation_lease_id, execution_authority_id, authority_commit_id, task_spec_hash,
    operation_binding_hash, reservation_content_hash, consumed_at, provider_outcome_state,
    consumption_content_hash)
  values (
    v_consumption_id, 'build002-reservation-consumption-v0.1', r.reservation_id,
    r.execution_attempt_id, r.owner_tenant_id, r.mutation_lease_id, r.execution_authority_id,
    r.authority_commit_id, r.task_spec_hash, r.operation_binding_hash, r.reservation_content_hash,
    v_now, 'ATTEMPT_ADMISSION_CONSUMED_PROVIDER_OUTCOME_UNKNOWN', v_consumption_hash);
  return jsonb_build_object(
    'consumption_id', v_consumption_id,
    'reservation_id', r.reservation_id,
    'execution_attempt_id', r.execution_attempt_id,
    'consumption_content_hash', v_consumption_hash);
exception when unique_violation then
  raise exception 'D6_RESERVATION_ALREADY_CONSUMED';
end;
$$;

revoke all on function public.build002_reserve_execution_attempt(uuid,uuid,uuid,text,text,jsonb)
  from public, anon, authenticated;
revoke all on function public.build002_consume_execution_attempt_reservation(uuid,uuid,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.build002_reserve_execution_attempt(uuid,uuid,uuid,text,text,jsonb)
  to service_role;
grant execute on function public.build002_consume_execution_attempt_reservation(uuid,uuid,uuid,uuid)
  to service_role;

comment on table public.build002_execution_attempt_reservations is
  'BUILD002-C1-D6-R2 immutable server-owned exact provider-attempt reservations backed by current D5 leases.';
comment on table public.build002_execution_attempt_consumptions is
  'BUILD002-C1-D6-R2 append-only, atomic, single-use provider admission evidence.';
comment on function public.build002_reserve_execution_attempt(uuid,uuid,uuid,text,text,jsonb) is
  'BUILD002-C1-D6-R2 creates one server-owned exact attempt reservation after D5 and operation/value revalidation; no provider consequence.';
comment on function public.build002_consume_execution_attempt_reservation(uuid,uuid,uuid,uuid) is
  'BUILD002-C1-D6-R2 atomically revalidates and consumes one exact reservation immediately before provider admission.';
